# Esquema de base de datos — Inventario Ferrehaymar

Base de datos PostgreSQL administrada con Supabase. Este documento describe las tablas, vistas, funciones, reglas de negocio, seguridad y el procedimiento para aplicar migraciones.

> Última actualización: 2026-10-16. Si el esquema cambia, actualizar este archivo en el mismo commit que la migración.

---

## 1. Acceso a los datos

```
Navegador (Vercel)  →  API (Render)  →  Supabase / PostgreSQL
```

- El navegador **nunca** accede a la base de datos. No recibe claves de Supabase.
- La API usa la clave `SUPABASE_SERVICE_ROLE_KEY`, guardada solo en las variables de entorno de Render.
- Todas las tablas tienen RLS activado y **sin políticas** para `anon` ni `authenticated`; además se les revocaron los privilegios. Solo `service_role` tiene acceso.
- La lógica de negocio que requiere varias escrituras vive en funciones de Postgres (RPC), que la API llama con `supabase.rpc(...)`.

---

## 2. Migraciones

| Archivo | Contenido |
|---|---|
| Esquema inicial (`INVENTARIO FERREHAYMAR`) | 9 tablas, vistas, triggers, `anular_venta`, RLS y permisos |
| `supabase/migrations/20261016152500_funciones_negocio.sql` | Columnas de idempotencia, `hoy_negocio`, `validar_stock_items`, `registrar_entrada`, `registrar_ajuste`, `registrar_venta`, `corregir_venta` |

### Procedimiento para aplicar una migración

1. Confirmar a qué proyecto de Supabase se está conectado (desarrollo o producción).
2. Leer la migración y revisar su efecto. Si existen datos que deban conservarse, comprobarlos antes.
3. Aplicarla primero en **desarrollo**.
4. Ejecutar las pruebas de humo (sección 9) y verificar que todo salga en OK.
5. Solo entonces aplicarla en producción, con autorización explícita.
6. Una migración ya aplicada **no se edita**: los cambios posteriores van en una migración nueva con marca de tiempo (`AAAAMMDDHHMMSS_descripcion.sql`).

> Al ejecutar en el SQL Editor de Supabase, si pregunta por RLS: las migraciones que no crean tablas no lo necesitan. Si una migración crea una tabla en `public`, debe incluir su propio `ENABLE ROW LEVEL SECURITY`.

---

## 3. Modelo de datos

### Diagrama de relaciones

```
categorias ──< productos >── unidades
                 │  │
                 │  └──< conversiones_unidades (producto + unidad origen → unidad base)
                 │
                 ├──< venta_items >── ventas
                 ├──< ajuste_entrada_items >── ajustes_entradas
                 └──< movimientos_inventario   (stock = suma de cantidad_base)
```

### 3.1 `categorias`
Clasificación de productos.
- `nombre` único sin distinguir mayúsculas ni espacios extremos; no puede estar vacío.
- `activo`: se desactiva en vez de borrar.

### 3.2 `unidades`
Catálogo global de unidades (`u`, `m`, `cm`, `mm`, `kg`, `g`, `lb`, `l`, `ml`, `gal`, `caja`, `paquete`, `docena`, `par`).
- `codigo` único (sin distinguir mayúsculas).
- `fraccionable`: indica si la unidad admite fracciones. **Es informativo**; hoy la base de datos no lo valida (ver sección 10).

### 3.3 `productos`
- `codigo` (SKU interno) único; `codigo_barras` único cuando no está vacío.
- `categoria_id`, `unidad_base_id`: obligatorios, `ON DELETE RESTRICT`.
- `precio_compra`, `precio_venta`: `NUMERIC(12,2)`, no negativos. Los precios son **por unidad base**.
- `stock_minimo`: `NUMERIC(12,3)`, no negativo.
- **El stock no se guarda aquí.** Se calcula desde `movimientos_inventario`.
- `activo`: un producto con movimientos no se borra, se desactiva. Un producto inactivo no se puede vender.
- `actualizado_en` se actualiza automáticamente.

### 3.4 `conversiones_unidades`
Permite registrar ventas, entradas y ajustes en una unidad distinta de la base.
- Sentido del factor: **cantidad en unidad origen × `factor_conversion` = cantidad en unidad base.**
- `factor_conversion > 0`, `NUMERIC(14,6)`.
- Una sola conversión por (producto, unidad origen, unidad destino).
- La unidad destino debe ser la unidad base del producto (así la busca `obtener_factor_base`).
- Si no hay conversión activa, la operación se rechaza.

