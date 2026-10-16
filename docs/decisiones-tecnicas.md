# Decisiones técnicas — Inventario Ferrehaymar

Registro de decisiones con su motivo. Si una decisión cambia, **no se borra**: se marca como reemplazada y se agrega la nueva.

Estados: **Decidida** (viene de la guía o del diseño ya construido) · **Propuesta** (sugerida en la Fase 0, pendiente de confirmar) · **Pendiente** (se decide en la fase indicada).

Última actualización: 2026-10-16.

---

## Decisiones tomadas

| ID | Decisión | Motivo | Estado |
|---|---|---|---|
| D-001 | **Frontend:** Next.js con TypeScript, desplegado en Vercel. | Definido en la guía. Buen soporte de despliegue en Vercel. | Decidida |
| D-002 | **API:** Node.js con Express y TypeScript, desplegada en Render. | Definido en la guía. Separa el acceso a datos del navegador. | Decidida |
| D-003 | **Base de datos:** PostgreSQL en Supabase. | Definido en la guía. Transacciones, restricciones y funciones RPC. | Decidida |
| D-004 | El navegador **nunca** accede a Supabase. La API usa `service_role`, guardada solo en Render. Todas las tablas con RLS y sin políticas para `anon`/`authenticated`. | Evita exponer datos o claves privilegiadas. Ya implementado y probado en el esquema. | Decidida |
| D-005 | Las operaciones con varias escrituras (entradas, ajustes, ventas, correcciones, anulaciones) viven en **funciones RPC de Postgres**; la API valida y autentica, pero no duplica esa lógica. | Atomicidad (nada queda a medias), una sola fuente de verdad y menos viajes de red. Recomendado por la guía (Fases 7–9). | Decidida |
| D-006 | El **stock se calcula** siempre como la suma de `movimientos_inventario`; no existe columna editable de stock. | Auditable y sin posibilidad de desajuste. | Decidida |
| D-007 | **Historial inmutable:** no se borran ni editan ventas, ítems, ajustes ni movimientos; se corrige con movimientos compensatorios. Los productos con movimientos se desactivan, no se borran. | Trazabilidad. Aplicado con triggers. | Decidida |
| D-008 | **Autenticación:** contraseña única compartida validada en el servidor, sesión firmada de 30 días en cookie `HttpOnly`, `Secure` en producción. Sin tabla de usuarios. | Alcance de la primera versión (guía, Fase 4). | Decidida (detalle de cookies: ver P-001) |
| D-009 | **Zona horaria del negocio:** `America/Bogota`. Las fechas de venta no pueden ser futuras según esa zona. | El `CURRENT_DATE` de Supabase es UTC: después de las 7 p. m. ya sería "mañana". | Decidida |
| D-010 | **Stock insuficiente:** no se bloquea; se advierte y se pide confirmación. La base lanza el error `FH001` con el detalle y la operación se repite con confirmación. | Regla de la guía; la ferretería puede vender antes de registrar la entrada. | Decidida |
| D-011 | **Idempotencia:** las operaciones de registro reciben una clave única generada por el frontend, para que un reintento no duplique. | Dobles clics y fallos de red. | Decidida |
| D-012 | **Entornos separados** de desarrollo y producción (proyectos distintos de Supabase, Render y Vercel). | Probar sin riesgo para los datos reales. | Decidida |
| D-013 | Los cambios de esquema van en **migraciones versionadas** (`supabase/migrations/AAAAMMDDHHMMSS_descripcion.sql`). Una migración ya aplicada no se edita. | Historial claro y repetible. | Decidida |

## Propuestas (confirmar antes de la Fase 2)

| ID | Propuesta | Motivo | Alternativa |
|---|---|---|---|
| D-014 | **Gestor de paquetes: npm** con *workspaces* (`apps/web`, `apps/api`) en un solo repositorio. | La guía ya habla de npm; es lo que viene con Node y evita instalar herramientas extra. | pnpm (más rápido y eficiente en disco, pero una herramienta más). |
| D-015 | **Node.js:** versión LTS vigente, fijada en un archivo `.nvmrc` y en el campo `engines` de `package.json`. | Mismas versiones en tu equipo, Render y Vercel. | — |
| D-016 | **Pruebas:** Vitest para API y frontend; Supertest para los endpoints; Testing Library para componentes; las pruebas de base de datos son los scripts SQL de `supabase/tests/`. Pruebas de extremo a extremo (Playwright) se evalúan en la Fase 13. | Un solo ejecutor de pruebas en TypeScript, rápido y con poca configuración. | Jest. |
| D-017 | **Migraciones en desarrollo:** aplicarlas por el SQL Editor de Supabase mientras el proyecto sea pequeño; evaluar la CLI de Supabase más adelante. | Menos configuración al inicio. | Supabase CLI desde el principio (más repetible). |

## Pendientes por decidir

| ID | Tema | Se decide en | Nota |
|---|---|---|---|
| P-001 | **Cookies entre dominios distintos.** El frontend (Vercel) y la API (Render) quedan en dominios diferentes, así que la cookie sería de "terceros": requiere `SameSite=None; Secure` y los navegadores pueden bloquearla. | Fase 4 | Opciones: (a) que Next.js reenvíe las llamadas a la API con *rewrites*, para que el navegador solo hable con un dominio (lo más robusto); (b) usar un dominio propio con subdominios para web y API. |
| P-002 | **Quién puede confirmar una venta con stock insuficiente** y si hay un límite. | Fase 8 | Hoy cualquiera con la contraseña puede confirmar. |
| P-003 | **Validación de `unidades.fraccionable`** (en la base de datos o en la API). | Fase 6 | Hoy es informativo. |
| P-004 | **Costo para la ganancia estimada:** costo de compra vigente al vender (hoy) o costo promedio. | Fase 11 | Debe quedar documentada la metodología. |
| P-005 | **Respaldos y recuperación** de Supabase y de la versión desplegada. | Fase 14 | Depende del plan de Supabase. |
| P-006 | **Plan de Render y arranque en frío.** En planes gratuitos el servicio se duerme y la primera petición tarda. | Fase 14 | Medir y decidir si es aceptable. |
