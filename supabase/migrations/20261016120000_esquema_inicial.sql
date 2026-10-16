-- ============================================================
-- INVENTARIO FERREHAYMAR
-- PostgreSQL / Supabase
-- Esquema inicial con seguridad RLS
--
-- Arquitectura:
-- Navegador -> Render (backend) -> Supabase
--
-- El navegador NO accede directamente a las tablas.
-- Render conserva SUPABASE_SERVICE_ROLE_KEY en sus variables
-- de entorno. Nunca se expone esta clave al frontend.
--
-- IMPORTANTE:
-- - Stock calculado desde movimientos_inventario.
-- - Movimientos y detalles de venta inmutables.
-- - Entradas, ajustes y ventas generan movimientos automáticos.
-- - Cantidades con hasta 3 decimales.
-- - Precio y costo histórico guardados por ítem.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. CATEGORÍAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT categorias_nombre_no_vacio
        CHECK (length(trim(nombre)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS categorias_nombre_unico
    ON public.categorias (lower(trim(nombre)));


-- ============================================================
-- 2. UNIDADES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    fraccionable BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unidades_codigo_no_vacio
        CHECK (length(trim(codigo)) > 0),

    CONSTRAINT unidades_nombre_no_vacio
        CHECK (length(trim(nombre)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS unidades_codigo_unico
    ON public.unidades (lower(trim(codigo)));

INSERT INTO public.unidades (codigo, nombre, fraccionable)
VALUES
    ('u', 'Unidad', FALSE),
    ('m', 'Metro', TRUE),
    ('cm', 'Centímetro', TRUE),
    ('mm', 'Milímetro', TRUE),
    ('kg', 'Kilogramo', TRUE),
    ('g', 'Gramo', TRUE),
    ('lb', 'Libra', TRUE),
    ('l', 'Litro', TRUE),
    ('ml', 'Mililitro', TRUE),
    ('gal', 'Galón', TRUE),
    ('caja', 'Caja', TRUE),
    ('paquete', 'Paquete', TRUE),
    ('docena', 'Docena', TRUE),
    ('par', 'Par', TRUE)
ON CONFLICT DO NOTHING;


-- ============================================================
-- 3. PRODUCTOS
-- El stock NO se almacena aquí.
-- Se calcula desde movimientos_inventario.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL,
    codigo_barras VARCHAR(100),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,

    categoria_id UUID NOT NULL
        REFERENCES public.categorias(id) ON DELETE RESTRICT,

    unidad_base_id UUID NOT NULL
        REFERENCES public.unidades(id) ON DELETE RESTRICT,

    precio_compra NUMERIC(12,2) NOT NULL DEFAULT 0,
    precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_minimo NUMERIC(12,3) NOT NULL DEFAULT 0,

    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT productos_codigo_no_vacio
        CHECK (length(trim(codigo)) > 0),

    CONSTRAINT productos_nombre_no_vacio
        CHECK (length(trim(nombre)) > 0),

    CONSTRAINT productos_precio_compra_valido
        CHECK (precio_compra >= 0),

    CONSTRAINT productos_precio_venta_valido
        CHECK (precio_venta >= 0),

    CONSTRAINT productos_stock_minimo_valido
        CHECK (stock_minimo >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS productos_codigo_unico
    ON public.productos (lower(trim(codigo)));

CREATE UNIQUE INDEX IF NOT EXISTS productos_barras_unico
    ON public.productos (codigo_barras)
    WHERE codigo_barras IS NOT NULL
      AND length(trim(codigo_barras)) > 0;

CREATE INDEX IF NOT EXISTS productos_nombre_idx
    ON public.productos (lower(nombre));

CREATE INDEX IF NOT EXISTS productos_categoria_idx
    ON public.productos (categoria_id);

CREATE INDEX IF NOT EXISTS productos_activo_idx
    ON public.productos (activo);


-- ============================================================
-- 4. CONVERSIONES DE UNIDADES
--
-- factor_conversion:
-- cantidad en unidad origen * factor = cantidad en unidad destino.
--
-- Para registrar una venta o ajuste en una unidad diferente
-- de la base, debe existir una conversión hacia la unidad base.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conversiones_unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    producto_id UUID NOT NULL
        REFERENCES public.productos(id) ON DELETE RESTRICT,

    unidad_origen_id UUID NOT NULL
        REFERENCES public.unidades(id) ON DELETE RESTRICT,

    unidad_destino_id UUID NOT NULL
        REFERENCES public.unidades(id) ON DELETE RESTRICT,

    factor_conversion NUMERIC(14,6) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT conversion_factor_positivo
        CHECK (factor_conversion > 0),

    CONSTRAINT conversion_unidades_diferentes
        CHECK (unidad_origen_id <> unidad_destino_id),

    CONSTRAINT conversion_unica
        UNIQUE (producto_id, unidad_origen_id, unidad_destino_id)
);

CREATE INDEX IF NOT EXISTS conversiones_producto_idx
    ON public.conversiones_unidades (producto_id);


-- ============================================================
-- 5. VENTAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    fecha_venta DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    observaciones TEXT,

    estado VARCHAR(10) NOT NULL DEFAULT 'registrada',

    -- Si esta venta fue corregida, apunta a la venta nueva.
    corregida_por_venta_id UUID
        REFERENCES public.ventas(id) ON DELETE RESTRICT,

    usuario_registro VARCHAR(100),
    motivo_correccion VARCHAR(200),

    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ventas_estado_valido
        CHECK (estado IN ('registrada', 'corregida', 'anulada')),

    CONSTRAINT ventas_total_no_negativo
        CHECK (total >= 0),

    CONSTRAINT ventas_motivo_correccion_requerido
        CHECK (
            estado <> 'corregida'
            OR (
                motivo_correccion IS NOT NULL
                AND length(trim(motivo_correccion)) > 0
            )
        )
);

CREATE INDEX IF NOT EXISTS ventas_fecha_idx
    ON public.ventas (fecha_venta DESC);

CREATE INDEX IF NOT EXISTS ventas_fecha_registro_idx
    ON public.ventas (fecha_registro DESC);

CREATE INDEX IF NOT EXISTS ventas_estado_idx
    ON public.ventas (estado);


-- ============================================================
-- 6. DETALLES DE VENTAS
-- precio_unitario: precio en la unidad en que se vendió.
-- costo_unitario_base: costo histórico de una unidad base.
-- factor_conversion: unidad vendida -> unidad base.
-- cantidad_base: cantidad convertida a unidad base.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.venta_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    venta_id UUID NOT NULL
        REFERENCES public.ventas(id) ON DELETE RESTRICT,

    producto_id UUID NOT NULL
        REFERENCES public.productos(id) ON DELETE RESTRICT,

    cantidad NUMERIC(12,3) NOT NULL,

    unidad_id UUID NOT NULL
        REFERENCES public.unidades(id) ON DELETE RESTRICT,

    factor_conversion NUMERIC(14,6) NOT NULL DEFAULT 1,
    cantidad_base NUMERIC(12,3) NOT NULL DEFAULT 0,

    precio_unitario NUMERIC(12,2) NOT NULL,
    costo_unitario_base NUMERIC(12,2) NOT NULL DEFAULT 0,

    subtotal NUMERIC(12,2)
        GENERATED ALWAYS AS (
            ROUND(cantidad * precio_unitario, 2)
        ) STORED,

    utilidad_estimada NUMERIC(12,2)
        GENERATED ALWAYS AS (
            ROUND(
                (cantidad * precio_unitario)
                - (cantidad * factor_conversion * costo_unitario_base),
                2
            )
        ) STORED,

    nombre_producto_snapshot VARCHAR(200) NOT NULL DEFAULT '',
    codigo_producto_snapshot VARCHAR(50) NOT NULL DEFAULT '',

    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT venta_items_cantidad_positiva
        CHECK (cantidad > 0),

    CONSTRAINT venta_items_factor_positivo
        CHECK (factor_conversion > 0),

    CONSTRAINT venta_items_cantidad_base_positiva
        CHECK (cantidad_base > 0),

    CONSTRAINT venta_items_precio_valido
        CHECK (precio_unitario >= 0),

    CONSTRAINT venta_items_costo_valido
        CHECK (costo_unitario_base >= 0)
);

CREATE INDEX IF NOT EXISTS venta_items_venta_idx
    ON public.venta_items (venta_id);

CREATE INDEX IF NOT EXISTS venta_items_producto_idx
    ON public.venta_items (producto_id);


-- ============================================================
-- 7. CABECERAS DE ENTRADAS Y AJUSTES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ajustes_entradas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tipo VARCHAR(10) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    observaciones TEXT,

    motivo VARCHAR(200) NOT NULL,
    usuario_actor VARCHAR(100) NOT NULL,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ajustes_tipo_valido
        CHECK (tipo IN ('entrada', 'ajuste')),

    CONSTRAINT ajustes_motivo_obligatorio
        CHECK (length(trim(motivo)) > 0),

    CONSTRAINT ajustes_actor_obligatorio
        CHECK (length(trim(usuario_actor)) > 0)
);

CREATE INDEX IF NOT EXISTS ajustes_entradas_fecha_idx
    ON public.ajustes_entradas (fecha DESC);


-- ============================================================
-- 8. DETALLES DE ENTRADAS Y AJUSTES
--
-- cantidad es positiva para entradas.
-- En ajustes, cantidad puede ser positiva o negativa.
-- cantidad_base se calcula en el trigger según la conversión.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ajuste_entrada_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ajuste_entrada_id UUID NOT NULL
        REFERENCES public.ajustes_entradas(id) ON DELETE RESTRICT,

    producto_id UUID NOT NULL
        REFERENCES public.productos(id) ON DELETE RESTRICT,

    cantidad NUMERIC(12,3) NOT NULL,

    unidad_id UUID NOT NULL
        REFERENCES public.unidades(id) ON DELETE RESTRICT,

    factor_conversion NUMERIC(14,6) NOT NULL DEFAULT 1,
    cantidad_base NUMERIC(12,3) NOT NULL DEFAULT 0,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ajuste_items_cantidad_no_cero
        CHECK (cantidad <> 0),

    CONSTRAINT ajuste_items_factor_positivo
        CHECK (factor_conversion > 0),

    CONSTRAINT ajuste_items_base_no_cero
        CHECK (cantidad_base <> 0)
);

