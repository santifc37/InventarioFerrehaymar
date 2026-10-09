# Esquema de base de datos — Inventario Ferretería

> Basado en: stock derivado de movimientos, trazabilidad de correcciones, entradas/ajustes con justificación, acceso con contraseña compartida única.

## 1. Principios
- **Fuente única de verdad**: el stock actual de un producto se calcula a partir de `movimientos_inventario`. No existe un campo `stock` mutable directo.
- **Inmutabilidad de eventos**: los movimientos y las ventas no se eliminan. Las correcciones crean nuevos registros/movimientos que compensan, dejando trazabilidad completa.
- **Justificación obligatoria**: `ajustes_entradas` requiere `motivo` y `usuario_actor` (aunque sea único, para trazabilidad).
- **RLS básico**: pensado para acceso con contraseña compartida única (se aplicará en capa backend + política base).

## 2. Entidades

### 2.1. categorias
Agrupación de productos.
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| id | uuid (PK) | Sí | Identificador único |
| nombre | varchar(100) | Sí | Nombre único de categoría |
| descripcion | text | No | Descripción opcional |
| activo | boolean | Sí | default true |
| creado_en | timestamptz | Sí | default now() |

Constraints: UNIQUE(nombre).

### 2.2. unidades
Catálogo de unidades base/uso.
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| id | uuid (PK) | Sí | Identificador único |
| codigo | varchar(20) | Sí | Código corto único (ej. u, m, kg, caja) |
| nombre | varchar(100) | Sí | Nombre descriptivo |
| fraccionable | boolean | Sí | Permite cantidades fraccionarias |
| creado_en | timestamptz | Sí | default now() |

Constraints: UNIQUE(codigo).

### 2.3. productos
Catálogo de productos.
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| id | uuid (PK) | Sí | Identificador único |
| codigo | varchar(50) | Sí | Código interno/SKU único |
| nombre | varchar(200) | Sí | Descripción del producto |
| categoria_id | uuid (FK -> categorias.id) | Sí | Categoría |
| unidad_base_id | uuid (FK -> unidades.id) | Sí | Unidad base para stock |
| precio_venta | numeric(12,2) | No | Referencial |
| activo | boolean | Sí | default true |
| stock_minimo | numeric(12,3) | No | Alerta |
| creado_en | timestamptz | Sí | default now() |
| actualizado_en | timestamptz | Sí | default now() |

Constraints: UNIQUE(codigo), FK categoria_id, FK unidad_base_id.

### 2.4. conversiones_unidades
Equivalencias entre unidades para mismo producto (soporta fracciones).
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| id | uuid (PK) | Sí | Identificador único |
| producto_id | uuid (FK -> productos.id) | Sí | Producto |
| unidad_origen_id | uuid (FK -> unidades.id) | Sí | Unidad origen |
| unidad_destino_id | uuid (FK -> unidades.id) | Sí | Unidad destino (suele ser base) |
| factor_conversion | numeric(14,6) | Sí | origen * factor = destino (en unidad base) |
| activo | boolean | Sí | default true |
| creado_en | timestamptz | Sí | default now() |

Constraints: FK producto_id, FK unidades origen/destino, CHECK(factor_conversion > 0).

### 2.5. movimientos_inventario
Registro inmutable de todos los movimientos que afectan stock.
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| id | uuid (PK) | Sí | Identificador único |
| producto_id | uuid (FK -> productos.id) | Sí | Producto afectado |
| tipo | varchar(10) | Sí | 'entrada' \| 'salida' \| 'ajuste' \| 'venta' \| 'correccion_venta' |
| cantidad_base | numeric(12,3) | Sí | Cantidad en unidad base (+/- según tipo) |
| unidad_id | uuid (FK -> unidades.id) | Sí | Unidad en que se registró el movimiento |
| cantidad_original | numeric(12,3) | Sí | Cantidad en unidad original |
| referencia_tipo | varchar(20) | No | 'venta' \| 'ajuste_entrada' \| 'correccion' \| 'import' |
| referencia_id | uuid | No | ID de referencia (venta_id, ajuste_entrada_id, etc.) |
| motivo | varchar(200) | No | Razón/motivo |
| usuario_actor | varchar(100) | No | Quién realizó (trazabilidad) |
| fecha | timestamptz | Sí | default now() |
| hash_trazabilidad | varchar(64) | No | Para integridad futura (opcional) |

