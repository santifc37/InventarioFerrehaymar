-- Migración aditiva Fase 2 - Unidad 2
-- Agrega trigger para actualizar actualizado_en en productos

BEGIN;

CREATE OR REPLACE FUNCTION public.set_productos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_productos_updated_at ON public.productos;
CREATE TRIGGER trg_productos_updated_at
BEFORE UPDATE ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.set_productos_updated_at();

COMMIT;