CREATE INDEX IF NOT EXISTS ajuste_items_cabecera_idx
    ON public.ajuste_entrada_items (ajuste_entrada_id);

CREATE INDEX IF NOT EXISTS ajuste_items_producto_idx
    ON public.ajuste_entrada_items (producto_id);


-- ============================================================
-- 9. MOVIMIENTOS DE INVENTARIO
--
-- cantidad_base positiva = entrada al stock.
-- cantidad_base negativa = salida del stock.
--
-- referencia_id es polimórfico: puede referenciar una venta,
-- una cabecera de ajuste/entrada u otra operación.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    producto_id UUID NOT NULL
        REFERENCES public.productos(id) ON DELETE RESTRICT,

    tipo VARCHAR(20) NOT NULL,

    cantidad_base NUMERIC(12,3) NOT NULL,

    unidad_id UUID NOT NULL
        REFERENCES public.unidades(id) ON DELETE RESTRICT,

    cantidad_original NUMERIC(12,3) NOT NULL,

    referencia_tipo VARCHAR(20),
    referencia_id UUID,

    motivo VARCHAR(200),
    usuario_actor VARCHAR(100),

    costo_unitario_base NUMERIC(12,2),

    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash_trazabilidad VARCHAR(64),

    CONSTRAINT movimientos_tipo_valido
        CHECK (
            tipo IN (
                'entrada',
                'salida',
                'ajuste',
                'venta',
                'correccion_venta'
            )
        ),

    CONSTRAINT movimientos_cantidad_base_no_cero
        CHECK (cantidad_base <> 0),

    CONSTRAINT movimientos_cantidad_original_no_cero
        CHECK (cantidad_original <> 0),

    CONSTRAINT movimientos_referencia_tipo_valido
        CHECK (
            referencia_tipo IS NULL
            OR referencia_tipo IN (
                'venta',
                'ajuste_entrada',
                'correccion',
                'import'
            )
        ),

    CONSTRAINT movimientos_costo_valido
        CHECK (
            costo_unitario_base IS NULL
            OR costo_unitario_base >= 0
        ),

    CONSTRAINT movimientos_motivo_justificado
        CHECK (
            tipo IN ('venta', 'correccion_venta')
            OR (
                motivo IS NOT NULL
                AND length(trim(motivo)) > 0
            )
        )
);

