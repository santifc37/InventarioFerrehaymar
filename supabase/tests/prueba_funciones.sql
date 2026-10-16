-- ============================================================
-- PRUEBA DE HUMO - FUNCIONES DE NEGOCIO (RPC)
-- Requiere haber aplicado antes:
--   1) el esquema inicial
--   2) supabase/migrations/20261016152500_funciones_negocio.sql
-- Ejecutar en Supabase > SQL Editor (rol postgres), en DESARROLLO.
-- Todo corre en una transacción y termina en ROLLBACK.
-- ============================================================

BEGIN;

CREATE TEMP TABLE resultados (
    n SERIAL,
    prueba TEXT,
    ok BOOLEAN,
    detalle TEXT
);

DO $$
DECLARE
    v_cat UUID; v_u UUID; v_ucj UUID;
    v_a UUID; v_b UUID; v_c UUID;
    v_ent UUID; v_ent2 UUID;
    v_v1 UUID; v_v1b UUID; v_vc UUID; v_nueva UUID; v_nueva2 UUID;
    v_stock NUMERIC; v_total NUMERIC; v_n INT; v_sum NUMERIC;
    v_estado TEXT; v_enlace UUID; v_fecha DATE;
    v_ok BOOLEAN;
    v_sqlstate TEXT;
