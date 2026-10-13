-- Migración aditiva Fase 2 - Unidad 5
-- Genera movimientos de inventario al insertar ajuste_entrada_items

BEGIN;

CREATE OR REPLACE FUNCTION public.generar_movimiento_ajuste_item()
RETURNS TRIGGER AS $$
DECLARE
  v_tipo VARCHAR(10);
BEGIN
  SELECT tipo
    INTO v_tipo
    FROM public.ajustes_entradas
   WHERE id = NEW.ajuste_entrada_id;

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'ajuste_entrada_id % no existe', NEW.ajuste_entrada_id;
  END IF;

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
    v_tipo,
    NEW.cantidad_base,
    NEW.unidad_id,
    NEW.cantidad,
    'ajuste_entrada',
    NEW.ajuste_entrada_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ajuste_item_movimiento ON public.ajuste_entrada_items;
CREATE TRIGGER trg_ajuste_item_movimiento
AFTER INSERT ON public.ajuste_entrada_items
FOR EACH ROW EXECUTE FUNCTION public.generar_movimiento_ajuste_item();

COMMIT;
