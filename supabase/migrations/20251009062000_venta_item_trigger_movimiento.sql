-- Migración aditiva Fase 2 - Unidad 4
-- Genera movimientos de inventario al insertar venta_items

BEGIN;

CREATE OR REPLACE FUNCTION public.generar_movimiento_venta_item()
RETURNS TRIGGER AS $$
DECLARE
  v_base NUMERIC(12,3);
BEGIN
  -- Obtener cantidad en unidad base si es distinta? 
  -- Por simplicidad: asumimos cantidad en unidad vendida; si necesitamos conversión
  -- aquí se podría buscar factor. Por ahora usamos cantidad tal cual como base
  -- (coherente con esquema actual: cantidad_base almacenado)
  v_base := NEW.cantidad;
  -- Si unidad_id != unidad base del producto, idealmente convertir.
  -- TODO: implementar conversión vía conversiones_unidades si existe.
  INSERT INTO public.movimientos_inventario (
    producto_id,
    tipo,
    cantidad_base,
    unidad_id,
    cantidad_original,
    referencia_tipo,
    referencia_id
  ) VALUES (
    NEW.producto_id,
    'venta',
    -v_base,
    NEW.unidad_id,
    NEW.cantidad,
    'venta',
    NEW.venta_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_item_movimiento ON public.venta_items;
CREATE TRIGGER trg_venta_item_movimiento
AFTER INSERT ON public.venta_items
FOR EACH ROW EXECUTE FUNCTION public.generar_movimiento_venta_item();

COMMIT;