CREATE INDEX IF NOT EXISTS movimientos_producto_fecha_idx
    ON public.movimientos_inventario (producto_id, fecha DESC);

CREATE INDEX IF NOT EXISTS movimientos_referencia_idx
    ON public.movimientos_inventario (referencia_tipo, referencia_id);

CREATE INDEX IF NOT EXISTS movimientos_tipo_fecha_idx
    ON public.movimientos_inventario (tipo, fecha DESC);


-- ============================================================
-- FUNCIONES AUXILIARES
-- ============================================================

CREATE OR REPLACE FUNCTION public.actualizar_fecha_modificacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.actualizado_en := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS productos_actualizado_en
    ON public.productos;

CREATE TRIGGER productos_actualizado_en
BEFORE UPDATE ON public.productos
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_fecha_modificacion();

DROP TRIGGER IF EXISTS ventas_actualizado_en
    ON public.ventas;

CREATE TRIGGER ventas_actualizado_en
BEFORE UPDATE ON public.ventas
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_fecha_modificacion();


-- ============================================================
-- VALIDAR CONVERSIÓN A UNIDAD BASE
-- ============================================================

CREATE OR REPLACE FUNCTION public.obtener_factor_base(
    p_producto_id UUID,
    p_unidad_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_unidad_base UUID;
    v_factor NUMERIC(14,6);
BEGIN
    SELECT unidad_base_id
    INTO v_unidad_base
    FROM public.productos
    WHERE id = p_producto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto no existe.';
    END IF;

    IF p_unidad_id = v_unidad_base THEN
        RETURN 1;
    END IF;

    SELECT factor_conversion
    INTO v_factor
    FROM public.conversiones_unidades
    WHERE producto_id = p_producto_id
      AND unidad_origen_id = p_unidad_id
      AND unidad_destino_id = v_unidad_base
      AND activo = TRUE;

    IF v_factor IS NULL THEN
        RAISE EXCEPTION
            'No existe una conversión activa desde la unidad indicada a la unidad base del producto.';
    END IF;

    RETURN v_factor;
END;
$$;


-- ============================================================
-- PREPARAR ÍTEM DE VENTA
-- El backend debe crear la cabecera de venta y sus ítems
-- dentro de una misma transacción.
-- ============================================================

CREATE OR REPLACE FUNCTION public.preparar_venta_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_producto public.productos%ROWTYPE;
    v_estado VARCHAR(10);
BEGIN
    SELECT estado
    INTO v_estado
    FROM public.ventas
    WHERE id = NEW.venta_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La venta no existe.';
    END IF;

    IF v_estado <> 'registrada' THEN
        RAISE EXCEPTION 'No se pueden agregar ítems a una venta no registrada.';
    END IF;

    SELECT *
    INTO v_producto
    FROM public.productos
    WHERE id = NEW.producto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El producto no existe.';
    END IF;

    IF NOT v_producto.activo THEN
        RAISE EXCEPTION 'No se puede vender un producto inactivo.';
    END IF;

    IF NEW.cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad vendida debe ser positiva.';
    END IF;

    NEW.factor_conversion :=
        public.obtener_factor_base(NEW.producto_id, NEW.unidad_id);

    NEW.cantidad_base :=
        ROUND(NEW.cantidad * NEW.factor_conversion, 3);

    IF NEW.cantidad_base <= 0 THEN
        RAISE EXCEPTION 'La cantidad convertida debe ser positiva.';
    END IF;

    -- Conserva el precio recibido del backend si fue editado.
    -- Si el backend no lo envía, utiliza el precio de referencia.
    IF NEW.precio_unitario IS NULL THEN
        NEW.precio_unitario :=
            ROUND(v_producto.precio_venta * NEW.factor_conversion, 2);
    END IF;

    NEW.costo_unitario_base := v_producto.precio_compra;
    NEW.nombre_producto_snapshot := v_producto.nombre;
    NEW.codigo_producto_snapshot := v_producto.codigo;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venta_items_preparar
    ON public.venta_items;

CREATE TRIGGER venta_items_preparar
BEFORE INSERT ON public.venta_items
FOR EACH ROW
EXECUTE FUNCTION public.preparar_venta_item();


-- ============================================================
-- TOTAL DE VENTA
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalcular_total_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    UPDATE public.ventas
    SET total = COALESCE(
        (
            SELECT SUM(subtotal)
            FROM public.venta_items
            WHERE venta_id = NEW.venta_id
        ),
        0
    )
    WHERE id = NEW.venta_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venta_items_recalcular_total
    ON public.venta_items;

CREATE TRIGGER venta_items_recalcular_total
AFTER INSERT ON public.venta_items
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_total_venta();


-- ============================================================
-- GENERAR MOVIMIENTO POR CADA ÍTEM VENDIDO
-- ============================================================

CREATE OR REPLACE FUNCTION public.generar_movimiento_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_actor VARCHAR(100);
BEGIN
    SELECT usuario_registro
    INTO v_actor
    FROM public.ventas
    WHERE id = NEW.venta_id;

    INSERT INTO public.movimientos_inventario (
        producto_id,
        tipo,
        cantidad_base,
        unidad_id,
        cantidad_original,
        referencia_tipo,
        referencia_id,
        motivo,
        usuario_actor,
        costo_unitario_base
    )
    VALUES (
        NEW.producto_id,
        'venta',
        -NEW.cantidad_base,
        NEW.unidad_id,
        NEW.cantidad,
        'venta',
        NEW.venta_id,
        'Salida por venta',
        COALESCE(v_actor, 'vendedor'),
        NEW.costo_unitario_base
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venta_items_generar_movimiento
    ON public.venta_items;

CREATE TRIGGER venta_items_generar_movimiento
AFTER INSERT ON public.venta_items
FOR EACH ROW
EXECUTE FUNCTION public.generar_movimiento_venta();


-- ============================================================
-- PREPARAR ÍTEM DE ENTRADA / AJUSTE
-- Para entrada: cantidad positiva.
-- Para ajuste: cantidad positiva o negativa.
-- ============================================================

CREATE OR REPLACE FUNCTION public.preparar_ajuste_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_tipo VARCHAR(10);
BEGIN
    SELECT tipo
    INTO v_tipo
    FROM public.ajustes_entradas
    WHERE id = NEW.ajuste_entrada_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cabecera de entrada/ajuste no existe.';
    END IF;

    IF v_tipo = 'entrada' AND NEW.cantidad <= 0 THEN
        RAISE EXCEPTION 'Una entrada debe tener cantidad positiva.';
    END IF;

    IF v_tipo = 'ajuste' AND NEW.cantidad = 0 THEN
        RAISE EXCEPTION 'Un ajuste no puede tener cantidad cero.';
    END IF;

    NEW.factor_conversion :=
        public.obtener_factor_base(NEW.producto_id, NEW.unidad_id);

    NEW.cantidad_base :=
        ROUND(NEW.cantidad * NEW.factor_conversion, 3);

    IF NEW.cantidad_base = 0 THEN
        RAISE EXCEPTION 'La cantidad convertida no puede ser cero.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ajuste_items_preparar
    ON public.ajuste_entrada_items;

CREATE TRIGGER ajuste_items_preparar
BEFORE INSERT ON public.ajuste_entrada_items
FOR EACH ROW
EXECUTE FUNCTION public.preparar_ajuste_item();


-- ============================================================
-- GENERAR MOVIMIENTO POR CADA ÍTEM DE ENTRADA / AJUSTE
-- ============================================================

CREATE OR REPLACE FUNCTION public.generar_movimiento_ajuste()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_cabecera public.ajustes_entradas%ROWTYPE;
    v_tipo_movimiento VARCHAR(20);
BEGIN
    SELECT *
    INTO v_cabecera
    FROM public.ajustes_entradas
    WHERE id = NEW.ajuste_entrada_id;

    IF v_cabecera.tipo = 'entrada' THEN
        v_tipo_movimiento := 'entrada';
    ELSE
        v_tipo_movimiento := 'ajuste';
    END IF;

    INSERT INTO public.movimientos_inventario (
        producto_id,
        tipo,
        cantidad_base,
        unidad_id,
        cantidad_original,
        referencia_tipo,
        referencia_id,
        motivo,
        usuario_actor
    )
    VALUES (
        NEW.producto_id,
        v_tipo_movimiento,
        NEW.cantidad_base,
        NEW.unidad_id,
        NEW.cantidad,
        'ajuste_entrada',
        NEW.ajuste_entrada_id,
        v_cabecera.motivo,
        v_cabecera.usuario_actor
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ajuste_items_generar_movimiento
    ON public.ajuste_entrada_items;

CREATE TRIGGER ajuste_items_generar_movimiento
AFTER INSERT ON public.ajuste_entrada_items
FOR EACH ROW
EXECUTE FUNCTION public.generar_movimiento_ajuste();


-- ============================================================
-- INMUTABILIDAD
-- Los movimientos no se editan ni eliminan.
-- Los ítems de venta tampoco se editan ni eliminan.
-- ============================================================

CREATE OR REPLACE FUNCTION public.impedir_modificacion_historica()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION
        'Este registro es histórico e inmutable. Registre una operación compensatoria.';
END;
$$;

DROP TRIGGER IF EXISTS movimientos_inmutables
    ON public.movimientos_inventario;

CREATE TRIGGER movimientos_inmutables
BEFORE UPDATE OR DELETE ON public.movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION public.impedir_modificacion_historica();

DROP TRIGGER IF EXISTS venta_items_inmutables
    ON public.venta_items;

CREATE TRIGGER venta_items_inmutables
BEFORE UPDATE OR DELETE ON public.venta_items
FOR EACH ROW
EXECUTE FUNCTION public.impedir_modificacion_historica();

DROP TRIGGER IF EXISTS ajuste_items_inmutables
    ON public.ajuste_entrada_items;

CREATE TRIGGER ajuste_items_inmutables
BEFORE UPDATE OR DELETE ON public.ajuste_entrada_items
FOR EACH ROW
EXECUTE FUNCTION public.impedir_modificacion_historica();


-- ============================================================
-- IMPEDIR ELIMINACIÓN DE VENTAS Y CABECERAS DE AJUSTE
-- ============================================================

DROP TRIGGER IF EXISTS ventas_no_eliminar
    ON public.ventas;

CREATE TRIGGER ventas_no_eliminar
BEFORE DELETE ON public.ventas
FOR EACH ROW
EXECUTE FUNCTION public.impedir_modificacion_historica();

DROP TRIGGER IF EXISTS ajustes_no_eliminar
    ON public.ajustes_entradas;

CREATE TRIGGER ajustes_no_eliminar
BEFORE DELETE ON public.ajustes_entradas
FOR EACH ROW
EXECUTE FUNCTION public.impedir_modificacion_historica();


-- ============================================================
-- CANCELAR UNA VENTA
--
-- Esta función:
-- 1. Comprueba que exista y siga registrada.
-- 2. Registra el motivo.
-- 3. Crea movimientos compensatorios positivos.
-- 4. Marca la venta como anulada.
--
-- Debe llamarse desde el backend autorizado.
-- ============================================================

CREATE OR REPLACE FUNCTION public.anular_venta(
    p_venta_id UUID,
    p_motivo VARCHAR(200),
    p_usuario_actor VARCHAR(100)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_venta public.ventas%ROWTYPE;
    v_item RECORD;
BEGIN
    IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
        RAISE EXCEPTION 'Debe indicar el motivo de la anulación.';
    END IF;

    IF p_usuario_actor IS NULL
       OR length(trim(p_usuario_actor)) = 0 THEN
        RAISE EXCEPTION 'Debe indicar quién realiza la operación.';
    END IF;

    SELECT *
    INTO v_venta
    FROM public.ventas
    WHERE id = p_venta_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La venta no existe.';
    END IF;

    IF v_venta.estado <> 'registrada' THEN
        RAISE EXCEPTION 'Solo se puede anular una venta registrada.';
    END IF;

    FOR v_item IN
        SELECT *
        FROM public.venta_items
        WHERE venta_id = p_venta_id
    LOOP
        INSERT INTO public.movimientos_inventario (
            producto_id,
            tipo,
            cantidad_base,
            unidad_id,
            cantidad_original,
            referencia_tipo,
            referencia_id,
            motivo,
            usuario_actor,
            costo_unitario_base
        )
        VALUES (
            v_item.producto_id,
            'correccion_venta',
            v_item.cantidad_base,
            v_item.unidad_id,
            v_item.cantidad,
            'correccion',
            p_venta_id,
            trim(p_motivo),
            trim(p_usuario_actor),
            v_item.costo_unitario_base
        );
    END LOOP;

    UPDATE public.ventas
    SET estado = 'anulada',
        motivo_correccion = trim(p_motivo),
        actualizado_en = NOW()
    WHERE id = p_venta_id;
END;
$$;


-- ============================================================
-- VISTA DE STOCK ACTUAL
-- El stock se calcula SIEMPRE a partir de movimientos.
-- Los productos sin movimientos aparecen con stock cero.
-- ============================================================

CREATE OR REPLACE VIEW public.v_stock_actual
WITH (security_invoker = true)
AS
SELECT
    p.id AS producto_id,
    p.codigo,
    p.codigo_barras,
    p.nombre,
    p.descripcion,
    p.categoria_id,
    c.nombre AS categoria_nombre,
    p.unidad_base_id,
    u.codigo AS unidad_base_codigo,
    u.nombre AS unidad_base_nombre,
    p.precio_compra,
    p.precio_venta,
    p.stock_minimo,

    COALESCE(SUM(m.cantidad_base), 0)::NUMERIC(12,3)
        AS stock_actual,

    (
        COALESCE(SUM(m.cantidad_base), 0) <= 0
    ) AS agotado,

    (
        COALESCE(SUM(m.cantidad_base), 0) > 0
        AND COALESCE(SUM(m.cantidad_base), 0) <= p.stock_minimo
    ) AS stock_bajo,

    p.activo,
    p.creado_en,
    p.actualizado_en

FROM public.productos p

LEFT JOIN public.categorias c
    ON c.id = p.categoria_id

JOIN public.unidades u
    ON u.id = p.unidad_base_id

LEFT JOIN public.movimientos_inventario m
    ON m.producto_id = p.id

GROUP BY
    p.id,
    p.codigo,
    p.codigo_barras,
    p.nombre,
    p.descripcion,
    p.categoria_id,
    c.nombre,
    p.unidad_base_id,
    u.codigo,
    u.nombre,
    p.precio_compra,
    p.precio_venta,
    p.stock_minimo,
    p.activo,
    p.creado_en,
    p.actualizado_en;


-- ============================================================
-- VISTA DE VENTAS DIARIAS
-- ============================================================

CREATE OR REPLACE VIEW public.v_ventas_diarias
WITH (security_invoker = true)
AS
SELECT
    v.fecha_venta,
    COUNT(*) AS cantidad_ventas,
    COALESCE(SUM(v.total), 0)::NUMERIC(12,2) AS total_vendido

FROM public.ventas v

WHERE v.estado = 'registrada'

GROUP BY v.fecha_venta;


-- ============================================================
-- VISTA DE PRODUCTOS MÁS VENDIDOS
-- ============================================================

CREATE OR REPLACE VIEW public.v_productos_mas_vendidos
WITH (security_invoker = true)
AS
SELECT
    vi.producto_id,
    vi.nombre_producto_snapshot AS nombre,
    vi.codigo_producto_snapshot AS codigo,

    SUM(vi.cantidad_base)::NUMERIC(12,3)
        AS cantidad_vendida_base,

    SUM(vi.subtotal)::NUMERIC(12,2)
        AS total_vendido,

    SUM(vi.utilidad_estimada)::NUMERIC(12,2)
        AS utilidad_estimada

FROM public.venta_items vi

JOIN public.ventas v
    ON v.id = vi.venta_id

WHERE v.estado = 'registrada'

GROUP BY
    vi.producto_id,
    vi.nombre_producto_snapshot,
    vi.codigo_producto_snapshot;


-- ============================================================
-- RLS: BLOQUEAR ACCESO DIRECTO DESDE EL NAVEGADOR
--
-- La contraseña compartida se valida en Render.
-- Supabase no recibe esa contraseña como sustituto de RLS.
--
-- No se crean políticas para anon/authenticated.
-- El backend usa service_role solo en el servidor.
-- ============================================================

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversiones_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajustes_entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajuste_entrada_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- Retirar privilegios directos a los roles del navegador.

REVOKE ALL ON TABLE
    public.categorias,
    public.unidades,
    public.productos,
    public.conversiones_unidades,
    public.ventas,
    public.venta_items,
    public.ajustes_entradas,
    public.ajuste_entrada_items,
    public.movimientos_inventario
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE
    public.v_stock_actual,
    public.v_ventas_diarias,
    public.v_productos_mas_vendidos
FROM PUBLIC, anon, authenticated;

-- Permisos para el backend.
-- IMPORTANTE: service_role debe mantenerse exclusivamente en Render.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.categorias,
    public.unidades,
    public.productos,
    public.conversiones_unidades,
    public.ventas,
    public.venta_items,
    public.ajustes_entradas,
    public.ajuste_entrada_items,
    public.movimientos_inventario
TO service_role;

GRANT SELECT ON TABLE
    public.v_stock_actual,
    public.v_ventas_diarias,
    public.v_productos_mas_vendidos
TO service_role;

-- Las funciones de negocio no deben ejecutarse desde el navegador.

REVOKE ALL ON FUNCTION public.actualizar_fecha_modificacion()
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.obtener_factor_base(UUID, UUID)
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.preparar_venta_item()
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.recalcular_total_venta()
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.generar_movimiento_venta()
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.preparar_ajuste_item()
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.generar_movimiento_ajuste()
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.impedir_modificacion_historica()
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.anular_venta(UUID, VARCHAR, VARCHAR)
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
    public.anular_venta(UUID, VARCHAR, VARCHAR)
TO service_role;

COMMIT;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================