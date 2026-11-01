-- ============================================================
-- MIGRACIÓN: FACTURAS DE COMPRA (Importador DIAN) - FERREHAYMAR
--
-- Aplicar DESPUÉS de 20261016152500_funciones_negocio.sql.
-- No edita el esquema inicial ni las funciones existentes.
--
-- Qué agrega:
--   facturas_compra         cabecera de cada factura importada
--   factura_compra_items    líneas (con y sin producto) y decisiones
--   importar_factura_compra RPC atómica e idempotente
--   buscar_factura_compra   consulta si una factura ya fue importada
--
-- Protección contra duplicados (en la base de datos):
--   * UNIQUE (proveedor_nit, numero) con valores normalizados.
--   * Bloqueo consultivo por factura: dos solicitudes simultáneas
--     de la misma factura se ejecutan una detrás de otra.
--   * La entrada de inventario usa la clave de idempotencia
--     'dian:<nit>:<numero>' (ya soportada por registrar_entrada).
--   Repetir la solicitud NO duplica entradas ni cambios de precio:
--   la función devuelve la factura ya registrada (duplicada = true).
--
-- Consistencia: todo ocurre en una sola transacción (una función
-- PL/pgSQL). Si algo falla no queda una importación a medias.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Normalización de la clave de la factura: solo letras y
-- números, en mayúsculas. "FE-001 " y "fe001" son la misma.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalizar_clave_factura(p_valor TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT upper(regexp_replace(coalesce(p_valor, ''), '[^A-Za-z0-9]', '', 'g'));
$$;


-- ------------------------------------------------------------
-- Cabecera de la factura importada
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facturas_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    proveedor_nit VARCHAR(40) NOT NULL,
    proveedor_nombre VARCHAR(200),

    numero VARCHAR(80) NOT NULL,
    numero_original VARCHAR(80) NOT NULL,

    fecha_emision DATE,
    tipo_documento VARCHAR(20) NOT NULL DEFAULT 'factura',

    ajuste_entrada_id UUID NOT NULL
        REFERENCES public.ajustes_entradas(id) ON DELETE RESTRICT,

    usuario_actor VARCHAR(100) NOT NULL,

    total_lineas INTEGER NOT NULL,
    lineas_importadas INTEGER NOT NULL,
    precios_actualizados INTEGER NOT NULL DEFAULT 0,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT facturas_compra_unica
        UNIQUE (proveedor_nit, numero),

    CONSTRAINT facturas_compra_clave_obligatoria
        CHECK (length(proveedor_nit) > 0 AND length(numero) > 0),

    CONSTRAINT facturas_compra_tipo_valido
        CHECK (tipo_documento = 'factura'),

    CONSTRAINT facturas_compra_lineas_validas
        CHECK (
            total_lineas > 0
            AND lineas_importadas > 0
            AND lineas_importadas <= total_lineas
            AND precios_actualizados >= 0
        )
);

CREATE INDEX IF NOT EXISTS facturas_compra_creado_idx
    ON public.facturas_compra (creado_en DESC);