Constraints: FK producto_id, FK unidad_id, CHECK(cantidad_base != 0), CHECK(tipo IN valores válidos).
Índices: (producto_id, fecha), (referencia_tipo, referencia_id).

### 2.6. ventas
Cabecera de venta individual.
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| id | uuid (PK) | Sí | Identificador único |
| fecha_venta | date | Sí | Fecha de venta (registro posterior) |
| fecha_registro | timestamptz | Sí | Cuándo se registró (default now()) |
| total | numeric(12,2) | Sí | Total calculado |
| observaciones | text | No | Observaciones |
| estado | varchar(10) | Sí | 'registrada' \| 'corregida' \| 'anulada' (según necesidad) |
| corregida_por_venta_id | uuid (FK -> ventas.id) | No | Auto-referencia si es corrección |
| usuario_registro | varchar(100) | No | Quien registró/corregió |
| motivo_correccion | varchar(200) | No | Obligatorio si corregida |
| creado_en | timestamptz | Sí | default now() |
| actualizado_en | timestamptz | Sí | default now() |

Constraints: FK auto-referencia, estado válido.

### 2.7. venta_items
Detalle de ítems por venta.
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| id | uuid (PK) | Sí | Identificador único |
| venta_id | uuid (FK -> ventas.id ON DELETE RESTRICT) | Sí | Venta |
| producto_id | uuid (FK -> productos.id) | Sí | Producto |
| cantidad | numeric(12,3) | Sí | Cantidad en unidad vendida |
| unidad_id | uuid (FK -> unidades.id) | Sí | Unidad vendida |
| precio_unitario | numeric(12,2) | Sí | Precio unitario |
| subtotal | numeric(12,2) | Sí | cantidad * precio_unitario |
| creado_en | timestamptz | Sí | default now() |

Constraints: FK venta_id, FK producto_id, FK unidad_id, CHECK(cantidad > 0).

### 2.8. ajustes_entradas
Registro de entradas/ajustes con justificación (audit).
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| id | uuid (PK) | Sí | Identificador único |
| tipo | varchar(10) | Sí | 'entrada' \| 'ajuste' |
| fecha | date | Sí | Fecha movimiento |
| observaciones | text | No | Observaciones |
| motivo | varchar(200) | Sí | **Requerido** (justificación) |
| usuario_actor | varchar(100) | Sí | Quien realizó |
| creado_en | timestamptz | Sí | default now() |

### 2.9. ajuste_entrada_items
Detalle ítems de entrada/ajuste.
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| id | uuid (PK) | Sí | Identificador único |
| ajuste_entrada_id | uuid (FK -> ajustes_entradas.id ON DELETE RESTRICT) | Sí | Cabecera |
| producto_id | uuid (FK -> productos.id) | Sí | Producto |
| cantidad | numeric(12,3) | Sí | Cantidad en unidad registrada |
| unidad_id | uuid (FK -> unidades.id) | Sí | Unidad |
| cantidad_base | numeric(12,3) | Sí | Cantidad convertida a unidad base |
| creado_en | timestamptz | Sí | default now() |

Constraints: FK ajuste_entrada_id, FK producto_id, FK unidad_id.

## 3. Reglas de negocio (implementación)
- Al registrar venta: crear movimiento tipo 'venta' con `cantidad_base` negativa (salida) por cada ítem, referenciando `venta_id`.
- Al corregir venta: crear nueva venta (o marcar estado), generar movimientos tipo 'correccion_venta' compensatorios (+) por ítems originales y (-) por nuevos si aplica. Mantener `corregida_por_venta_id` y `motivo_correccion`.
- Al crear ajuste/entrada: generar movimientos tipo 'entrada'/'ajuste' con `cantidad_base` según signo/contenido, referenciando `ajuste_entrada_id`.
- **Stock actual** por producto = SUM(cantidad_base) sobre `movimientos_inventario` donde producto_id = X.
- Validar conversión existe si unidad distinta a base; calcular `cantidad_base` via factor.
- Unidades fraccionables: permitir decimales según `unidades.fraccionable`.

## 4. Migración aditiva inicial
Ver `supabase/migrations/20251009050000_init_schema_ferreteria.sql` (próximo paso). 

RLS: se definirá mínimo (lectura/escritura controlada por acceso contraseña única vía backend). No habilitar RLS destructivo sin política.