-- Migración aditiva Fase 2 - Unidad 3
-- Vista para stock derivado por producto

BEGIN;

CREATE OR REPLACE VIEW public.v_stock_producto AS
SELECT
  m.producto_id,
  p.codigo,
  p.nombre,
  COALESCE(SUM(m.cantidad_base), 0) AS stock_actual
FROM public.movimientos_inventario m
JOIN public.productos p ON p.id = m.producto_id
GROUP BY m.producto_id, p.codigo, p.nombre;

COMMIT;