**Ejemplos**

| Producto | Unidad base | Conversión | Operación | Cantidad en base |
|---|---|---|---|---|
| Tornillo | `u` | `caja` → `u`, factor 100 | vender 2 cajas | 200 u |
| Cable | `m` | `cm` → `m`, factor 0.01 | vender 50 cm | 0.500 m |
| Cuerda | `m` | `rollo` → `m`, factor 25 | entrada de 0.5 rollo | 12.500 m |

### 3.5 `ventas`
Cabecera de una venta.
- `fecha_venta` (`DATE`): día en que ocurrió la venta. Puede elegirla el vendedor, pero no puede ser futura.
- `fecha_registro` (`TIMESTAMPTZ`): momento real en que se registró.
- `total`: calculado por trigger a partir de los ítems; la API no lo envía.
- `estado`: `registrada`, `corregida` o `anulada`.
- `corregida_por_venta_id`: en una venta `corregida`, apunta a la venta nueva que la reemplaza.
- `motivo_correccion`: obligatorio si la venta está `corregida`; también se guarda al anular.
- `clave_idempotencia`: única cuando no es nula (ver sección 6.4).
- Las ventas **no se pueden borrar**.

### 3.6 `venta_items`
Productos de una venta. **Inmutables** (no se editan ni borran).
- `cantidad` y `unidad_id`: lo vendido, en la unidad en que se vendió.
- `factor_conversion` y `cantidad_base`: calculados por trigger.
- `precio_unitario`: precio **por la unidad en que se vendió**. Si no se envía, se toma `precio_venta × factor_conversion` del catálogo.
- `costo_unitario_base`: copia de `productos.precio_compra` al momento de la venta.
- `subtotal` y `utilidad_estimada`: columnas generadas.
  - `subtotal = cantidad × precio_unitario`
  - `utilidad_estimada = subtotal − (cantidad × factor_conversion × costo_unitario_base)`
- `nombre_producto_snapshot`, `codigo_producto_snapshot`: nombre y código del producto en ese momento.
- Cambiar el precio o el nombre en el catálogo **no** altera ventas anteriores.

### 3.7 `ajustes_entradas`
Cabecera de entradas de mercancía y ajustes de inventario.
- `tipo`: `entrada` o `ajuste`.
- `motivo` y `usuario_actor`: obligatorios.
- `fecha`: día de la operación (no futura al usar las funciones).
- `clave_idempotencia`: única cuando no es nula.
- No se pueden borrar.

### 3.8 `ajuste_entrada_items`
Detalle de entradas y ajustes. **Inmutables.**
- En una `entrada`, `cantidad > 0`.
- En un `ajuste`, `cantidad` puede ser positiva o negativa, pero no cero.
- `factor_conversion` y `cantidad_base` se calculan por trigger.

### 3.9 `movimientos_inventario`
Libro de movimientos. **Inmutable**: no se actualiza ni se borra; los errores se corrigen con un movimiento compensatorio.
- `cantidad_base`: positiva = entra al stock, negativa = sale.
- `cantidad_original` y `unidad_id`: lo que se registró en la unidad original.
- `tipo`: `entrada`, `ajuste`, `venta`, `correccion_venta` (también permitido: `salida`, sin uso actual).
- `referencia_tipo` / `referencia_id`: origen del movimiento (polimórfico, sin clave foránea).

| Origen | `tipo` | `referencia_tipo` | `referencia_id` |
|---|---|---|---|
| Entrada o ajuste | `entrada` / `ajuste` | `ajuste_entrada` | id de la cabecera |
| Venta | `venta` | `venta` | id de la venta |
| Anulación o corrección | `correccion_venta` | `correccion` | id de la venta **original** |

- `motivo` es obligatorio salvo en `venta` y `correccion_venta` (que lo traen implícito o por la función).
- `hash_trazabilidad` y `referencia_tipo = 'import'` están reservados para fases futuras (Fase 12, importación CSV); hoy no se usan.

---

## 4. Vistas

Todas con `security_invoker = true`; solo `service_role` puede leerlas.

| Vista | Qué devuelve |
|---|---|
| `v_stock_actual` | Una fila por producto con `stock_actual` (suma de `cantidad_base`), `agotado` (stock ≤ 0) y `stock_bajo` (0 < stock ≤ `stock_minimo`). Los productos sin movimientos aparecen con stock 0. |
| `v_ventas_diarias` | Por `fecha_venta`: número de ventas y total vendido, **solo ventas `registrada`**. |
| `v_productos_mas_vendidos` | Por producto: cantidad vendida (en base), total vendido y utilidad estimada, **solo ventas `registrada`**. |

