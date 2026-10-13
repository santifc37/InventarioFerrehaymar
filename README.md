# Ferretería — Sistema de gestión de inventario

## 1. Propósito y objetivo

Aplicación web **privada** para administrar una ferretería física.

El vendedor atiende normalmente a sus clientes y **registra las ventas posteriormente** (no es un punto de venta en tiempo real).

**Objetivo principal:** permitir al propietario o vendedor gestionar el inventario, registrar movimientos y consultar información útil para el día a día, dejando trazabilidad de todos los cambios.

## 2. Alcance inicial

La aplicación debe permitir:

- Administrar **productos**, **categorías** y **existencias**.
- Registrar **ventas individuales** al finalizar el día.
- **Corregir ventas** previamente registradas, conservando la **trazabilidad** de los cambios.
- Registrar **entradas de mercancía** y **ajustes de inventario**.
- Trabajar con **unidades, medidas, fracciones y conversiones** entre ellas.
- Consultar un **dashboard** con ventas, inventario y estadísticas básicas.
- **Importar y exportar** información en formato CSV.
- Acceder mediante una **contraseña compartida única**, sin cuentas individuales de usuario.

### Fuera de alcance (no se implementa en esta fase)

Queda explícitamente fuera de alcance: facturación electrónica, impresión de facturas, lectores físicos de códigos de barras, cuentas por cobrar, seguimiento de gastos, gestión de proveedores u otras funcionalidades no listadas arriba.

## 3. Principios de desarrollo

- **Arquitectura modular, mantenible y escalable.** Debe poder crecer sin reconstruirse desde cero.
- **Trabajar por fases completas.** Cada fase debe estar verificada, probada y documentada antes de avanzar.
- **Probar antes de afirmar.** No se afirma que algo funciona hasta haberlo verificado con pruebas reales.
- **Simple y legible.** Código sencillo, apropiado para una aplicación pequeña con potencial de crecer.
- **Trazabilidad y consistencia.** Los movimientos de inventario deben dejar registro. Las correcciones nunca borran el historial.
- **No inventar recursos.** No se inventan credenciales, dominios, proyectos, IDs ni resultados de despliegue.
- **Seguridad por diseño.** No mostrar secretos en logs, código, respuestas o informes.
- **Autonomía responsable.** Se puede implementar y preparar lo necesario dentro del alcance. Las operaciones **destructivas o irreversibles** requieren autorización explícita.

## 4. Arquitectura e infraestructura

La aplicación se divide en tres componentes bien separados:

| Componente | Servicio | Responsabilidad |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com/) | Interfaz web, navegación y experiencia de usuario. |
| **Backend (API)** | [Render](https://render.com/) | Lógica de negocio, validaciones, reglas de inventario y autenticación. |
| **Base de datos** | [Supabase](https://supabase.com/) | PostgreSQL, persistencia y consistencia de datos. |

## 5. Modelo de datos (bases)

Entidades principales necesarias para cubrir el alcance:

| Entidad | Propósito |
|---|---|
| **Categorías** | Agrupación de productos. |
| **Productos** | Catálogo con SKU/código, descripción, categoría, unidad base y posibles unidades de conversión. |
| **Unidades y conversiones** | Soportan medidas, fracciones y equivalencias entre unidades (p.ej. bolsa × unidad, rollo × metro). |
| **Movimientos de inventario** | Registro inmutable de entradas, ajustes, ventas y correcciones (garantiza trazabilidad). |
| **Ventas** | Registro de ventas individuales con sus ítems, fecha/hora y estado. Permite correcciones con historial asociado. |
| **Ajustes/Entradas** | Justificación obligatoria para cambios manuales de stock. |

## 6. Reglas de negocio clave

- **Stock siempre derivado de movimientos.** El inventario no se modifica directamente sobre el producto, sino a través de movimientos registrados (fuente única de verdad).
- **Correcciones con trazabilidad.** Al corregir una venta, se registra el cambio y se mantiene el historial original. Nunca se elimina una venta.
- **Entradas y ajustes requieren justificación.** Para mantener la integridad del inventario.
- **Acceso único y compartido.** Autenticación con **una sola contraseña compartida**. No existen cuentas individuales de usuario.
- **Aplicación privada.** Solo accesible para quien conoce la contraseña compartida.

## 7. Flujo de trabajo

1. **Inspeccionar primero.** Revisar entorno, recursos existentes, permisos y herramientas disponibles antes de crear o modificar.
2. **Trabajar por fases.** Completar, probar, verificar y documentar cada fase antes de pasar a la siguiente.
3. **Verificar lo desplegado.** No se asume despliegue hasta comprobar URLs, respuestas reales y funcionamiento.
4. **Implementar lo necesario.** Desarrollar funcionalmente (no solo maquetas). Las operaciones deben **persistir en base de datos** y cumplir reglas de negocio.

## 8. Estado inicial


El repositorio ya contiene este README y estructura base (`.agents`, `.atl`, `skills-lock.json`). A partir de aquí partimos **solo con las bases** para construir fase a fase, sin asumir código previo de la aplicación.



### Monorepo y despliegue centralizado

Todo el proyecto debe mantenerse en un único repositorio Git y una carpeta raíz. Organiza el frontend, el backend y los recursos de base de datos en directorios separados, con configuraciones independientes.

OpenCode debe poder trabajar desde la raíz del repositorio y disponer de instrucciones y scripts documentados para:

1. Instalar las dependencias y ejecutar localmente el frontend y el backend.
2. Ejecutar las pruebas de cada componente y las pruebas de integración.
3. Validar las migraciones de Supabase antes de aplicarlas.
4. Desplegar el frontend en Vercel y el backend en Render.
5. Aplicar las migraciones de Supabase mediante las herramientas oficiales disponibles.
6. Verificar el resultado de cada despliegue y comprobar que los servicios se comunican correctamente.

Usa las integraciones MCP existentes cuando sean apropiadas y, en su defecto, las CLI oficiales. No des por hecho que un MCP tiene permisos de escritura ni que un despliegue terminó correctamente sin verificarlo.

Documenta los comandos para desarrollo, pruebas y despliegue, así como las variables de entorno necesarias para cada servicio. Mantén las credenciales fuera del repositorio y separa claramente desarrollo y producción.

Los despliegues de producción deben requerir confirmación antes de ejecutar cambios destructivos o migraciones que puedan comprometer datos existentes. El proceso debe ser reproducible y permitir identificar qué versión está desplegada en cada servicio.