-- ------------------------------------------------------------
-- Líneas de la factura
-- producto_id queda vacío en las líneas sin coincidencia: no se
-- crean productos ni se generan movimientos para ellas.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.factura_compra_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    factura_compra_id UUID NOT NULL
        REFERENCES public.facturas_compra(id) ON DELETE RESTRICT,

    linea INTEGER NOT NULL,

    producto_id UUID
        REFERENCES public.productos(id) ON DELETE RESTRICT,

    descripcion TEXT NOT NULL,
    codigo_proveedor VARCHAR(100),

    cantidad NUMERIC(12,3),
    unidad VARCHAR(30),

    precio_unitario_factura NUMERIC(14,2),
    precio_compra_anterior NUMERIC(12,2),
    diferencia NUMERIC(14,2),
    variacion_pct NUMERIC(10,2),

    estado_coincidencia VARCHAR(20) NOT NULL,
    estado_importacion VARCHAR(20) NOT NULL,
    decision_precio VARCHAR(20) NOT NULL,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT factura_items_linea_unica
        UNIQUE (factura_compra_id, linea),

    CONSTRAINT factura_items_estado_coincidencia_valido
        CHECK (estado_coincidencia IN (
            'coincidencia_alta', 'revision_manual', 'sin_coincidencia'
        )),

    CONSTRAINT factura_items_estado_importacion_valido
        CHECK (estado_importacion IN (
            'importada', 'excluida', 'sin_coincidencia'
        )),

    CONSTRAINT factura_items_decision_precio_valida
        CHECK (decision_precio IN (
            'actualizado', 'no_actualizado', 'no_aplica'
        )),

    CONSTRAINT factura_items_importada_con_producto
        CHECK (estado_importacion <> 'importada' OR producto_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS factura_items_factura_idx
    ON public.factura_compra_items (factura_compra_id);

CREATE INDEX IF NOT EXISTS factura_items_producto_idx
    ON public.factura_compra_items (producto_id)
    WHERE producto_id IS NOT NULL;


-- ------------------------------------------------------------
-- Inmutabilidad: el historial de facturas no se edita ni se
-- elimina (misma regla que movimientos e ítems de ventas).
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS facturas_compra_inmutables
    ON public.facturas_compra;

CREATE TRIGGER facturas_compra_inmutables
BEFORE UPDATE OR DELETE ON public.facturas_compra
FOR EACH ROW
EXECUTE FUNCTION public.impedir_modificacion_historica();

DROP TRIGGER IF EXISTS factura_items_inmutables
    ON public.factura_compra_items;

CREATE TRIGGER factura_items_inmutables
BEFORE UPDATE OR DELETE ON public.factura_compra_items
FOR EACH ROW
EXECUTE FUNCTION public.impedir_modificacion_historica();


-- ------------------------------------------------------------
-- BUSCAR FACTURA (para avisar antes de gastar una consulta a
-- Gemini). Devuelve {"existe": false} o los datos básicos.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.buscar_factura_compra(
    p_nit VARCHAR,
    p_numero VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_factura public.facturas_compra%ROWTYPE;
BEGIN
    SELECT *
    INTO v_factura
    FROM public.facturas_compra
    WHERE proveedor_nit = public.normalizar_clave_factura(p_nit)
      AND numero = public.normalizar_clave_factura(p_numero);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('existe', FALSE);
    END IF;

    RETURN jsonb_build_object(
        'existe', TRUE,
        'factura_id', v_factura.id,
        'numero', v_factura.numero_original,
        'proveedor_nombre', v_factura.proveedor_nombre,
        'importada_en', v_factura.creado_en
    );
END;
$$;


-- ------------------------------------------------------------
-- IMPORTAR FACTURA DE COMPRA
--
-- p_lineas: arreglo con una entrada por cada línea de la factura:
--   {
--     "linea": 1,
--     "producto_id": "uuid" | null,
--     "descripcion": "texto original",
--     "codigo_proveedor": "..." | null,
--     "cantidad": 10,
--     "unidad": "UND" | null,
--     "precio_unitario": 1000 | null,   -- precio de la factura
--     "estado_coincidencia": "coincidencia_alta" | "revision_manual" | "sin_coincidencia",
--     "importar": true | false,         -- genera entrada de inventario
--     "actualizar_precio": true | false,-- autorizado por el usuario
--     "precio_nuevo": 1000 | null
--   }
--
-- Las cantidades se registran en la unidad base del producto
-- (la entrada usa la unidad base si no se indica otra).
-- El precio anterior se lee de la base de datos, no del cliente.
--
-- Devuelve: { duplicada, factura_id, ajuste_entrada_id,
--             lineas_importadas, precios_actualizados }
-- Errores de validación usan el código FH002.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.importar_factura_compra(
    p_usuario VARCHAR,
    p_proveedor_nit VARCHAR,
    p_proveedor_nombre VARCHAR,
    p_numero VARCHAR,
    p_fecha_emision DATE,
    p_tipo_documento VARCHAR,
    p_lineas JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_nit TEXT;
    v_num TEXT;
    v_existente public.facturas_compra%ROWTYPE;
    v_elem JSONB;
    v_pos INTEGER := 0;
    v_ids UUID[] := ARRAY[]::UUID[];
    v_producto public.productos%ROWTYPE;
    v_importar BOOLEAN;
    v_actualizar BOOLEAN;
    v_producto_id UUID;
    v_cantidad NUMERIC;
    v_precio_factura NUMERIC;
    v_precio_nuevo NUMERIC;
    v_anterior NUMERIC;
    v_diferencia NUMERIC;
    v_variacion NUMERIC;
    v_estado_imp TEXT;
    v_decision TEXT;
    v_items JSONB := '[]'::JSONB;
    v_detalle JSONB := '[]'::JSONB;
    v_importadas INTEGER := 0;
    v_precios INTEGER := 0;
    v_entrada UUID;
    v_factura UUID;
    v_motivo TEXT;
    v_fila JSONB;
BEGIN
    IF p_usuario IS NULL OR length(trim(p_usuario)) = 0 THEN
        RAISE EXCEPTION 'Debe indicar quién realiza la importación.'
            USING ERRCODE = 'FH002';
    END IF;

    v_nit := public.normalizar_clave_factura(p_proveedor_nit);
    v_num := public.normalizar_clave_factura(p_numero);

    IF v_nit = '' OR v_num = '' THEN
        RAISE EXCEPTION 'Faltan el NIT del proveedor o el número de la factura.'
            USING ERRCODE = 'FH002';
    END IF;

    IF p_tipo_documento IS DISTINCT FROM 'factura' THEN
        RAISE EXCEPTION 'Solo se pueden importar facturas de compra.'
            USING ERRCODE = 'FH002';
    END IF;

    IF p_lineas IS NULL
       OR jsonb_typeof(p_lineas) <> 'array'
       OR jsonb_array_length(p_lineas) = 0 THEN
        RAISE EXCEPTION 'La factura no tiene líneas.'
            USING ERRCODE = 'FH002';
    END IF;

    -- Serializa las solicitudes de la misma factura.
    PERFORM pg_advisory_xact_lock(
        hashtextextended('factura_compra:' || v_nit || ':' || v_num, 0)
    );

    SELECT *
    INTO v_existente
    FROM public.facturas_compra
    WHERE proveedor_nit = v_nit
      AND numero = v_num;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'duplicada', TRUE,
            'factura_id', v_existente.id,
            'ajuste_entrada_id', v_existente.ajuste_entrada_id,
            'importada_en', v_existente.creado_en,
            'lineas_importadas', v_existente.lineas_importadas,
            'precios_actualizados', v_existente.precios_actualizados
        );
    END IF;

    -- Primera pasada: valida la estructura y reúne los productos.
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_lineas) LOOP
        v_pos := v_pos + 1;

        IF jsonb_typeof(v_elem) <> 'object' THEN
            RAISE EXCEPTION 'La línea % no es válida.', v_pos
                USING ERRCODE = 'FH002';
        END IF;

        IF coalesce(trim(v_elem->>'descripcion'), '') = '' THEN
            RAISE EXCEPTION 'La línea % no tiene descripción.', v_pos
                USING ERRCODE = 'FH002';
        END IF;

        IF coalesce((v_elem->>'importar')::BOOLEAN, FALSE) THEN
            IF (v_elem->>'producto_id') IS NULL THEN
                RAISE EXCEPTION 'La línea % se va a importar pero no tiene producto.', v_pos
                    USING ERRCODE = 'FH002';
            END IF;

            IF coalesce((v_elem->>'cantidad')::NUMERIC, 0) <= 0 THEN
                RAISE EXCEPTION 'La línea % no tiene una cantidad válida.', v_pos
                    USING ERRCODE = 'FH002';
            END IF;

            v_ids := v_ids || (v_elem->>'producto_id')::UUID;
        END IF;
    END LOOP;

    IF cardinality(v_ids) = 0 THEN
        RAISE EXCEPTION 'No hay ninguna línea para importar.'
            USING ERRCODE = 'FH002';
    END IF;

    -- Bloquea los productos en orden (evita interbloqueos).
    PERFORM 1
    FROM public.productos
    WHERE id = ANY (v_ids)
    ORDER BY id
    FOR UPDATE;

    -- Segunda pasada: resuelve cada línea.
    v_pos := 0;

    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_lineas) LOOP
        v_pos := v_pos + 1;

        v_importar := coalesce((v_elem->>'importar')::BOOLEAN, FALSE);
        v_actualizar := v_importar
            AND coalesce((v_elem->>'actualizar_precio')::BOOLEAN, FALSE);
        v_producto_id := (v_elem->>'producto_id')::UUID;
        v_cantidad := (v_elem->>'cantidad')::NUMERIC;
        v_precio_factura := (v_elem->>'precio_unitario')::NUMERIC;
        v_precio_nuevo := (v_elem->>'precio_nuevo')::NUMERIC;

        v_anterior := NULL;
        v_diferencia := NULL;
        v_variacion := NULL;
        v_decision := 'no_aplica';

        IF v_producto_id IS NOT NULL THEN
            SELECT *
            INTO v_producto
            FROM public.productos
            WHERE id = v_producto_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'El producto de la línea % no existe.', v_pos
                    USING ERRCODE = 'FH002';
            END IF;

            IF v_importar AND NOT v_producto.activo THEN
                RAISE EXCEPTION
                    'El producto "%" está inactivo y no puede recibir entradas.',
                    v_producto.nombre
                    USING ERRCODE = 'FH002';
            END IF;

            IF v_producto.precio_compra > 0 THEN
                v_anterior := v_producto.precio_compra;
            END IF;

            IF v_anterior IS NOT NULL AND v_precio_factura IS NOT NULL THEN
                v_diferencia := round(v_precio_factura - v_anterior, 2);
                v_variacion := round((v_diferencia / v_anterior) * 100, 2);
            END IF;
        END IF;

        IF v_importar THEN
            v_estado_imp := 'importada';
            v_importadas := v_importadas + 1;

            v_items := v_items || jsonb_build_object(
                'producto_id', v_producto_id,
                'cantidad', v_cantidad
            );

            IF v_precio_factura IS NOT NULL THEN
                v_decision := 'no_actualizado';
            END IF;

            IF v_actualizar THEN
                IF v_precio_nuevo IS NULL OR v_precio_nuevo <= 0 THEN
                    RAISE EXCEPTION
                        'La línea % autoriza un cambio de precio sin un precio nuevo válido.',
                        v_pos
                        USING ERRCODE = 'FH002';
                END IF;

                UPDATE public.productos
                SET precio_compra = round(v_precio_nuevo, 2),
                    actualizado_en = NOW()
                WHERE id = v_producto_id;

                v_decision := 'actualizado';
                v_precios := v_precios + 1;
            END IF;
        ELSIF v_producto_id IS NULL THEN
            v_estado_imp := 'sin_coincidencia';
        ELSE
            v_estado_imp := 'excluida';
        END IF;

        v_detalle := v_detalle || jsonb_build_object(
            'linea', coalesce((v_elem->>'linea')::INTEGER, v_pos),
            'producto_id', v_producto_id,
            'descripcion', trim(v_elem->>'descripcion'),
            'codigo_proveedor', nullif(trim(coalesce(v_elem->>'codigo_proveedor', '')), ''),
            'cantidad', v_cantidad,
            'unidad', nullif(trim(coalesce(v_elem->>'unidad', '')), ''),
            'precio_unitario', v_precio_factura,
            'anterior', v_anterior,
            'diferencia', v_diferencia,
            'variacion', v_variacion,
            'estado_coincidencia', coalesce(v_elem->>'estado_coincidencia', 'sin_coincidencia'),
            'estado_importacion', v_estado_imp,
            'decision_precio', v_decision
        );
    END LOOP;

    -- Entrada de inventario (reutiliza la función existente).
    v_motivo := left(
        'Factura de compra ' || trim(p_numero)
        || ' - ' || coalesce(nullif(trim(p_proveedor_nombre), ''), v_nit),
        200
    );

    v_entrada := public.registrar_entrada(
        v_motivo::VARCHAR,
        trim(p_usuario)::VARCHAR,
        v_items,
        NULL,
        ('Importada desde factura electrónica DIAN. NIT proveedor: ' || v_nit)::TEXT,
        left('dian:' || v_nit || ':' || v_num, 100)::VARCHAR
    );

    INSERT INTO public.facturas_compra (
        proveedor_nit, proveedor_nombre, numero, numero_original,
        fecha_emision, tipo_documento, ajuste_entrada_id, usuario_actor,
        total_lineas, lineas_importadas, precios_actualizados
    )
    VALUES (
        v_nit,
        nullif(left(trim(coalesce(p_proveedor_nombre, '')), 200), ''),
        v_num,
        left(trim(p_numero), 80),
        p_fecha_emision,
        'factura',
        v_entrada,
        trim(p_usuario),
        jsonb_array_length(p_lineas),
        v_importadas,
        v_precios
    )
    RETURNING id INTO v_factura;

    FOR v_fila IN SELECT * FROM jsonb_array_elements(v_detalle) LOOP
        INSERT INTO public.factura_compra_items (
            factura_compra_id, linea, producto_id, descripcion,
            codigo_proveedor, cantidad, unidad,
            precio_unitario_factura, precio_compra_anterior,
            diferencia, variacion_pct,
            estado_coincidencia, estado_importacion, decision_precio
        )
        VALUES (
            v_factura,
            (v_fila->>'linea')::INTEGER,
            (v_fila->>'producto_id')::UUID,
            v_fila->>'descripcion',
            v_fila->>'codigo_proveedor',
            (v_fila->>'cantidad')::NUMERIC,
            v_fila->>'unidad',
            (v_fila->>'precio_unitario')::NUMERIC,
            (v_fila->>'anterior')::NUMERIC,
            (v_fila->>'diferencia')::NUMERIC,
            (v_fila->>'variacion')::NUMERIC,
            v_fila->>'estado_coincidencia',
            v_fila->>'estado_importacion',
            v_fila->>'decision_precio'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'duplicada', FALSE,
        'factura_id', v_factura,
        'ajuste_entrada_id', v_entrada,
        'lineas_importadas', v_importadas,
        'precios_actualizados', v_precios
    );
END;
$$;


-- ------------------------------------------------------------
-- PERMISOS: solo el backend (service_role)
-- ------------------------------------------------------------
ALTER TABLE public.facturas_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factura_compra_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
    public.facturas_compra,
    public.factura_compra_items
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT ON TABLE
    public.facturas_compra,
    public.factura_compra_items
TO service_role;

REVOKE ALL ON FUNCTION public.normalizar_clave_factura(TEXT)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.buscar_factura_compra(VARCHAR, VARCHAR)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.importar_factura_compra(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, DATE, VARCHAR, JSONB
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.normalizar_clave_factura(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.buscar_factura_compra(VARCHAR, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.importar_factura_compra(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, DATE, VARCHAR, JSONB
) TO service_role;

COMMIT;