BEGIN
    -- --------------------------------------------------------
    -- Preparación
    -- --------------------------------------------------------
    INSERT INTO categorias (nombre) VALUES ('TEST RPC') RETURNING id INTO v_cat;
    INSERT INTO unidades (codigo, nombre, fraccionable) VALUES ('tst','Test base',FALSE) RETURNING id INTO v_u;
    INSERT INTO unidades (codigo, nombre, fraccionable) VALUES ('tcj','Test caja',TRUE) RETURNING id INTO v_ucj;

    INSERT INTO productos (codigo,nombre,categoria_id,unidad_base_id,precio_compra,precio_venta)
    VALUES ('RPC-A','Producto A',v_cat,v_u,500,1000) RETURNING id INTO v_a;
    INSERT INTO productos (codigo,nombre,categoria_id,unidad_base_id,precio_compra,precio_venta)
    VALUES ('RPC-B','Producto B',v_cat,v_u,500,1000) RETURNING id INTO v_b;
    INSERT INTO productos (codigo,nombre,categoria_id,unidad_base_id,precio_compra,precio_venta)
    VALUES ('RPC-C','Producto C',v_cat,v_u,500,1000) RETURNING id INTO v_c;

    -- 1 caja = 12 unidades base (solo para el producto C)
    INSERT INTO conversiones_unidades (producto_id, unidad_origen_id, unidad_destino_id, factor_conversion)
    VALUES (v_c, v_ucj, v_u, 12);

    -- --------------------------------------------------------
    -- 1. registrar_entrada
    -- --------------------------------------------------------
    v_ent := registrar_entrada(
        'Compra de prueba', 'tester',
        jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', 10)),
        p_clave => 'ent-1');
    SELECT stock_actual INTO v_stock FROM v_stock_actual WHERE producto_id = v_a;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('1. registrar_entrada 10 -> stock 10', v_stock = 10, 'stock = ' || v_stock);

    -- 2. Idempotencia de la entrada
    v_ent2 := registrar_entrada(
        'Compra de prueba', 'tester',
        jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', 10)),
        p_clave => 'ent-1');
    SELECT stock_actual INTO v_stock FROM v_stock_actual WHERE producto_id = v_a;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('2. Reintento de entrada con la misma clave no duplica',
            v_ent2 = v_ent AND v_stock = 10,
            'mismo id = ' || (v_ent2 = v_ent) || ', stock = ' || v_stock);

    -- --------------------------------------------------------
    -- 3. registrar_venta: stock, total y fecha
    -- --------------------------------------------------------
    v_v1 := registrar_venta(
        'tester',
        jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', 2, 'precio_unitario', 1000)),
        p_clave => 'v-1');
    SELECT stock_actual INTO v_stock FROM v_stock_actual WHERE producto_id = v_a;
    SELECT total, fecha_venta INTO v_total, v_fecha FROM ventas WHERE id = v_v1;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('3. registrar_venta 2 -> stock 8, total 2000, fecha de hoy (Bogotá)',
            v_stock = 8 AND v_total = 2000 AND v_fecha = hoy_negocio(),
            format('stock=%s, total=%s, fecha=%s', v_stock, v_total, v_fecha));

    -- 4. Idempotencia de la venta
    v_v1b := registrar_venta(
        'tester',
        jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', 2, 'precio_unitario', 1000)),
        p_clave => 'v-1');
    SELECT stock_actual INTO v_stock FROM v_stock_actual WHERE producto_id = v_a;
    SELECT count(*) INTO v_n FROM ventas WHERE clave_idempotencia = 'v-1';
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('4. Reintento de venta con la misma clave no duplica',
            v_v1b = v_v1 AND v_stock = 8 AND v_n = 1,
            format('mismo id=%s, stock=%s, ventas con la clave=%s', v_v1b = v_v1, v_stock, v_n));

    -- --------------------------------------------------------
    -- 5. Conversión + precio por defecto (producto C)
    --    2 cajas = 24 base; vender 0.5 caja = 6 base;
    --    precio catálogo 1000/base -> 12000 por caja -> total 6000
    -- --------------------------------------------------------
    PERFORM registrar_entrada(
        'Compra cajas', 'tester',
        jsonb_build_array(jsonb_build_object('producto_id', v_c, 'cantidad', 2, 'unidad_id', v_ucj)));
    v_vc := registrar_venta(
        'tester',
        jsonb_build_array(jsonb_build_object('producto_id', v_c, 'cantidad', 0.5, 'unidad_id', v_ucj)));
    SELECT stock_actual INTO v_stock FROM v_stock_actual WHERE producto_id = v_c;
    SELECT total INTO v_total FROM ventas WHERE id = v_vc;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('5. Conversión (caja=12) y precio de catálogo por defecto',
            v_stock = 18 AND v_total = 6000,
            format('stock base=%s (esperado 18), total=%s (esperado 6000)', v_stock, v_total));

    -- --------------------------------------------------------
    -- 6. Stock insuficiente: advierte (FH001) y NO registra nada
    -- --------------------------------------------------------
    v_sqlstate := NULL;
    BEGIN
        PERFORM registrar_venta(
            'tester',
            jsonb_build_array(jsonb_build_object('producto_id', v_b, 'cantidad', 1, 'precio_unitario', 1000)),
            p_observaciones => 'stock-neg');
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    END;
    SELECT count(*) INTO v_n FROM ventas WHERE observaciones = 'stock-neg';
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('6. Venta sin stock -> error FH001 y no se crea la venta',
            v_sqlstate = 'FH001' AND v_n = 0,
            format('sqlstate=%s, ventas creadas=%s', v_sqlstate, v_n));

    -- 7. Con confirmación sí se registra (stock negativo)
    PERFORM registrar_venta(
        'tester',
        jsonb_build_array(jsonb_build_object('producto_id', v_b, 'cantidad', 1, 'precio_unitario', 1000)),
        p_observaciones => 'stock-neg',
        p_confirmar_stock_negativo => TRUE);
    SELECT stock_actual INTO v_stock FROM v_stock_actual WHERE producto_id = v_b;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('7. Venta sin stock CON confirmación -> se registra',
            v_stock = -1, 'stock = ' || v_stock);

    -- --------------------------------------------------------
    -- 8. corregir_venta: 2 -> 3 unidades (stock A: 8 -> 7)
    -- --------------------------------------------------------
    v_nueva := corregir_venta(
        v_v1, 'Error de cantidad', 'tester',
        jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', 3, 'precio_unitario', 1000)),
        p_clave => 'c-1');
    SELECT stock_actual INTO v_stock FROM v_stock_actual WHERE producto_id = v_a;
    SELECT estado, corregida_por_venta_id INTO v_estado, v_enlace FROM ventas WHERE id = v_v1;
    SELECT total INTO v_total FROM ventas WHERE id = v_nueva;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('8. corregir_venta: original corregida y enlazada, nueva 3 u, stock 7',
            v_stock = 7 AND v_estado = 'corregida' AND v_enlace = v_nueva AND v_total = 3000,
            format('stock=%s, estado orig=%s, enlace ok=%s, total nueva=%s',
                   v_stock, v_estado, v_enlace = v_nueva, v_total));

    -- 9. Historial conservado: venta -2, compensación +2, venta -3
    SELECT count(*), COALESCE(sum(cantidad_base),0) INTO v_n, v_sum
    FROM movimientos_inventario
    WHERE producto_id = v_a AND tipo IN ('venta','correccion_venta');
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('9. Corrección conserva historial (3 movimientos, suma -3)',
            v_n = 3 AND v_sum = -3, format('movimientos=%s, suma=%s', v_n, v_sum));

    -- 10. Idempotencia de la corrección
    v_nueva2 := corregir_venta(
        v_v1, 'Error de cantidad', 'tester',
        jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', 3, 'precio_unitario', 1000)),
        p_clave => 'c-1');
    SELECT stock_actual INTO v_stock FROM v_stock_actual WHERE producto_id = v_a;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('10. Reintento de corrección con la misma clave no duplica',
            v_nueva2 = v_nueva AND v_stock = 7,
            format('mismo id=%s, stock=%s', v_nueva2 = v_nueva, v_stock));

    -- 11. No se puede corregir ni anular una venta ya corregida
    v_ok := FALSE;
    BEGIN
        PERFORM corregir_venta(
            v_v1, 'Otra vez', 'tester',
            jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', 1, 'precio_unitario', 1000)),
            p_clave => 'c-2');
    EXCEPTION WHEN OTHERS THEN
        v_ok := TRUE;
    END;
    BEGIN
        PERFORM anular_venta(v_v1, 'Intento', 'tester');
        v_ok := FALSE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('11. Venta ya corregida no se corrige ni se anula de nuevo',
            v_ok, CASE WHEN v_ok THEN 'Rechazado' ELSE 'SE PERMITIÓ' END);

    -- 12. Anular la venta corregida (la nueva) -> stock A vuelve a 10
    PERFORM anular_venta(v_nueva, 'Cliente devolvió', 'tester');
    SELECT stock_actual INTO v_stock FROM v_stock_actual WHERE producto_id = v_a;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('12. Anular la venta nueva -> stock 10',
            v_stock = 10, 'stock = ' || v_stock);

    -- --------------------------------------------------------
    -- 13. registrar_ajuste
    -- --------------------------------------------------------
    PERFORM registrar_ajuste(
        'Conteo físico', 'tester',
        jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', -3)));
    SELECT stock_actual INTO v_stock FROM v_stock_actual WHERE producto_id = v_a;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('13. registrar_ajuste -3 -> stock 7', v_stock = 7, 'stock = ' || v_stock);

    -- 14. Ajuste que dejaría stock negativo exige confirmación
    v_sqlstate := NULL;
    BEGIN
        PERFORM registrar_ajuste(
            'Pérdida', 'tester',
            jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', -100)));
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    END;
    SELECT stock_actual INTO v_stock FROM v_stock_actual WHERE producto_id = v_a;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('14. Ajuste que deja stock negativo -> FH001, stock intacto',
            v_sqlstate = 'FH001' AND v_stock = 7,
            format('sqlstate=%s, stock=%s', v_sqlstate, v_stock));

    -- --------------------------------------------------------
    -- 15. Validaciones de datos
    -- --------------------------------------------------------
    v_ok := TRUE;
    -- motivo vacío
    BEGIN
        PERFORM registrar_ajuste('  ', 'tester',
            jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', 1)));
        v_ok := FALSE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    -- venta sin ítems
    BEGIN
        PERFORM registrar_venta('tester', '[]'::JSONB);
        v_ok := FALSE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    -- fecha futura
    BEGIN
        PERFORM registrar_venta('tester',
            jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', 1, 'precio_unitario', 1000)),
            p_fecha_venta => hoy_negocio() + 1);
        v_ok := FALSE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    -- unidad sin conversión (caja en producto A)
    BEGIN
        PERFORM registrar_venta('tester',
            jsonb_build_array(jsonb_build_object('producto_id', v_a, 'cantidad', 1, 'unidad_id', v_ucj, 'precio_unitario', 1000)),
            p_confirmar_stock_negativo => TRUE);
        v_ok := FALSE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('15. Se rechazan: motivo vacío, venta sin ítems, fecha futura, unidad sin conversión',
            v_ok, CASE WHEN v_ok THEN 'Todas rechazadas' ELSE 'ALGUNA SE PERMITIÓ' END);
END $$;

-- ------------------------------------------------------------
-- 16. anon / authenticated NO pueden ejecutar las funciones
-- ------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    v_rol TEXT;
    v_fallos TEXT := '';
    v_total INT := 0;
BEGIN
    FOR r IN
        SELECT p.oid, p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('registrar_entrada','registrar_ajuste','registrar_venta',
                            'corregir_venta','anular_venta','validar_stock_items','hoy_negocio')
    LOOP
        FOREACH v_rol IN ARRAY ARRAY['anon','authenticated'] LOOP
            v_total := v_total + 1;
            IF has_function_privilege(v_rol, r.oid, 'EXECUTE') THEN
                v_fallos := v_fallos || v_rol || ' puede ejecutar ' || r.proname || '; ';
            END IF;
        END LOOP;
    END LOOP;

    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('16. anon y authenticated sin EXECUTE en las funciones',
            v_fallos = '' AND v_total = 14,
            v_total || ' comprobaciones. ' || CASE WHEN v_fallos = '' THEN 'Sin accesos indebidos.' ELSE v_fallos END);
END $$;

SELECT n, prueba,
       CASE WHEN ok THEN 'OK' ELSE 'FALLO' END AS resultado,
       detalle
FROM resultados
ORDER BY n;

ROLLBACK;