### Cómo se contabilizan las ventas corregidas y anuladas

- La venta **original corregida** y la **anulada** no cuentan en los informes (su estado ya no es `registrada`).
- La venta **nueva** creada por una corrección sí cuenta (nace `registrada`).
- El historial completo se conserva y se puede consultar por `estado`.

---

## 5. Funciones y triggers

### 5.1 Funciones llamadas por la API (RPC)

Solo `service_role` puede ejecutarlas.

| Función | Parámetros principales | Devuelve |
|---|---|---|
| `registrar_entrada` | `p_motivo`, `p_usuario`, `p_items`, `p_fecha`, `p_observaciones`, `p_clave` | id de la entrada |
| `registrar_ajuste` | `p_motivo`, `p_usuario`, `p_items`, `p_confirmar_stock_negativo`, `p_fecha`, `p_observaciones`, `p_clave` | id del ajuste |
| `registrar_venta` | `p_usuario`, `p_items`, `p_fecha_venta`, `p_observaciones`, `p_confirmar_stock_negativo`, `p_clave` | id de la venta |
| `corregir_venta` | `p_venta_id`, `p_motivo`, `p_usuario`, `p_items`, `p_fecha_venta`, `p_observaciones`, `p_confirmar_stock_negativo`, `p_clave` | id de la venta nueva |
| `anular_venta` | `p_venta_id`, `p_motivo`, `p_usuario_actor` | nada |

Formato de `p_items` (JSON):

```json
[
  { "producto_id": "uuid", "cantidad": 2, "unidad_id": "uuid", "precio_unitario": 1000 }
]
```

- `unidad_id` es opcional: si falta, se usa la unidad base del producto.
- `precio_unitario` solo aplica a ventas y es opcional: si falta, se usa el precio de catálogo.
- Cada función es **una sola transacción**: si algo falla, no queda nada a medias.
- `anular_venta` es la única función `SECURITY DEFINER`.

### 5.2 Funciones internas

| Función | Uso |
|---|---|
| `hoy_negocio()` | Fecha de hoy en la zona horaria `America/Bogota`. |
| `validar_stock_items(...)` | Valida los ítems y calcula si el stock quedaría negativo. Bloquea los productos involucrados en orden de id. |
| `obtener_factor_base(producto, unidad)` | Devuelve el factor hacia la unidad base o falla si no hay conversión activa. |
| `actualizar_fecha_modificacion()` | Mantiene `actualizado_en`. |
| `impedir_modificacion_historica()` | Bloquea UPDATE/DELETE en registros históricos. |

### 5.3 Triggers

| Tabla | Trigger | Efecto |
|---|---|---|
| `venta_items` | antes de insertar | Valida venta activa y producto activo, calcula factor y `cantidad_base`, fija precio por defecto, costo y snapshots |
| `venta_items` | después de insertar | Recalcula `ventas.total` y genera el movimiento `venta` (negativo) |
| `ajuste_entrada_items` | antes de insertar | Valida signo según tipo, calcula factor y `cantidad_base` |
| `ajuste_entrada_items` | después de insertar | Genera el movimiento `entrada` o `ajuste` |
| `movimientos_inventario`, `venta_items`, `ajuste_entrada_items` | antes de UPDATE/DELETE | Rechaza la operación (inmutables) |
| `ventas`, `ajustes_entradas` | antes de DELETE | Rechaza la operación |
| `productos`, `ventas` | antes de UPDATE | Actualiza `actualizado_en` |

---

## 6. Reglas de negocio implementadas en la base de datos

### 6.1 Stock
El stock siempre es la suma de `movimientos_inventario.cantidad_base` por producto. No existe una columna editable de stock.

### 6.2 Historial inmutable
No se borran ni editan ventas, ítems, entradas, ajustes ni movimientos. Las correcciones se hacen con movimientos compensatorios.

### 6.3 Stock insuficiente
Al vender o hacer un ajuste negativo que dejaría el stock por debajo de cero, la función **no bloquea**: lanza el error `STOCK_INSUFICIENTE` con código SQLSTATE **`FH001`**.
- `DETAIL`: JSON con, por producto, `producto_id`, `nombre`, `stock_actual`, `cambio` y `stock_resultante`.
- La API debe mostrar la advertencia y, si el usuario confirma, repetir la llamada con `p_confirmar_stock_negativo = true`.
- En supabase-js llega como `error.code === 'FH001'` y el detalle en `error.details`.

