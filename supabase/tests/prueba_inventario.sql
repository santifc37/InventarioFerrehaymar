-- ============================================================
-- PRUEBA DE HUMO - INVENTARIO FERREHAYMAR
-- Ejecutar en Supabase > SQL Editor (rol postgres).
-- Todo corre en una transacción y termina en ROLLBACK:
-- no queda ningún dato de prueba (los movimientos son
-- inmutables, por eso NO se pueden borrar después).
-- Al final devuelve una tabla con OK / FALLO por prueba.
-- ============================================================

BEGIN;

CREATE TEMP TABLE resultados (
    n SERIAL,
    prueba TEXT,
    ok BOOLEAN,
    detalle TEXT
);

-- ------------------------------------------------------------
-- 1 y 2. Nueve tablas existen y tienen RLS activado
-- ------------------------------------------------------------
DO $$
DECLARE
    v_tablas TEXT[] := ARRAY[
        'categorias','unidades','productos','conversiones_unidades',
        'ventas','venta_items','ajustes_entradas',
        'ajuste_entrada_items','movimientos_inventario'
    ];
    v_existen INT;
    v_con_rls INT;
    v_faltan TEXT;
    v_sin_rls TEXT;
BEGIN
    SELECT count(*) INTO v_existen
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = ANY (v_tablas);

    SELECT string_agg(t, ', ') INTO v_faltan
    FROM unnest(v_tablas) t
    WHERE t NOT IN (SELECT tablename FROM pg_tables WHERE schemaname='public');

    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('1. Existen las 9 tablas', v_existen = 9,
            v_existen || ' de 9. Faltan: ' || COALESCE(v_faltan, 'ninguna'));

    SELECT count(*) INTO v_con_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY (v_tablas)
      AND c.relrowsecurity;

    SELECT string_agg(c.relname, ', ') INTO v_sin_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY (v_tablas)
      AND NOT c.relrowsecurity;

    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('2. RLS activado en las 9 tablas', v_con_rls = 9,
            v_con_rls || ' de 9. Sin RLS: ' || COALESCE(v_sin_rls, 'ninguna'));
END $$;

-- ------------------------------------------------------------
-- 3 a 7. Flujo funcional: categoría, unidad, producto,
--        entrada, venta, anulación
-- ------------------------------------------------------------
DO $$
DECLARE
    v_cat UUID;
    v_uni UUID;
    v_prod UUID;
    v_aj UUID;
    v_venta UUID;
    v_stock NUMERIC;
    v_n_entrada INT;
    v_n_venta INT;
    v_n_comp INT;
    v_cant_venta NUMERIC;
    v_cant_comp NUMERIC;
    v_estado TEXT;
    v_inmutable BOOLEAN := FALSE;
BEGIN
    -- 3. Crear categoría, unidad y producto
    INSERT INTO public.categorias (nombre, descripcion)
    VALUES ('TEST Categoría', 'Prueba automática')
    RETURNING id INTO v_cat;

    INSERT INTO public.unidades (codigo, nombre, fraccionable)
    VALUES ('tst', 'Unidad de prueba', FALSE)
    RETURNING id INTO v_uni;

    INSERT INTO public.productos (
        codigo, nombre, categoria_id, unidad_base_id,
        precio_compra, precio_venta, stock_minimo
    )
    VALUES ('TEST-001', 'Producto de prueba', v_cat, v_uni, 500, 1000, 2)
    RETURNING id INTO v_prod;

    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('3. Crear categoría, unidad y producto',
            v_cat IS NOT NULL AND v_uni IS NOT NULL AND v_prod IS NOT NULL,
            'producto_id = ' || v_prod);

    -- 4. Entrada de 10 unidades -> stock 10
    INSERT INTO public.ajustes_entradas (tipo, motivo, usuario_actor)
    VALUES ('entrada', 'Compra de prueba', 'tester')
    RETURNING id INTO v_aj;

    INSERT INTO public.ajuste_entrada_items (ajuste_entrada_id, producto_id, cantidad, unidad_id)
    VALUES (v_aj, v_prod, 10, v_uni);

    SELECT stock_actual INTO v_stock
    FROM public.v_stock_actual WHERE producto_id = v_prod;

    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('4. Entrada de 10 -> stock = 10', v_stock = 10, 'stock = ' || v_stock);

    -- 5. Venta de 2 unidades -> stock 8
    INSERT INTO public.ventas (usuario_registro, observaciones)
    VALUES ('tester', 'Venta de prueba')
    RETURNING id INTO v_venta;

    INSERT INTO public.venta_items (venta_id, producto_id, cantidad, unidad_id, precio_unitario)
    VALUES (v_venta, v_prod, 2, v_uni, 1000);

    SELECT stock_actual INTO v_stock
    FROM public.v_stock_actual WHERE producto_id = v_prod;

    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('5. Venta de 2 -> stock = 8', v_stock = 8, 'stock = ' || v_stock);

    -- 6. Anular venta -> stock 10
    PERFORM public.anular_venta(v_venta, 'Anulación de prueba', 'tester');

    SELECT stock_actual INTO v_stock
    FROM public.v_stock_actual WHERE producto_id = v_prod;

    SELECT estado INTO v_estado FROM public.ventas WHERE id = v_venta;

    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('6. Anular venta -> stock = 10 y estado anulada',
            v_stock = 10 AND v_estado = 'anulada',
            'stock = ' || v_stock || ', estado = ' || v_estado);

    -- 7. Movimientos originales y compensatorios siguen existiendo
    SELECT count(*) INTO v_n_entrada
    FROM public.movimientos_inventario
    WHERE producto_id = v_prod AND tipo = 'entrada';

    SELECT count(*), COALESCE(sum(cantidad_base), 0)
    INTO v_n_venta, v_cant_venta
    FROM public.movimientos_inventario
    WHERE producto_id = v_prod AND tipo = 'venta';

    SELECT count(*), COALESCE(sum(cantidad_base), 0)
    INTO v_n_comp, v_cant_comp
    FROM public.movimientos_inventario
    WHERE producto_id = v_prod AND tipo = 'correccion_venta';

    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('7. Movimientos original y compensatorio existen',
            v_n_entrada = 1 AND v_n_venta = 1 AND v_cant_venta = -2
              AND v_n_comp = 1 AND v_cant_comp = 2,
            format('entrada=%s, venta=%s (cant %s), correccion_venta=%s (cant %s)',
                   v_n_entrada, v_n_venta, v_cant_venta, v_n_comp, v_cant_comp));

    -- Extra: los movimientos no se pueden borrar
    BEGIN
        DELETE FROM public.movimientos_inventario WHERE producto_id = v_prod;
    EXCEPTION WHEN OTHERS THEN
        v_inmutable := TRUE;
    END;

    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('7b. Extra: movimientos son inmutables (DELETE bloqueado)',
            v_inmutable, CASE WHEN v_inmutable THEN 'Bloqueado' ELSE 'SE PUDO BORRAR' END);
