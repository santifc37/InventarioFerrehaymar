-- ============================================================
-- MIGRACIÓN: FUNCIONES DE NEGOCIO (RPC) - FERREHAYMAR
--
-- Aplicar PRIMERO en desarrollo. No editar el esquema inicial.
--
-- Funciones que el backend (Render) llama con service_role:
--   registrar_entrada(...)  -> UUID
--   registrar_ajuste(...)   -> UUID
--   registrar_venta(...)    -> UUID
--   corregir_venta(...)     -> UUID (id de la venta nueva)
--   anular_venta(...)       -> ya existe en el esquema inicial
--
-- Reglas (según la guía de fases):
--  * La venta se registra DESPUÉS de ocurrir: fecha_venta la
--    elige el vendedor (no puede ser futura); fecha_registro
--    es la real.
--  * Stock insuficiente: NO se bloquea. Se lanza el error
--    FH001 con el detalle; el backend muestra la advertencia
--    y, si el usuario confirma, repite la llamada con
--    p_confirmar_stock_negativo = TRUE.
--  * Idempotencia: p_clave evita duplicar una operación si la
--    petición se reintenta (doble clic, reintento de red).
--  * Totales y precios se calculan en la base de datos.
--  * Cada función es una sola transacción: si algo falla,
--    no queda nada a medias.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Columnas de idempotencia
-- ------------------------------------------------------------
ALTER TABLE public.ventas
    ADD COLUMN IF NOT EXISTS clave_idempotencia VARCHAR(100);

ALTER TABLE public.ajustes_entradas
    ADD COLUMN IF NOT EXISTS clave_idempotencia VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS ventas_clave_idempotencia_unica
    ON public.ventas (clave_idempotencia)
    WHERE clave_idempotencia IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ajustes_clave_idempotencia_unica
    ON public.ajustes_entradas (clave_idempotencia)
    WHERE clave_idempotencia IS NOT NULL;


-- ------------------------------------------------------------
-- Fecha "de hoy" en la zona horaria del negocio.
-- (CURRENT_DATE en Supabase es UTC: después de las 7 pm en
-- Colombia ya sería "mañana".)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hoy_negocio()
RETURNS DATE
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT (NOW() AT TIME ZONE 'America/Bogota')::DATE;
$$;


