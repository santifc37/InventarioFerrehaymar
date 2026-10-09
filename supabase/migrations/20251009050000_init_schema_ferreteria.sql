-- Migración inicial para inventario ferretería
-- Fase 1: Esquema base con stock derivado de movimientos y trazabilidad

BEGIN;

-- Extensiones útiles si faltan (seguras)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. categorias
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. unidades
CREATE TABLE IF NOT EXISTS public.unidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  fraccionable BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. productos
CREATE TABLE IF NOT EXISTS public.productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE RESTRICT,
  unidad_base_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
  precio_venta NUMERIC(12,2),
  activo BOOLEAN NOT NULL DEFAULT true,
  stock_minimo NUMERIC(12,3),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON public.productos(activo);

-- 4. conversiones_unidades
CREATE TABLE IF NOT EXISTS public.conversiones_unidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  unidad_origen_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
  unidad_destino_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
  factor_conversion NUMERIC(14,6) NOT NULL CHECK (factor_conversion > 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_producto ON public.conversiones_unidades(producto_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_unica ON public.conversiones_unidades(producto_id, unidad_origen_id, unidad_destino_id) WHERE activo;

-- 5. movimientos_inventario
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada','salida','ajuste','venta','correccion_venta')),
  cantidad_base NUMERIC(12,3) NOT NULL CHECK (cantidad_base != 0),
  unidad_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
  cantidad_original NUMERIC(12,3) NOT NULL,
  referencia_tipo VARCHAR(20) CHECK (referencia_tipo IN ('venta','ajuste_entrada','correccion','import')),
  referencia_id UUID,
  motivo VARCHAR(200),
  usuario_actor VARCHAR(100),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  hash_trazabilidad VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_mov_producto_fecha ON public.movimientos_inventario(producto_id, fecha);
CREATE INDEX IF NOT EXISTS idx_mov_referencia ON public.movimientos_inventario(referencia_tipo, referencia_id);

-- 6. ventas
CREATE TABLE IF NOT EXISTS public.ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha_venta DATE NOT NULL,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  estado VARCHAR(12) NOT NULL DEFAULT 'registrada' CHECK (estado IN ('registrada','corregida','anulada')),
  corregida_por_venta_id UUID REFERENCES public.ventas(id) ON DELETE SET NULL,
  usuario_registro VARCHAR(100),
  motivo_correccion VARCHAR(200),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON public.ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON public.ventas(estado);

-- 7. venta_items
CREATE TABLE IF NOT EXISTS public.venta_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE RESTRICT,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  unidad_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventaitems_venta ON public.venta_items(venta_id);
CREATE INDEX IF NOT EXISTS idx_ventaitems_producto ON public.venta_items(producto_id);

-- 8. ajustes_entradas
CREATE TABLE IF NOT EXISTS public.ajustes_entradas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada','ajuste')),
  fecha DATE NOT NULL,
  observaciones TEXT,
  motivo VARCHAR(200) NOT NULL,
  usuario_actor VARCHAR(100) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ajustes_fecha ON public.ajustes_entradas(fecha);

-- 9. ajuste_entrada_items
CREATE TABLE IF NOT EXISTS public.ajuste_entrada_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ajuste_entrada_id UUID NOT NULL REFERENCES public.ajustes_entradas(id) ON DELETE RESTRICT,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad != 0),
  unidad_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
  cantidad_base NUMERIC(12,3) NOT NULL CHECK (cantidad_base != 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ajusteitems_cabecera ON public.ajuste_entrada_items(ajuste_entrada_id);
CREATE INDEX IF NOT EXISTS idx_ajusteitems_producto ON public.ajuste_entrada_items(producto_id);

COMMIT;