END $$;

-- ------------------------------------------------------------
-- 8. anon y authenticated NO pueden leer ni escribir
-- ------------------------------------------------------------
DO $$
DECLARE
    v_rol TEXT;
    v_obj TEXT;
    v_op TEXT;
    v_sql TEXT;
    v_fallos TEXT := '';
    v_total INT := 0;
    v_bloqueados INT := 0;
BEGIN
    FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        FOREACH v_obj IN ARRAY ARRAY[
            'categorias','unidades','productos','conversiones_unidades',
            'ventas','venta_items','ajustes_entradas',
            'ajuste_entrada_items','movimientos_inventario',
            'v_stock_actual','v_ventas_diarias','v_productos_mas_vendidos'
        ] LOOP
            FOREACH v_op IN ARRAY ARRAY['SELECT','INSERT','DELETE'] LOOP
                -- Vistas: solo lectura
                CONTINUE WHEN v_obj LIKE 'v\_%' AND v_op <> 'SELECT';

                v_sql := CASE v_op
                    WHEN 'SELECT' THEN format('SELECT 1 FROM public.%I LIMIT 1', v_obj)
                    WHEN 'INSERT' THEN format('INSERT INTO public.%I DEFAULT VALUES', v_obj)
                    WHEN 'DELETE' THEN format('DELETE FROM public.%I', v_obj)
                END;

                v_total := v_total + 1;

                BEGIN
                    EXECUTE format('SET LOCAL ROLE %I', v_rol);
                    EXECUTE v_sql;
                    -- Si llegó aquí, el rol tuvo acceso: FALLO
                    EXECUTE 'RESET ROLE';
                    v_fallos := v_fallos || format('%s %s %s; ', v_rol, v_op, v_obj);
                EXCEPTION WHEN insufficient_privilege THEN
                    EXECUTE 'RESET ROLE';
                    v_bloqueados := v_bloqueados + 1;
                WHEN OTHERS THEN
                    -- Otro error (p. ej. NOT NULL) significa que pasó el chequeo de permisos
                    EXECUTE 'RESET ROLE';
                    v_fallos := v_fallos || format('%s %s %s (%s); ', v_rol, v_op, v_obj, SQLERRM);
                END;
            END LOOP;
        END LOOP;

        -- Función de anulación no ejecutable por el navegador
        v_total := v_total + 1;
        BEGIN
            EXECUTE format('SET LOCAL ROLE %I', v_rol);
            PERFORM public.anular_venta(gen_random_uuid(), 'x', 'x');
            EXECUTE 'RESET ROLE';
            v_fallos := v_fallos || format('%s EXECUTE anular_venta; ', v_rol);
        EXCEPTION WHEN insufficient_privilege THEN
            EXECUTE 'RESET ROLE';
            v_bloqueados := v_bloqueados + 1;
        WHEN OTHERS THEN
            EXECUTE 'RESET ROLE';
            v_fallos := v_fallos || format('%s EXECUTE anular_venta (%s); ', v_rol, SQLERRM);
        END;
    END LOOP;

    INSERT INTO resultados (prueba, ok, detalle)
    VALUES ('8. anon y authenticated sin acceso directo',
            v_fallos = '',
            v_bloqueados || ' de ' || v_total || ' intentos bloqueados. '
              || CASE WHEN v_fallos = '' THEN 'Sin accesos indebidos.' ELSE 'Accesos indebidos: ' || v_fallos END);
END $$;

-- ------------------------------------------------------------
-- RESULTADO
-- ------------------------------------------------------------
SELECT n, prueba,
       CASE WHEN ok THEN 'OK' ELSE 'FALLO' END AS resultado,
       detalle
FROM resultados
ORDER BY n;

-- Deshace todo: no queda ningún dato de prueba.
ROLLBACK;