### 6.4 Idempotencia
`p_clave` evita duplicados cuando una petición se reintenta (doble clic, fallo de red).
- Si ya existe una operación con esa clave, la función devuelve su id sin registrar nada nuevo.
- La clave debe generarse en el frontend (UUID) al abrir el formulario y reutilizarse en los reintentos.
- Cada operación distinta necesita su propia clave. En `corregir_venta`, la clave queda en la venta nueva.

### 6.5 Fechas y zona horaria
- La zona horaria del negocio es `America/Bogota`.
- `fecha_venta` y `fecha` no pueden ser futuras (se comparan con `hoy_negocio()`).
- `fecha_registro` y `creado_en` se guardan en UTC (`TIMESTAMPTZ`).

### 6.6 Cantidades y redondeo
- Cantidades con hasta 3 decimales; la conversión a base se redondea a 3 decimales una sola vez (`ROUND(cantidad × factor, 3)`).
- Importes con 2 decimales.

### 6.7 Corrección de ventas (`corregir_venta`)
1. Exige motivo y usuario; solo corrige ventas `registrada`.
2. Inserta movimientos `correccion_venta` positivos que revierten la venta original.
3. Registra la venta nueva (validando el stock ya con lo restituido).
4. Marca la original como `corregida` y la enlaza con `corregida_por_venta_id`.

### 6.8 Anulación de ventas (`anular_venta`)
1. Exige motivo y usuario; solo anula ventas `registrada`.
2. Inserta movimientos `correccion_venta` positivos por cada ítem.
3. Marca la venta como `anulada` y guarda el motivo.
4. La venta y sus ítems siguen disponibles para consulta.

---

## 7. Seguridad

- RLS activado en las 9 tablas, sin políticas para `anon`/`authenticated`.
- `REVOKE ALL` sobre tablas, vistas y funciones para `PUBLIC`, `anon` y `authenticated`.
- `GRANT` exclusivo a `service_role`.
- **Toda función nueva** debe incluir `REVOKE ALL ... FROM PUBLIC, anon, authenticated` y `GRANT EXECUTE ... TO service_role`; Supabase expone como API las funciones del esquema `public`.
- **Toda tabla nueva** en `public` debe incluir `ENABLE ROW LEVEL SECURITY` y los `REVOKE`/`GRANT` equivalentes.
- La clave `service_role` solo vive en las variables de entorno de Render. Nunca en el frontend, el repositorio, los registros ni los mensajes de error.

---

## 8. Datos iniciales

El esquema inserta las 14 unidades base del catálogo (sección 3.2). Categorías y productos se crean desde la aplicación o por importación CSV.

---

## 9. Pruebas

| Script | Qué verifica |
|---|---|
| `prueba_inventario.sql` | Existencia de las 9 tablas, RLS activado, flujo entrada → venta → anulación, historial de movimientos, inmutabilidad y bloqueo de `anon`/`authenticated` |
| `prueba_funciones.sql` | `registrar_entrada`, `registrar_venta`, `registrar_ajuste`, `corregir_venta`, idempotencia, conversión de unidades, precio por defecto, error `FH001`, validaciones y permisos de las funciones |

Ambos corren en una transacción que termina en `ROLLBACK` (no dejan datos) y se ejecutan en **desarrollo**.

---

## 10. Limitaciones conocidas y pendientes

- `ventas.fecha_venta` conserva `DEFAULT CURRENT_DATE` (UTC) del esquema inicial. No afecta si siempre se usa `registrar_venta`; corregir en una migración futura.
- `unidades.fraccionable` no se valida: hoy se acepta una cantidad fraccionaria aunque la unidad no sea fraccionable. Decidir si se valida en la base de datos o en la API (Fase 6).
- El costo histórico es el `precio_compra` vigente al vender, no un costo promedio. La utilidad es, por tanto, **estimada**.
- No se valida que la unidad destino de una conversión sea la unidad base del producto al crearla (solo se usa si coincide). Validar en la API (Fase 6).
- El stock puede quedar negativo si el usuario confirma la advertencia; la regla de quién puede confirmar está pendiente.
- `hash_trazabilidad` y el tipo de movimiento `salida` están reservados y sin uso.
- Falta documentar los respaldos y el procedimiento de restauración (Fase 14).