-- ------------------------------------------------------------
-- Valida los ítems y revisa el stock.
-- p_modo: 'venta' (descuenta), 'ajuste' (suma o resta),
--         'entrada' (solo valida estructura).
-- Bloquea los productos en orden de id (evita interbloqueos y
-- ventas simultáneas que dejen el stock en negativo sin aviso).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_stock_items(
    p_items JSONB,
    p_modo TEXT,
    p_confirmar BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_elem JSONB;
    r RECORD;
    v_stock NUMERIC;
    v_delta NUMERIC;
    v_faltantes JSONB := '[]'::JSONB;
BEGIN
    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Debe indicar al menos un ítem.';
    END IF;

    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        IF (v_elem->>'producto_id') IS NULL
           OR (v_elem->>'cantidad') IS NULL THEN
            RAISE EXCEPTION 'Cada ítem requiere producto_id y cantidad.';
        END IF;
    END LOOP;

    IF p_modo NOT IN ('venta', 'ajuste') THEN
        RETURN;
    END IF;

    FOR r IN
        SELECT
            p.id AS producto_id,
            p.nombre,
            SUM(
                ROUND(
                    (i->>'cantidad')::NUMERIC
                    * public.obtener_factor_base(
                        p.id,
                        COALESCE((i->>'unidad_id')::UUID, p.unidad_base_id)
                    ),
                    3
                )
            ) AS cant_base
        FROM jsonb_array_elements(p_items) AS i
        JOIN public.productos p
            ON p.id = (i->>'producto_id')::UUID
        GROUP BY p.id, p.nombre
        ORDER BY p.id
    LOOP
        PERFORM 1
        FROM public.productos
        WHERE id = r.producto_id
        FOR UPDATE;

        SELECT COALESCE(SUM(cantidad_base), 0)
        INTO v_stock
        FROM public.movimientos_inventario
        WHERE producto_id = r.producto_id;

        v_delta := CASE WHEN p_modo = 'venta' THEN -r.cant_base ELSE r.cant_base END;

        IF v_stock + v_delta < 0 THEN
            v_faltantes := v_faltantes || jsonb_build_object(
                'producto_id', r.producto_id,
                'nombre', r.nombre,
                'stock_actual', v_stock,
                'cambio', v_delta,
                'stock_resultante', v_stock + v_delta
            );
        END IF;
    END LOOP;

    IF jsonb_array_length(v_faltantes) > 0 AND NOT COALESCE(p_confirmar, FALSE) THEN
        RAISE EXCEPTION 'STOCK_INSUFICIENTE'
            USING ERRCODE = 'FH001',
                  DETAIL = v_faltantes::TEXT,
                  HINT = 'Confirme y repita con p_confirmar_stock_negativo = TRUE.';
    END IF;
END;
$$;


-- ------------------------------------------------------------
-- REGISTRAR ENTRADA DE MERCANCÍA
-- p_items: [{"producto_id": "...", "cantidad": 10, "unidad_id": "..."?}]
-- unidad_id es opcional (si falta se usa la unidad base).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_entrada(
    p_motivo VARCHAR,
    p_usuario VARCHAR,
    p_items JSONB,
    p_fecha DATE DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL,
    p_clave VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_item JSONB;
    v_fecha DATE;
BEGIN
    IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
        RAISE EXCEPTION 'Debe indicar el motivo de la entrada.';
    END IF;
    IF p_usuario IS NULL OR length(trim(p_usuario)) = 0 THEN
        RAISE EXCEPTION 'Debe indicar quién realiza la operación.';
    END IF;

    IF p_clave IS NOT NULL THEN
        SELECT id INTO v_id FROM public.ajustes_entradas
        WHERE clave_idempotencia = p_clave;
        IF FOUND THEN
            RETURN v_id;
        END IF;
    END IF;

    v_fecha := COALESCE(p_fecha, public.hoy_negocio());
    IF v_fecha > public.hoy_negocio() THEN
        RAISE EXCEPTION 'La fecha no puede ser futura.';
    END IF;

    PERFORM public.validar_stock_items(p_items, 'entrada', TRUE);

    BEGIN
        INSERT INTO public.ajustes_entradas (
            tipo, fecha, observaciones, motivo, usuario_actor, clave_idempotencia
        )
        VALUES (
            'entrada', v_fecha, p_observaciones,
            trim(p_motivo), trim(p_usuario), p_clave
        )
        RETURNING id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_id FROM public.ajustes_entradas
        WHERE clave_idempotencia = p_clave;
        RETURN v_id;
    END;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO public.ajuste_entrada_items (
            ajuste_entrada_id, producto_id, cantidad, unidad_id
        )
        VALUES (
            v_id,
            (v_item->>'producto_id')::UUID,
            (v_item->>'cantidad')::NUMERIC,
            COALESCE(
                (v_item->>'unidad_id')::UUID,
                (SELECT unidad_base_id FROM public.productos
                 WHERE id = (v_item->>'producto_id')::UUID)
            )
        );
    END LOOP;

    RETURN v_id;
END;
$$;


-- ------------------------------------------------------------
-- REGISTRAR AJUSTE (cantidad positiva o negativa)
-- Si un ajuste deja el stock negativo, exige confirmación.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_ajuste(
    p_motivo VARCHAR,
    p_usuario VARCHAR,
    p_items JSONB,
    p_confirmar_stock_negativo BOOLEAN DEFAULT FALSE,
    p_fecha DATE DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL,
    p_clave VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_item JSONB;
    v_fecha DATE;
BEGIN
    IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
        RAISE EXCEPTION 'Debe indicar el motivo del ajuste.';
    END IF;
    IF p_usuario IS NULL OR length(trim(p_usuario)) = 0 THEN
        RAISE EXCEPTION 'Debe indicar quién realiza la operación.';
    END IF;

    IF p_clave IS NOT NULL THEN
        SELECT id INTO v_id FROM public.ajustes_entradas
        WHERE clave_idempotencia = p_clave;
        IF FOUND THEN
            RETURN v_id;
        END IF;
    END IF;

    v_fecha := COALESCE(p_fecha, public.hoy_negocio());
    IF v_fecha > public.hoy_negocio() THEN
        RAISE EXCEPTION 'La fecha no puede ser futura.';
    END IF;

    PERFORM public.validar_stock_items(p_items, 'ajuste', p_confirmar_stock_negativo);

    BEGIN
        INSERT INTO public.ajustes_entradas (
            tipo, fecha, observaciones, motivo, usuario_actor, clave_idempotencia
        )
        VALUES (
            'ajuste', v_fecha, p_observaciones,
            trim(p_motivo), trim(p_usuario), p_clave
        )
        RETURNING id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_id FROM public.ajustes_entradas
        WHERE clave_idempotencia = p_clave;
        RETURN v_id;
    END;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO public.ajuste_entrada_items (
            ajuste_entrada_id, producto_id, cantidad, unidad_id
        )
        VALUES (
            v_id,
            (v_item->>'producto_id')::UUID,
            (v_item->>'cantidad')::NUMERIC,
            COALESCE(
                (v_item->>'unidad_id')::UUID,
                (SELECT unidad_base_id FROM public.productos
                 WHERE id = (v_item->>'producto_id')::UUID)
            )
        );
    END LOOP;

    RETURN v_id;
END;
$$;


-- ------------------------------------------------------------
-- REGISTRAR VENTA
-- p_items: [{"producto_id": "...", "cantidad": 2,
--            "unidad_id": "..."?, "precio_unitario": 1000?}]
-- Si falta precio_unitario se usa el precio del catálogo
-- (convertido a la unidad vendida). El total se calcula aquí.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_venta(
    p_usuario VARCHAR,
    p_items JSONB,
    p_fecha_venta DATE DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL,
    p_confirmar_stock_negativo BOOLEAN DEFAULT FALSE,
    p_clave VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_item JSONB;
    v_fecha DATE;
BEGIN
    IF p_usuario IS NULL OR length(trim(p_usuario)) = 0 THEN
        RAISE EXCEPTION 'Debe indicar quién registra la venta.';
    END IF;

    IF p_clave IS NOT NULL THEN
        SELECT id INTO v_id FROM public.ventas
        WHERE clave_idempotencia = p_clave;
        IF FOUND THEN
            RETURN v_id;
        END IF;
    END IF;

    v_fecha := COALESCE(p_fecha_venta, public.hoy_negocio());
    IF v_fecha > public.hoy_negocio() THEN
        RAISE EXCEPTION 'La fecha de la venta no puede ser futura.';
    END IF;

    PERFORM public.validar_stock_items(p_items, 'venta', p_confirmar_stock_negativo);

    BEGIN
        INSERT INTO public.ventas (
            fecha_venta, observaciones, usuario_registro, clave_idempotencia
        )
        VALUES (v_fecha, p_observaciones, trim(p_usuario), p_clave)
        RETURNING id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_id FROM public.ventas
        WHERE clave_idempotencia = p_clave;
        RETURN v_id;
    END;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO public.venta_items (
            venta_id, producto_id, cantidad, unidad_id, precio_unitario
        )
        VALUES (
            v_id,
            (v_item->>'producto_id')::UUID,
            (v_item->>'cantidad')::NUMERIC,
            COALESCE(
                (v_item->>'unidad_id')::UUID,
                (SELECT unidad_base_id FROM public.productos
                 WHERE id = (v_item->>'producto_id')::UUID)
            ),
            (v_item->>'precio_unitario')::NUMERIC   -- NULL => precio del catálogo
        );
    END LOOP;

    RETURN v_id;
END;
$$;


-- ------------------------------------------------------------
-- CORREGIR VENTA
-- 1. Compensa los movimientos de la venta original.
-- 2. Registra la venta corregida (con su propia validación de
--    stock, ya contando lo restituido).
-- 3. Marca la original como 'corregida' y la enlaza con la nueva.
-- Todo en una transacción. Devuelve el id de la venta nueva.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.corregir_venta(
    p_venta_id UUID,
    p_motivo VARCHAR,
    p_usuario VARCHAR,
    p_items JSONB,
    p_fecha_venta DATE DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL,
    p_confirmar_stock_negativo BOOLEAN DEFAULT FALSE,
    p_clave VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_orig public.ventas%ROWTYPE;
    v_nuevo UUID;
    v_item RECORD;
BEGIN
    IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
        RAISE EXCEPTION 'Debe indicar el motivo de la corrección.';
    END IF;
    IF p_usuario IS NULL OR length(trim(p_usuario)) = 0 THEN
        RAISE EXCEPTION 'Debe indicar quién realiza la operación.';
    END IF;

    -- Reintento de una corrección ya hecha
    IF p_clave IS NOT NULL THEN
        SELECT id INTO v_nuevo FROM public.ventas
        WHERE clave_idempotencia = p_clave;
        IF FOUND THEN
            RETURN v_nuevo;
        END IF;
    END IF;

    SELECT * INTO v_orig
    FROM public.ventas
    WHERE id = p_venta_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La venta no existe.';
    END IF;
    IF v_orig.estado <> 'registrada' THEN
        RAISE EXCEPTION 'Solo se puede corregir una venta registrada.';
    END IF;

    FOR v_item IN
        SELECT * FROM public.venta_items WHERE venta_id = p_venta_id
    LOOP
        INSERT INTO public.movimientos_inventario (
            producto_id, tipo, cantidad_base, unidad_id, cantidad_original,
            referencia_tipo, referencia_id, motivo, usuario_actor,
            costo_unitario_base
        )
        VALUES (
            v_item.producto_id, 'correccion_venta', v_item.cantidad_base,
            v_item.unidad_id, v_item.cantidad,
            'correccion', p_venta_id, trim(p_motivo), trim(p_usuario),
            v_item.costo_unitario_base
        );
    END LOOP;

    v_nuevo := public.registrar_venta(
        p_usuario,
        p_items,
        COALESCE(p_fecha_venta, v_orig.fecha_venta),
        COALESCE(p_observaciones, v_orig.observaciones),
        p_confirmar_stock_negativo,
        p_clave
    );

    UPDATE public.ventas
    SET estado = 'corregida',
        motivo_correccion = trim(p_motivo),
        corregida_por_venta_id = v_nuevo
    WHERE id = p_venta_id;

    RETURN v_nuevo;
END;
$$;


-- ------------------------------------------------------------
-- PERMISOS: solo el backend (service_role)
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.hoy_negocio()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_stock_items(JSONB, TEXT, BOOLEAN)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.registrar_entrada(VARCHAR, VARCHAR, JSONB, DATE, TEXT, VARCHAR)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.registrar_ajuste(VARCHAR, VARCHAR, JSONB, BOOLEAN, DATE, TEXT, VARCHAR)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.registrar_venta(VARCHAR, JSONB, DATE, TEXT, BOOLEAN, VARCHAR)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.corregir_venta(UUID, VARCHAR, VARCHAR, JSONB, DATE, TEXT, BOOLEAN, VARCHAR)
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.hoy_negocio() TO service_role;
GRANT EXECUTE ON FUNCTION public.validar_stock_items(JSONB, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.registrar_entrada(VARCHAR, VARCHAR, JSONB, DATE, TEXT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.registrar_ajuste(VARCHAR, VARCHAR, JSONB, BOOLEAN, DATE, TEXT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.registrar_venta(VARCHAR, JSONB, DATE, TEXT, BOOLEAN, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.corregir_venta(UUID, VARCHAR, VARCHAR, JSONB, DATE, TEXT, BOOLEAN, VARCHAR) TO service_role;

COMMIT;
