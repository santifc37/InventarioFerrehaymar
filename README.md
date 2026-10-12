# README.md — Proyecto de gestión de inventario para ferretería

## 1. Rol y objetivo del proyecto

Actúa como **desarrollador principal, arquitecto de software y responsable de calidad** de una aplicación web para administrar una ferretería física.

Tu misión es desarrollar una aplicación funcional desde cero, con una arquitectura segura, mantenible y escalable, y dejarla probada, desplegada y documentada.

Debes trabajar por fases, verificar los resultados de cada fase y mantener el proyecto coherente de principio a fin.

**No te limites a proponer código o instrucciones: realiza el trabajo que permitan las herramientas y los permisos disponibles.** Si una operación requiere intervención humana, autorización o una credencial que no está disponible, explica exactamente qué falta y deja preparado todo lo que sí puedas completar.

### Objetivo principal

Crear una aplicación web privada para que el propietario o vendedor de una ferretería pueda:

* Administrar productos, categorías y existencias.
* Registrar ventas individuales al finalizar el día.
* Corregir ventas previamente registradas conservando la trazabilidad.
* Registrar entradas de mercancía y ajustes de inventario.
* Trabajar con unidades, medidas, fracciones y conversiones.
* Consultar un dashboard con ventas, inventario y estadísticas.
* Importar y exportar información mediante CSV.
* Acceder mediante una contraseña compartida, sin cuentas individuales de usuario.

La aplicación no es un punto de venta en tiempo real. El vendedor atiende normalmente a sus clientes y registra las ventas posteriormente.

El proyecto debe quedar preparado para añadir funcionalidades en el futuro sin tener que reconstruir toda la arquitectura. No implementes funciones futuras que no estén dentro del alcance inicial.

---

## 2. Reglas generales de trabajo

1. Inspecciona primero el entorno, los repositorios, los servicios conectados, los dominios, las variables de configuración disponibles y los permisos de las herramientas MCP.
2. No presupongas que ya existe una aplicación, una base de datos de inventario o un esquema que debas reutilizar. El inventario se desarrollará desde cero.
3. No inventes credenciales, nombres de proyectos, dominios, identificadores de recursos ni resultados de despliegue.
4. No muestres secretos en el código, los registros, las capturas, los informes ni las respuestas.
5. Utiliza los servicios y herramientas que ya están conectados cuando sea apropiado. No solicites nuevamente una conexión que ya funciona.
6. Si un recurso necesario no existe, créalo cuando los permisos y las autorizaciones lo permitan.
7. Si existe un recurso ajeno al proyecto, no lo modifiques sin comprender su propósito y confirmar que el cambio es seguro.
8. Trabaja por fases completas, con pruebas y documentación antes de avanzar.
9. No afirmes que una funcionalidad funciona hasta haberla probado.
10. No afirmes que el proyecto está desplegado hasta verificar las URL, las respuestas del servicio y el funcionamiento real.
11. Mantén el código sencillo, modular, legible y apropiado para una aplicación pequeña que pueda crecer.
12. OpenCode puede decidir detalles técnicos y visuales menores sin pedir autorización constantemente. Si una decisión cambia el alcance, el modelo de seguridad, el costo operativo o el comportamiento del negocio, documenta el impacto y solicita confirmación cuando sea necesario.
13. No agregues facturación electrónica, impresión de facturas, lectores físicos de códigos de barras, cuentas por cobrar, seguimiento de gastos, gestión de proveedores ni otras funciones fuera del alcance inicial.
14. No entregues solamente una maqueta visual: las operaciones deben persistir en la base de datos y respetar las reglas de negocio.
15. Si detectas contradicciones entre las decisiones del proyecto, aplica las resoluciones indicadas en este documento.

### Autonomía y operaciones destructivas

Puedes crear archivos, implementar funciones, ejecutar pruebas, preparar esquemas, realizar migraciones aditivas y configurar servicios dentro del alcance autorizado.

Sin embargo, debes solicitar autorización explícita antes de:

* Eliminar o vaciar tablas o registros de producción.
* Ejecutar operaciones destructivas o irreversibles sobre Supabase, Vercel o Render.
* Reemplazar un recurso existente que pueda pertenecer a otro proyecto.
* Eliminar datos, claves, dominios o configuraciones que puedan afectar otros servicios.
* Ejecutar migraciones destructivas en producción.
* Restablecer credenciales compartidas o cambiar configuraciones que puedan bloquear el acceso.
* Realizar operaciones cuyo costo, impacto o alcance no estén claros.

No confundas tener acceso MCP con tener autorización para destruir o reemplazar recursos.

---

## 3. Infraestructura y arquitectura

La infraestructura prevista utiliza tres servicios:

| Componente    | Servicio | Responsabilidad                                      |
| ------------- | -------- | ---------------------------------------------------- |
| Frontend      | Vercel   | Interfaz web, navegación y experiencia de usuario    |
| Backend       | Render   | API, autenticación, autorización y lógica de negocio |
| Base de datos | Supabase | PostgreSQL y persistencia de la aplicación           |

### 3.1. Inspección inicial

Antes de crear o modificar recursos:

* Verifica qué proyectos de Vercel, Render y Supabase están disponibles.
* Comprueba los permisos efectivos de los MCP.
* Identifica los repositorios y la estructura de archivos existente, si los hay.
* Detecta los dominios configurados y las posibilidades de comunicación entre frontend y backend.
* Comprueba las variables de entorno existentes sin revelar sus valores.
* Determina qué recursos están relacionados con este proyecto y cuáles no.
* Verifica si existe una base de datos dedicada para el proyecto.

El resultado de esta inspección debe documentarse. No es necesario detenerse para preguntarme por cada detalle que puedas averiguar de forma segura.

### 3.2. Arquitectura obligatoria

El frontend no debe conectarse directamente a Supabase para ejecutar operaciones de negocio.

Las operaciones de la aplicación deben seguir este flujo:

**Frontend en Vercel → API en Render → PostgreSQL en Supabase.**

Render será responsable de:

* Validar la sesión y los permisos de acceso.
* Validar y normalizar las entradas recibidas.
* Aplicar las reglas de negocio.
* Gestionar transacciones de ventas e inventario.
* Consultar y modificar los datos de Supabase.
* Evitar inconsistencias y operaciones no autorizadas.

Supabase será responsable de la persistencia relacional y de las restricciones de integridad correspondientes.

Vercel será responsable de servir la aplicación y, si resulta necesario para la sesión segura, de actuar como proxy de las peticiones del navegador hacia Render.

### 3.3. Tecnologías

Inspecciona el entorno y utiliza una combinación compatible y mantenible de tecnologías.

Preferencias:

* Frontend web moderno con componentes reutilizables.
* TypeScript si es compatible con la estructura seleccionada.
* API backend en Render.
* PostgreSQL en Supabase.
* Consultas parametrizadas y transacciones.
* Validación de datos tanto en el frontend como en el backend.
* Pruebas automatizadas de lógica de negocio y de API.

No introduzcas frameworks, bibliotecas o servicios adicionales innecesarios. No cambies la arquitectura de tres servicios sin una justificación técnica clara.

### 3.4. Ambientes separados

Mantén separados desarrollo y producción.

* Utiliza recursos de desarrollo para pruebas y datos ficticios.
* No ejecutes pruebas destructivas sobre datos de producción.
* Separa las variables y credenciales de ambos ambientes.
* Documenta cómo ejecutar la aplicación localmente.
* Documenta cómo promover cambios a producción.
* Comprueba qué ambiente está seleccionado antes de ejecutar migraciones o cambios de configuración.

Si los servicios conectados no permiten crear inmediatamente una separación completa, documenta la limitación y no simules que los ambientes están aislados.

---

## 4. Alcance funcional de la primera versión

La primera versión incluye:

1. Login y seguridad.
2. Dashboard general.
3. Gestión completa de inventario.
4. Gestión de categorías.
5. Registro de ventas individuales.
6. Corrección de ventas con trazabilidad.
7. Registro de entradas de mercancía.
8. Ajustes de inventario.
9. Unidades y conversiones.
10. Estadísticas y comparación de períodos.
11. Importación de productos mediante CSV.
12. Exportación de datos mediante CSV.
13. Documentación de instalación, configuración y despliegue.

La gestión de proveedores queda para una fase futura.

No se requiere un sistema de usuarios múltiples, roles, facturación electrónica, pagos integrados, impresión de facturas ni operación de caja en tiempo real.

---

## 5. Interfaz y experiencia de usuario

### 5.1. Estilo visual

La interfaz debe ser:

* Moderna, limpia y profesional.
* De tema claro.
* Diseñada principalmente para computadora de escritorio.
* Fácil de utilizar por una persona sin conocimientos técnicos.
* En español de Colombia.
* Con precios expresados en pesos colombianos (COP).

Utiliza un menú sencillo, jerarquía visual clara, formularios comprensibles y tablas legibles.

Evita animaciones excesivas, elementos decorativos innecesarios, paneles saturados y pantallas que requieran demasiados clics para las tareas habituales.

No necesitas pedir autorización para elegir colores secundarios, espaciados, iconos o componentes visuales menores. Mantén consistencia en toda la aplicación.

### 5.2. Navegación

Como mínimo, incluye estas secciones:

* Resumen.
* Inventario.
* Ventas.
* Entradas y ajustes.
* Categorías.
* Importar y exportar.
* Configuración básica, cuando sea necesaria.

### 5.3. Tablas

Las tablas deben admitir, cuando corresponda:

* Paginación.
* Búsqueda.
* Filtros.
* Ordenamiento por columnas.
* Acciones rápidas.
* Indicadores de estado.
* Confirmación de acciones importantes.
* Estados vacíos claros.
* Indicadores de carga y mensajes de error.

Evita confirmar acciones rutinarias de bajo riesgo. Solicita confirmación para acciones que puedan alterar datos importantes.

### 5.4. Moneda y números

* Mostrar importes en COP.
* Utilizar el formato numérico apropiado para Colombia.
* No usar números de punto flotante binario para calcular dinero.
* Utilizar tipos decimales exactos en la base de datos y una estrategia coherente en el backend.
* Mostrar las cantidades con la precisión adecuada a la unidad del producto.

---

## 6. Autenticación mediante contraseña única

La aplicación tendrá una sola contraseña compartida para entrar. No debe existir un sistema de registro de usuarios, una tabla de usuarios ni un flujo de recuperación de cuentas individuales.

### 6.1. Variables de entorno

Utiliza variables de entorno en Render para los secretos de autenticación, por ejemplo:

* `CONTRASENA_APP`
* `CLAVE_SECRETA`

Estos nombres son orientativos; si eliges otros, actualiza toda la documentación de forma coherente.

Reglas:

* Nunca escribas la contraseña real en el código.
* Nunca incluyas secretos en Git.
* Nunca envíes la contraseña al frontend como parte de una configuración pública.
* Nunca devuelvas la contraseña ni la clave de firma desde la API.
* No imprimas valores secretos en logs.
* No inventes valores reales para las variables.
* Proporciona ejemplos únicamente con valores ficticios y claramente identificados como tales.

Si una variable imprescindible no está configurada, la aplicación debe mostrar un error de configuración seguro en los registros del servidor y no habilitar una autenticación ficticia.

### 6.2. Inicio de sesión

La pantalla de login debe incluir un campo de contraseña y un botón de acceso.

Comportamiento:

1. El usuario introduce la contraseña.
2. Puede pulsar el botón o la tecla Enter para enviar el formulario.
3. El backend compara la contraseña recibida con la configurada en el entorno.
4. Si es válida, crea una sesión firmada o un mecanismo equivalente de sesión segura.
5. Si es inválida, devuelve una respuesta genérica de autenticación fallida.
6. El frontend muestra un mensaje visual de error en rojo durante aproximadamente medio segundo y limpia el campo de contraseña.
7. El error no debe revelar si falló una variable concreta, una firma o alguna otra parte interna del servidor.

Añade limitación de intentos y medidas razonables contra ataques de fuerza bruta. No bloquees permanentemente el acceso por errores triviales.

### 6.3. Resolución de seguridad: cookie accesible desde JavaScript

En la definición inicial se indicó preferencia por una cookie accesible desde JavaScript. Sin embargo, esta preferencia entra en conflicto con el objetivo de reforzar la seguridad: una cookie legible por JavaScript puede ser robada si existe una vulnerabilidad XSS.

**Resolución prioritaria: utiliza una cookie de sesión `HttpOnly`, `Secure` y con una política `SameSite` adecuada.** No guardes el token de sesión en `localStorage` ni lo expongas al código de la interfaz.

Para cumplir el requisito de seguridad:

* La cookie debe tener `HttpOnly`.
* Debe utilizar `Secure` en producción.
* Debe tener una política `SameSite` coherente con el despliegue.
* Debe limitarse a la ruta necesaria.
* Debe tener expiración explícita.
* Debe invalidarse al cerrar sesión.
* El backend debe comprobar la sesión en todas las operaciones protegidas.
* Las peticiones que modifican datos deben tener protección adecuada contra CSRF.
* Los errores de autenticación no deben revelar información sensible.

### 6.4. Compatibilidad entre Vercel y Render

No presupongas que una cookie de Render se comportará como una cookie de Vercel. Son dominios potencialmente distintos y los navegadores pueden bloquear cookies de terceros.

Antes de implementar la sesión, inspecciona los dominios y el mecanismo real de despliegue.

Prioriza, si resulta compatible con la infraestructura disponible, un proxy o rewrite de Vercel para enviar las peticiones `/api/*` a Render. Esto permite que el navegador interactúe con un origen propio y facilita el uso de una cookie `HttpOnly` sin exponerla al frontend.

Si se utiliza este enfoque:

* Configura correctamente el destino del proxy.
* Comprueba cómo se procesan `Set-Cookie` y las cabeceras de respuesta.
* Evita exponer accidentalmente cabeceras o credenciales internas.
* Asegúrate de que Render recibe y valida la cookie en las peticiones posteriores.
* Verifica que la URL pública de la API no permite saltarse la autenticación.

Si se requiere una arquitectura distinta, explica la limitación de los dominios y elige la alternativa segura que realmente funcione. No afirmes que la sesión es segura hasta haberla probado en un navegador real.

Si técnicamente no puede cumplirse la sesión segura con la infraestructura disponible, documenta el bloqueo y solicita confirmación antes de degradar la seguridad a una cookie legible por JavaScript.

### 6.5. Duración de la sesión

La sesión debe durar **30 días**, salvo que se establezca una duración menor por razones técnicas o de seguridad debidamente justificadas.

La duración debe aplicarse de forma coherente en el mecanismo de sesión del servidor y en la cookie.

### 6.6. Verificación y cierre de sesión

Implementa un endpoint de verificación de sesión, por ejemplo `GET /api/auth/verify`.

Al abrir la aplicación:

* Comprueba si existe una sesión válida.
* Si es válida, permite acceder al contenido protegido.
* Si no es válida, redirige al login.
* El backend debe seguir verificando la sesión en cada operación protegida; una comprobación inicial en el frontend no es suficiente.

Implementa también un endpoint de cierre de sesión que invalide la sesión y elimine la cookie.

### 6.7. CORS, CSRF y cabeceras

* No consideres CORS un mecanismo de autenticación.
* Si el navegador necesita comunicarse directamente con Render, permite únicamente los orígenes necesarios y utiliza credenciales de forma explícita.
* No utilices comodines de origen con credenciales.
* Si se usa un proxy de mismo origen, evita configuraciones CORS innecesarias.
* Protege las operaciones que modifican datos contra CSRF.
* Añade cabeceras de seguridad apropiadas.
* Valida los datos en el servidor, incluso cuando el frontend ya los valide.

---

## 7. Modelo de datos de Supabase

Crea un esquema relacional adecuado para PostgreSQL. El diseño definitivo debe documentarse mediante SQL versionado o migraciones reproducibles.

No asumas que las tablas existen. Crea el esquema necesario en el recurso de base de datos correcto y verifica el resultado.

Los siguientes nombres son una propuesta de referencia; puedes ajustarlos si mantienes las relaciones y reglas de negocio.

### 7.1. Tabla `categories`

Campos mínimos:

* `id`: clave primaria.
* `nombre`: nombre de la categoría.
* `descripcion`: opcional.
* `created_at`: fecha de creación.
* `updated_at`: última modificación.

Evita duplicados accidentales de nombres de categorías normalizando la comparación de texto.

### 7.2. Tabla `products`

Campos mínimos:

* `id`: clave primaria.
* `nombre`: nombre del producto.
* `sku`: código interno, opcional según las necesidades del negocio.
* `barcode`: código de barras, opcional.
* `descripcion`: opcional.
* `category_id`: relación con categorías, cuando corresponda.
* `purchase_price`: costo de compra actual por unidad base.
* `sale_price`: precio de venta predeterminado por unidad base.
* `stock_quantity`: existencia actual en unidad base.
* `minimum_stock`: umbral de stock bajo configurable.
* `base_unit`: unidad base del producto.
* `is_active`: indica si el producto se encuentra disponible.
* `created_at`.
* `updated_at`.

Los importes deben utilizar tipos decimales exactos. La cantidad y el stock mínimo deben admitir hasta tres decimales.

No uses imágenes, fechas de vencimiento, ubicaciones físicas ni campos de proveedores en la primera versión.

### 7.3. Tabla `sales`

Representa una venta registrada por el usuario.

Campos mínimos:

* `id`: clave primaria.
* `sale_date`: fecha comercial de la venta.
* `registered_at`: fecha y hora reales de registro.
* `updated_at`: última modificación.
* `status`: estado de la venta, por ejemplo activa o anulada.
* `notes`: opcional.
* `total_amount`: total de la venta.
* `created_at`.

La fecha de la venta y la fecha de registro deben mantenerse separadas.

No sustituyas la fecha original por la fecha de corrección cuando una venta se modifica.

### 7.4. Tabla `sale_items`

Representa los productos y cantidades de cada venta.

Campos mínimos:

* `id`: clave primaria.
* `sale_id`: relación con `sales`.
* `product_id`: relación con `products`.
* `quantity`: cantidad expresada en unidad base.
* `unit_price_at_sale`: precio aplicado por unidad base en esa venta.
* `unit_cost_at_sale`: costo de referencia guardado en el momento de la venta.
* `line_total`: importe total de la línea.
* Campos adicionales para la presentación o unidad introducida por el usuario, si son necesarios para reconstruir correctamente la venta.

El detalle debe conservar el precio y el costo aplicados en la operación original. No calcules los importes históricos leyendo únicamente el precio o costo actual del producto.

### 7.5. Tabla `stock_movements`

Registra los cambios de inventario necesarios para garantizar trazabilidad.

Campos mínimos:

* `id`: clave primaria.
* `product_id`: producto afectado.
* `movement_type`: entrada, venta, ajuste, corrección, reversión u otro tipo justificado.
* `quantity_delta`: variación del stock en unidad base, con signo.
* `reason`: motivo del movimiento.
* `reference_type`: tipo de entidad relacionada, cuando corresponda.
* `reference_id`: identificador de la entidad relacionada, cuando corresponda.
* `created_at`: fecha y hora del movimiento.
* `notes`: opcional.

Esta tabla es un registro interno de auditoría. No es necesario construir una pantalla compleja de historial de movimientos en la primera versión.

Los movimientos deben generarse dentro de la misma transacción que modifica el stock.

### 7.6. Tabla `sale_corrections` o mecanismo equivalente de auditoría

Conserva el registro de las correcciones de ventas.

Debe permitir identificar:

* La venta corregida.
* La fecha y hora de la corrección.
* Los valores anteriores relevantes.
* Los valores nuevos.
* El motivo de la corrección, cuando sea proporcionado.
* Los cambios de stock derivados de la corrección.

Puedes utilizar una tabla de auditoría específica o un mecanismo equivalente bien diseñado. No permitas que una corrección sobrescriba silenciosamente los valores anteriores.

### 7.7. Tablas de unidades y conversiones

Implementa el modelo mínimo necesario para admitir unidades y presentaciones comerciales.

Puedes utilizar una tabla de conversiones por producto o una estructura equivalente.

Cada presentación debe definir una relación inequívoca entre la cantidad introducida por el usuario y la cantidad en unidad base.

Ejemplos:

* Una caja contiene 100 tornillos.
* Un metro representa una unidad base de longitud.
* Un kilogramo representa una unidad base de masa.
* Un litro representa una unidad base de volumen.

La conversión debe definirse para cada producto cuando sea necesario. No asumas que todas las cajas contienen lo mismo ni que las unidades de diferentes dimensiones se pueden convertir entre sí.

Si un producto se compra por caja y se vende por unidad, conserva el inventario en la unidad base seleccionada y realiza la conversión antes de actualizar las existencias.

### 7.8. Integridad relacional

Define:

* Claves primarias.
* Claves foráneas.
* Restricciones `CHECK`.
* Índices para búsquedas frecuentes.
* Restricciones de unicidad cuando sean compatibles con las reglas del negocio.
* Tipos decimales apropiados.
* Valores predeterminados razonables.
* Fechas de creación y modificación.
* Reglas de eliminación que preserven las relaciones históricas.

No permitas cantidades, precios o costos negativos por errores de entrada. La existencia puede ser negativa únicamente porque el negocio permite confirmar una venta con stock insuficiente.

---

## 8. Unidades, fracciones y conversiones

Cada producto tendrá una unidad base configurable.

Ejemplos de unidades:

* Unidad.
* Metro.
* Kilogramo.
* Litro.
* Otras unidades de medida compatibles con el producto.

La aplicación debe permitir cantidades con hasta tres decimales.

### Reglas

1. El inventario se almacena en la unidad base del producto.
2. Las ventas y entradas pueden introducirse en una presentación compatible.
3. Convierte la cantidad a la unidad base antes de actualizar el stock.
4. No redondees prematuramente los cálculos.
5. Valida que la conversión sea positiva y válida.
6. Impide aplicar conversiones de dimensiones incompatibles.
7. Conserva suficiente información para explicar qué cantidad comercial se introdujo y cómo se convirtió.
8. No cambies retroactivamente conversiones históricas de manera que alteren ventas anteriores.

Ejemplo: si una caja contiene 100 tornillos, vender 3 cajas debe descontar 300 unidades base.

Si el usuario introduce una cantidad que no puede representarse de manera válida con la precisión configurada, muestra un error comprensible en vez de redondearla silenciosamente.

---

## 9. Gestión de productos

### 9.1. Crear y editar

Permite crear productos con:

* Nombre.
* SKU.
* Código de barras.
* Precio de compra.
* Precio de venta.
* Cantidad inicial.
* Descripción.
* Categoría.
* Unidad base.
* Stock mínimo.
* Conversiones comerciales, cuando correspondan.

Los campos obligatorios deben estar claramente indicados.

El usuario debe poder editar los datos y los precios actuales del producto sin alterar automáticamente los valores históricos de las ventas anteriores.

### 9.2. Búsqueda

La búsqueda debe admitir:

* Nombre.
* Código de barras.
* SKU.
* Categoría.

Incluye filtros, paginación, ordenamiento y acciones rápidas.

Optimiza las búsquedas habituales con índices adecuados.

### 9.3. Duplicados

La preferencia es advertir y permitir revisar los posibles duplicados.

Cuando se introduzca un SKU o código de barras existente:

* Muestra una advertencia clara.
* Permite revisar el producto coincidente.
* Evita crear duplicados accidentales.
* Si se permite continuar con un duplicado intencional, debe quedar claro que puede generar ambigüedades en búsquedas y operaciones.

No impongas una restricción de unicidad sin evaluar primero la regla elegida. Si se decide permitir duplicados intencionales, diseña las búsquedas y los flujos de selección para resolver las coincidencias de forma explícita.

### 9.4. Eliminación

No elimines físicamente productos que tengan ventas o movimientos asociados.

Para estos productos, utiliza desactivación o archivado.

Los productos sin historial pueden eliminarse con confirmación cuando sea seguro y no existan referencias dependientes.

Las categorías utilizadas por productos deben protegerse frente a eliminaciones que dejen relaciones inválidas.

---

## 10. Inventario y existencias

La pantalla principal de inventario será una tabla de productos.

Debe mostrar, como mínimo:

* Nombre.
* SKU.
* Código de barras.
* Categoría.
* Stock actual.
* Unidad base.
* Stock mínimo.
* Precio de compra actual.
* Precio de venta actual.
* Estado de stock.

### 10.1. Estados de stock

Diferencia claramente:

* Stock normal.
* Stock bajo: la existencia está por debajo del umbral configurado.
* Agotado: la existencia es igual a cero.
* Stock negativo: se han confirmado salidas superiores a las existencias disponibles.

Define el tratamiento del umbral de forma consistente. Una regla inicial razonable es considerar stock bajo cuando la existencia es mayor que cero y menor o igual al mínimo configurado.

Los productos con stock negativo deben ser visibles y aparecer en los indicadores pertinentes.

### 10.2. Valor del inventario

El valor del inventario debe calcularse utilizando el costo de compra actual:

`Valor del inventario = suma de (stock actual × costo actual por unidad base)`

Incluye los productos con stock positivo y documenta el tratamiento de cantidades negativas. No confundas el valor del inventario a costo con su valor potencial de venta.

### 10.3. Registro de entradas

Permite registrar la llegada de mercancía.

El formulario debe incluir:

* Producto.
* Cantidad.
* Presentación o unidad, cuando corresponda.
* Conversión a unidad base.
* Costo unitario actualizado, si se desea cambiar.
* Fecha de entrada.
* Notas opcionales.

Al confirmar:

* Valida los datos.
* Convierte la cantidad a unidad base.
* Actualiza las existencias.
* Registra el movimiento.
* Actualiza el costo actual solo cuando el usuario haya indicado un cambio válido.
* Guarda los cambios en una transacción.

No sobrescribas el costo histórico de ventas anteriores al actualizar el costo del producto.

### 10.4. Ajustes de stock

Permite registrar ajustes por pérdida, daño, diferencias de inventario u otros motivos.

Cada ajuste debe incluir:

* Producto.
* Variación de stock.
* Motivo.
* Fecha y hora.
* Nota opcional.

El ajuste debe quedar registrado y generar el movimiento correspondiente.

No permitas modificar el stock de manera silenciosa desde una edición genérica del producto. Si se modifica la cantidad inicial o la existencia mediante una acción especial, debe registrarse como un movimiento.

---

## 11. Registro de ventas

La aplicación permite registrar ventas individuales al final del día. No debe exigir que cada venta se registre en tiempo real al atender al cliente.

### 11.1. Formulario de venta

Crea una interfaz rápida con:

* Búsqueda de productos.
* Selección de productos.
* Cantidad por línea.
* Unidad o presentación comercial.
* Precio de venta aplicado.
* Subtotal por línea.
* Total de la venta.
* Fecha comercial de la venta.
* Notas opcionales.

El precio de venta debe tomar como valor inicial el precio actual del producto, pero el usuario puede modificarlo para esa venta.

El precio editado se aplica a esa operación y no modifica el precio predeterminado del producto.

### 11.2. Guardado de la venta

Al confirmar una venta:

1. Valida la sesión.
2. Valida todos los productos, cantidades, conversiones y precios.
3. Comprueba el estado de los productos.
4. Obtiene los valores de costo que se utilizarán como referencia.
5. Calcula los importes en el servidor.
6. Registra la venta y sus líneas.
7. Descuenta el stock en unidad base.
8. Registra los movimientos de inventario.
9. Guarda los datos históricos de precio y costo.
10. Confirma todos los cambios en una sola transacción.

No confíes en los totales enviados por el frontend. El servidor debe recalcularlos.

Evita ventas duplicadas causadas por doble clic, reintentos de red o reenvíos de una misma solicitud. Implementa un mecanismo de idempotencia o una protección equivalente cuando corresponda.

### 11.3. Stock insuficiente

La regla del negocio es **advertir y permitir confirmar**.

Cuando una venta exceda el stock disponible:

* Muestra una advertencia visible.
* Informa la existencia disponible y la cantidad solicitada.
* Permite cancelar o confirmar conscientemente.
* Si se confirma, registra la venta y permite que el stock quede negativo.

La advertencia no debe impedir el registro confirmado.

Usa transacciones y controles de concurrencia apropiados para evitar que dos operaciones simultáneas produzcan actualizaciones inconsistentes.

### 11.4. Pago y total diario

La primera versión solo necesita registrar el importe total de las ventas.

No es necesario registrar métodos de pago ni dividir las ventas entre efectivo, tarjeta, transferencias u otras formas.

El total diario debe calcularse a partir de las ventas válidas del período seleccionado, no de un número acumulado que pueda desincronizarse.

---

## 12. Corrección de ventas

Las ventas registradas pueden corregirse, pero las modificaciones deben conservar la trazabilidad.

### Reglas obligatorias

* Mantén la fecha comercial original de la venta, salvo que el usuario la corrija explícitamente.
* Guarda la fecha y hora real de la corrección.
* Conserva un registro de los valores anteriores y nuevos.
* Registra el motivo de la corrección cuando sea posible.
* Calcula el efecto de la corrección sobre el stock.
* Registra los movimientos inversos y nuevos necesarios.
* Actualiza el total de la venta de forma consistente.
* Mantén la referencia a la venta original.

Si una venta contenía 5 unidades y se corrige a 3, la aplicación debe devolver al inventario las 2 unidades correspondientes.

Si se anula una venta, revierte sus efectos sobre el stock una sola vez y conserva el registro original.

No elimines la venta original para simular una corrección.

Todas las operaciones de corrección deben ser transaccionales, idempotentes cuando proceda y protegidas contra doble ejecución.

Si una corrección histórica requiere una decisión ambigua sobre el costo aplicado, utiliza los datos guardados en la venta original y documenta el efecto contable de la corrección. No cambies silenciosamente los costos históricos.

---

## 13. Costos, precios y ganancias

Esta sección resuelve una contradicción importante de las decisiones iniciales.

Se solicitaron dos cosas distintas:

1. Guardar el precio y el costo aplicados en cada venta.
2. Calcular la ganancia utilizando el costo actual del producto.

No son equivalentes y no deben confundirse.

### 13.1. Datos históricos

En cada línea de venta guarda:

* Precio de venta aplicado.
* Costo de referencia aplicado al momento de registrar la venta.
* Cantidad vendida.
* Importe de la línea.

Estos valores son históricos y no deben modificarse automáticamente cuando se actualice el producto.

### 13.2. Ganancia estimada a costo actual

La preferencia seleccionada para los informes es utilizar el costo actual del producto para estimar la ganancia.

Fórmula:

`Ganancia estimada = importe de venta − (cantidad vendida × costo actual por unidad base)`

Para una venta con varias líneas, suma las ganancias estimadas de las líneas.

Etiqueta claramente esta métrica como **ganancia estimada a costo actual**. Si se modifica el costo de compra de un producto, esta estimación puede cambiar incluso para ventas anteriores.

### 13.3. Referencia histórica

Cuando se requiera una cifra basada en los datos registrados originalmente, utiliza el costo guardado en cada línea de venta:

`Margen bruto registrado = importe de venta − (cantidad vendida × costo guardado en la venta)`

Etiqueta esta métrica como **margen bruto con costo registrado**. No la presentes como equivalente a la estimación calculada con costos actuales.

Si resulta útil, muestra ambas métricas por separado en los informes. No sumes, mezcles ni compares sus resultados como si utilizaran el mismo método.

### 13.4. Límites de la métrica

La aplicación no incluye un sistema contable completo ni seguimiento de gastos operativos.

Por tanto:

* No denomines ganancia neta a la ganancia estimada.
* No afirmes que la métrica representa utilidad contable.
* Documenta la fórmula utilizada en cada informe.
* Excluye ventas anuladas de los totales operativos.
* Define de forma coherente el tratamiento de las correcciones.

El ranking de productos más rentables debe identificar qué fórmula utiliza.

---

## 14. Dashboard y estadísticas

El dashboard será la pantalla inicial después del login.

### 14.1. Indicadores principales

Incluye:

* Número de ventas.
* Total vendido.
* Productos con poco stock.
* Productos agotados.
* Productos más vendidos.
* Valor del inventario a costo actual.
* Comparación entre períodos.

### 14.2. Filtros de fecha

Permite consultar:

* Hoy.
* Ayer.
* Últimos 7 días.
* Rango personalizado.

Define y documenta la zona horaria utilizada para interpretar las fechas comerciales y los límites de los períodos.

Evita errores de un día por conversiones de zona horaria.

### 14.3. Rankings

Incluye:

1. Productos más vendidos por cantidad.
2. Productos más rentables según la ganancia estimada a costo actual.
3. Productos menos vendidos.

Para el ranking de menos vendidos, documenta si se muestran productos sin ventas en el período y cómo se tratan los productos inactivos.

No confundas cantidad vendida con número de transacciones.

### 14.4. Comparación entre períodos

Permite comparar períodos seleccionados utilizando indicadores comprensibles.

Cuando se muestre una variación porcentual, define el comportamiento cuando el período de referencia sea cero y evita divisiones por cero.

Los informes deben basarse en datos reales de la base de datos, no en cifras de demostración.

---

## 15. Importación y exportación CSV

### 15.1. Importación inicial

La aplicación debe permitir crear productos individualmente e importar productos mediante CSV.

Define una plantilla descargable o documentada con los campos esperados, por ejemplo:

* nombre
* sku
* barcode
* descripcion
* categoria
* purchase_price
* sale_price
* stock_quantity
* minimum_stock
* base_unit

Los campos y nombres definitivos deben coincidir con la implementación.

La importación debe:

1. Validar la estructura del archivo.
2. Validar los tipos de datos.
3. Comprobar cantidades, precios, unidades y conversiones.
4. Detectar posibles duplicados.
5. Mostrar un resumen previo de registros válidos y errores.
6. Permitir revisar los errores antes de confirmar.
7. Evitar importaciones parciales silenciosas.
8. Mostrar cuántos registros se crearon, actualizaron, omitieron o rechazaron.

No ejecutes una importación destructiva ni reemplaces todo el catálogo automáticamente.

Para archivos con errores, informa la fila y el motivo de rechazo.

No ejecutes fórmulas, macros ni contenido activo procedente de archivos importados.

### 15.2. Exportación

Incluye exportación CSV de los datos que resulte útil administrar:

* Productos.
* Categorías, si corresponde.
* Ventas y sus líneas.
* Datos de inventario necesarios para revisión.

Las exportaciones deben respetar las relaciones y conservar identificadores o referencias suficientes para comprender los datos.

No expongas secretos, tokens, variables de entorno ni información técnica sensible.

Documenta la codificación del archivo y cómo tratar caracteres especiales, comas, comillas y decimales para facilitar su uso en hojas de cálculo.

---

## 16. Seguridad de Supabase y del backend

### 16.1. Acceso a la base de datos

Las credenciales con privilegios elevados deben permanecer en el backend.

Nunca incluyas claves privadas o claves `service_role` en el código del frontend, archivos públicos, variables de entorno expuestas al navegador o repositorios.

Utiliza credenciales con los privilegios mínimos necesarios para cada operación.

### 16.2. Políticas y permisos

Audita las políticas y permisos de Supabase antes de modificarlos.

Como la aplicación se desarrolla desde cero, configura un esquema de permisos que impida el acceso público no autorizado.

No asumas que RLS está habilitado ni que las tablas están protegidas. Comprueba el estado real.

Si el backend utiliza una credencial privilegiada que evita RLS, la API debe aplicar autorización y validación en todas las rutas, y el acceso directo desde el navegador debe permanecer bloqueado.

Si habilitas RLS, implementa y verifica las políticas correspondientes. No habilites políticas genéricas que permitan a cualquiera leer o modificar las tablas.

### 16.3. Protección de la API

Todas las rutas protegidas deben:

* Verificar la sesión en el servidor.
* Validar el cuerpo, los parámetros y los identificadores.
* Rechazar tipos y formatos inválidos.
* Evitar inyección SQL mediante consultas parametrizadas.
* Limitar el tamaño de las solicitudes.
* Manejar errores sin filtrar trazas internas.
* Registrar eventos relevantes sin registrar contraseñas ni tokens.
* Aplicar controles de concurrencia en las operaciones de inventario.

### 16.4. Secretos

Documenta los nombres de las variables necesarias y dónde configurarlas, nunca sus valores reales.

Mantén los archivos de entorno locales fuera de Git.

Incluye un archivo de ejemplo con valores ficticios, si resulta útil.

Antes de finalizar:

* Revisa los archivos versionados en busca de secretos.
* Revisa las variables públicas del frontend.
* Comprueba que los logs no exponen credenciales.
* Verifica que los mensajes de error no muestran claves ni información interna sensible.

Si encuentras un secreto real expuesto, no lo reproduzcas. Informa del riesgo y solicita su rotación cuando corresponda.

---

## 17. API y contratos

Diseña endpoints coherentes y documentados. Puedes ajustar los nombres a la arquitectura elegida, pero conserva una separación clara entre autenticación, productos, ventas, movimientos y estadísticas.

Como mínimo, deben existir operaciones equivalentes a las siguientes:

### Autenticación

* `POST /api/auth/login`
* `GET /api/auth/verify`
* `POST /api/auth/logout`

### Productos

* Listar y buscar productos.
* Consultar un producto.
* Crear un producto.
* Editar un producto.
* Archivar o desactivar un producto.
* Eliminar un producto cuando sea seguro.
* Gestionar las presentaciones y conversiones.
* Consultar alertas de stock.

### Categorías

* Listar categorías.
* Crear y editar categorías.
* Proteger categorías utilizadas por productos.

### Ventas

* Listar ventas por período.
* Consultar una venta.
* Registrar una venta.
* Corregir una venta.
* Anular una venta.
* Consultar los detalles y la trazabilidad de una corrección.

### Inventario

* Registrar entradas.
* Registrar ajustes.
* Consultar existencias.
* Consultar movimientos cuando sea necesario para la lógica o la auditoría.

### Estadísticas

* Resumen del dashboard.
* Totales por período.
* Productos más vendidos.
* Productos más rentables.
* Productos menos vendidos.
* Comparación entre períodos.
* Valor actual del inventario.

### Importación y exportación

* Validar una importación CSV.
* Ejecutar una importación confirmada.
* Exportar los conjuntos de datos autorizados.

Documenta los formatos de solicitud y respuesta, los códigos HTTP y los errores esperados.

No devuelvas datos sensibles innecesarios.

---

## 18. Transacciones e integridad

Las operaciones que alteran simultáneamente varias tablas deben ser atómicas.

En particular:

* Registrar una venta y descontar stock.
* Corregir una venta y revertir o aplicar diferencias de stock.
* Anular una venta y restaurar existencias.
* Registrar una entrada y aumentar stock.
* Registrar un ajuste y cambiar stock.
* Importar registros cuando se haya elegido una operación atómica.

Si falla una parte de la operación, no deben quedar cambios parciales que corrompan el inventario.

Utiliza transacciones SQL o funciones de base de datos cuando sean apropiadas.

Evita la secuencia insegura de leer stock, calcularlo en el frontend y escribir un nuevo valor sin control de concurrencia.

Las reglas importantes deben cumplirse en el backend y, cuando corresponda, mediante restricciones de base de datos.

---

## 19. Plan de desarrollo por fases

Desarrolla el proyecto en este orden, adaptándolo solo cuando exista una razón técnica concreta.

### Fase 0 — Inspección y planificación

* Inspeccionar MCP, repositorios, servicios, dominios y permisos.
* Confirmar qué recursos pertenecen al proyecto.
* Detectar bloqueos de acceso o configuración.
* Elegir el stack compatible.
* Documentar brevemente la arquitectura propuesta.
* Identificar las variables de entorno necesarias.

**Criterio de salida:** el entorno está entendido y existe un plan de implementación sin credenciales inventadas ni modificaciones destructivas.

### Fase 1 — Base del proyecto e infraestructura

* Crear la estructura del frontend y backend.
* Configurar la comunicación entre Vercel, Render y Supabase.
* Crear el esquema de base de datos desde cero.
* Añadir SQL versionado o migraciones reproducibles.
* Configurar ambientes de desarrollo y producción.
* Preparar variables de entorno y archivos de ejemplo.
* Comprobar conectividad y permisos.

**Criterio de salida:** la aplicación puede iniciar y el backend puede comunicarse con la base de datos correcta de forma segura.

### Fase 2 — Autenticación y seguridad

* Implementar login de contraseña única.
* Implementar sesión y expiración de 30 días.
* Configurar la cookie segura.
* Implementar verificación y cierre de sesión.
* Proteger las rutas de frontend y backend.
* Configurar CSRF, CORS o proxy de mismo origen según la arquitectura.
* Probar los accesos permitidos y denegados.

**Criterio de salida:** una sesión inválida no puede acceder a datos protegidos, y la sesión funciona en el navegador del entorno desplegado.

### Fase 3 — Categorías y catálogo

* Implementar CRUD de productos y categorías.
* Implementar búsqueda, filtros, paginación y ordenamiento.
* Implementar validación de SKU y código de barras.
* Implementar stock mínimo y estados de inventario.
* Implementar unidades y conversiones.
* Implementar desactivación de productos con historial.

**Criterio de salida:** el usuario puede gestionar un catálogo persistente y las restricciones de datos funcionan.

### Fase 4 — Inventario

* Implementar existencias.
* Implementar entradas.
* Implementar ajustes.
* Implementar movimientos internos de inventario.
* Implementar transacciones y controles de concurrencia.
* Comprobar stock bajo, agotado y negativo.

**Criterio de salida:** todas las operaciones de inventario dejan las existencias y la trazabilidad coherentes.

### Fase 5 — Ventas y correcciones

* Implementar el formulario rápido de ventas.
* Implementar precios editables por operación.
* Guardar costo y precio históricos.
* Implementar ventas con stock insuficiente.
* Implementar correcciones y anulaciones.
* Garantizar que las correcciones no dupliquen movimientos.
* Implementar totales y fechas comerciales.

**Criterio de salida:** las ventas se guardan correctamente, las correcciones preservan la trazabilidad y el inventario se actualiza de forma atómica.

### Fase 6 — Dashboard y estadísticas

* Implementar indicadores principales.
* Implementar filtros de fechas.
* Implementar rankings.
* Implementar valor del inventario.
* Implementar comparación entre períodos.
* Diferenciar margen histórico y ganancia estimada a costo actual.

**Criterio de salida:** las métricas coinciden con cálculos verificables a partir de datos de prueba.

### Fase 7 — Importación y exportación

* Preparar plantilla CSV.
* Implementar validación previa.
* Detectar duplicados y errores.
* Implementar confirmación de importación.
* Implementar exportaciones.
* Comprobar caracteres especiales y precisión numérica.

**Criterio de salida:** los archivos válidos se procesan correctamente y los inválidos producen errores comprensibles sin corromper datos.

### Fase 8 — Pruebas y endurecimiento

* Ejecutar pruebas automatizadas.
* Ejecutar comprobaciones manuales.
* Probar los flujos críticos en un navegador.
* Revisar seguridad.
* Revisar variables y secretos.
* Revisar logs.
* Corregir errores encontrados.

**Criterio de salida:** los flujos críticos superan las pruebas y no quedan defectos conocidos que comprometan la seguridad o la integridad del inventario.

### Fase 9 — Despliegue y entrega

* Configurar Render.
* Configurar Supabase.
* Configurar Vercel.
* Aplicar el esquema en el ambiente correcto.
* Configurar las variables de entorno.
* Verificar dominios y comunicación.
* Desplegar y probar.
* Documentar la instalación y el uso.
* Entregar las URL verificadas y el estado real del proyecto.

**Criterio de salida:** la aplicación está desplegada y probada, o se documentan de forma precisa los bloqueos externos que impiden completar el despliegue.

---

## 20. Pruebas obligatorias

Combina pruebas automatizadas con comprobaciones manuales.

### 20.1. Autenticación

Comprueba:

* Contraseña válida.
* Contraseña inválida.
* Sesión inexistente.
* Sesión expirada.
* Cookie modificada o inválida.
* Acceso directo a una ruta protegida.
* Cierre de sesión.
* Acceso a la API sin sesión.
* Limitación de intentos.
* Funcionamiento de la cookie en el despliegue real.

### 20.2. Productos

Comprueba:

* Crear, consultar, editar y archivar productos.
* Crear y editar categorías.
* Buscar por nombre, SKU y código de barras.
* Detectar duplicados.
* Rechazar precios y cantidades inválidos.
* Mantener el historial al modificar precios.
* Impedir eliminaciones que rompan relaciones.

### 20.3. Unidades y conversiones

Comprueba:

* Conversión de caja a unidad.
* Cantidades fraccionarias.
* Precisión de hasta tres decimales.
* Rechazo de conversiones inválidas.
* Coherencia de las existencias tras varias conversiones.

### 20.4. Inventario

Comprueba:

* Entrada de mercancía.
* Ajuste positivo.
* Ajuste negativo.
* Stock bajo.
* Stock agotado.
* Stock negativo.
* Registro de movimientos.
* Fallo de una operación sin cambios parciales.
* Dos operaciones simultáneas sobre el mismo producto.

### 20.5. Ventas

Comprueba:

* Venta de un producto.
* Venta de varios productos.
* Precio de venta editado.
* Descuento de stock.
* Advertencia por stock insuficiente.
* Confirmación de venta con stock insuficiente.
* Prevención de doble registro.
* Corrección de cantidad.
* Corrección de precio.
* Anulación de venta.
* Reversión exacta del inventario.
* Conservación de fechas y datos históricos.

### 20.6. Costos y estadísticas

Comprueba:

* Total vendido.
* Cantidad de ventas.
* Productos más vendidos.
* Productos menos vendidos.
* Ganancia estimada con costo actual.
* Margen bruto con costo registrado.
* Cambio de costo actual sin alteración de los datos históricos.
* Valor del inventario.
* Filtros de fecha y zona horaria.
* Comparaciones entre períodos.
* Períodos sin ventas y divisiones por cero.

### 20.7. Importación y exportación

Comprueba:

* CSV válido.
* CSV vacío.
* Columnas ausentes.
* Tipos incorrectos.
* Duplicados.
* Caracteres acentuados.
* Comillas y separadores.
* Precios y cantidades decimales.
* Errores por fila.
* Exportación y posterior lectura del archivo.
* Ausencia de datos sensibles en las exportaciones.

Utiliza datos ficticios para las pruebas. No crees registros de prueba en producción sin autorización.

---

## 21. Documentación requerida

El repositorio debe contener documentación suficiente para que otra persona pueda mantener y desplegar la aplicación.

Como mínimo:

* `README.md`: instalación, arquitectura, ejecución y funcionamiento general.
* Documentación de variables de entorno.
* Esquema de base de datos.
* SQL versionado o migraciones reproducibles.
* Instrucciones de despliegue de Vercel.
* Instrucciones de despliegue de Render.
* Instrucciones de configuración de Supabase.
* Instrucciones de pruebas.
* Descripción de las fórmulas de estadísticas y ganancias.
* Plantilla y formato del CSV de importación.
* Explicación de las rutas principales de la API.

Documenta los nombres de las variables, para qué sirven, en qué servicio se configuran y si son públicas o secretas. No incluyas sus valores reales.

No es obligatorio desarrollar un procedimiento completo de respaldo y restauración en esta versión. Sin embargo, documenta las capacidades de respaldo que se hayan verificado y señala explícitamente cualquier tarea pendiente. No afirmes que existe una política de respaldo si no está configurada.

---

## 22. Despliegue en Vercel, Render y Supabase

### Supabase

* Crear o seleccionar la base de datos dedicada correcta.
* Aplicar el esquema y las restricciones.
* Verificar las claves foráneas e índices.
* Verificar los permisos y políticas.
* Comprobar que las credenciales del backend funcionan.
* Evitar accesos públicos innecesarios.

### Render

* Desplegar el backend.
* Configurar las variables de entorno.
* Configurar las comprobaciones de salud.
* Comprobar conectividad con Supabase.
* Verificar la autenticación y la protección de rutas.
* Comprobar logs sin revelar secretos.

### Vercel

* Desplegar el frontend.
* Configurar las variables públicas necesarias.
* Configurar el destino de la API o el proxy, cuando corresponda.
* Comprobar el manejo de cookies.
* Verificar el login, la navegación protegida y el cierre de sesión.

### Comprobaciones finales

No basta con que el proceso de despliegue indique éxito.

Verifica:

* Que la URL del frontend carga.
* Que el login funciona.
* Que la API responde.
* Que el backend se comunica con Supabase.
* Que los datos persisten tras recargar la página.
* Que las rutas protegidas rechazan solicitudes no autenticadas.
* Que una operación de prueba en el ambiente adecuado produce el resultado esperado.
* Que los logs no exponen secretos.

No inventes las URL finales. Registra únicamente las que se hayan obtenido y verificado.

---

## 23. Criterios de aceptación

El proyecto se considerará terminado cuando se cumplan todos los criterios siguientes:

### Autenticación

* Existe una única contraseña compartida.
* No hay registro de usuarios individuales.
* Los secretos se configuran en el backend.
* La sesión segura funciona en el navegador.
* Las rutas y operaciones protegidas validan la sesión.
* La expiración y el cierre de sesión funcionan.

### Inventario

* Se pueden crear y editar productos.
* Se pueden gestionar categorías.
* La búsqueda por nombre, SKU, código de barras y categoría funciona.
* Las unidades y conversiones funcionan.
* Las entradas y ajustes actualizan el stock correctamente.
* Las alertas de stock bajo y agotado funcionan.
* Los productos con historial se archivan en vez de eliminarse físicamente.

### Ventas

* Se pueden registrar ventas individuales.
* Se puede modificar el precio aplicado a una venta sin alterar el precio predeterminado.
* El stock se actualiza de forma atómica.
* Se advierte cuando el stock es insuficiente y se permite confirmar.
* Se pueden corregir y anular ventas con trazabilidad.
* Se conservan las fechas y los costos históricos.
* No se duplican operaciones por reintentos o doble clic.

### Estadísticas

* Los totales coinciden con las ventas registradas.
* Los filtros de fecha funcionan.
* Los rankings son coherentes.
* El valor del inventario utiliza el costo actual.
* La ganancia estimada y el margen histórico se distinguen correctamente.
* Las comparaciones de períodos funcionan.

### Importación y exportación

* La importación CSV valida los datos antes de confirmar.
* Los errores son comprensibles y no corrompen el inventario.
* Las exportaciones se generan correctamente.
* No se exportan secretos.

### Calidad y entrega

* Las pruebas automatizadas y las comprobaciones manuales están ejecutadas.
* Los defectos críticos encontrados se han corregido.
* La documentación está actualizada.
* Las variables necesarias están documentadas.
* El esquema de base de datos está documentado.
* Vercel, Render y Supabase están configurados y verificados, en la medida que permitan los accesos disponibles.
* Las limitaciones externas restantes están documentadas sin presentarlas como funcionalidades terminadas.

---

## 24. Informe final obligatorio

Al terminar, entrega un informe en español con estas secciones:

1. **Estado general:** terminado, parcialmente terminado o bloqueado.
2. **Arquitectura:** tecnologías y responsabilidades de cada servicio.
3. **Recursos verificados:** proyectos, base de datos, backend, frontend y dominios que realmente se hayan identificado.
4. **Implementación:** funcionalidades terminadas y archivos importantes.
5. **Base de datos:** tablas, relaciones, restricciones y migraciones aplicadas.
6. **Seguridad:** método de sesión, protección de rutas, políticas de acceso y configuración de cookies.
7. **Pruebas:** pruebas ejecutadas y resultados reales.
8. **Despliegue:** URL verificadas y comprobaciones realizadas.
9. **Configuración pendiente:** variables que deba proporcionar el propietario, sin pedirle que publique sus valores en el chat.
10. **Limitaciones:** errores o bloqueos que permanezcan.
11. **Uso de la aplicación:** pasos básicos para iniciar sesión, administrar productos, registrar entradas, registrar ventas y consultar estadísticas.
12. **Mantenimiento:** cómo ejecutar pruebas, aplicar cambios de base de datos y desplegar nuevas versiones.

No marques un criterio como completado si no hay evidencia de su implementación o comprobación.

---

## 25. Instrucción final para OpenCode

Comienza por la inspección del entorno y continúa con la Fase 0.

No esperes instrucciones adicionales para decisiones técnicas menores que puedas tomar de forma segura y coherente con este documento.

Implementa el proyecto por fases, mantén la documentación actualizada y prueba cada flujo antes de avanzar.

Cuando encuentres un problema, investiga la causa y aplica la solución apropiada. Si el problema depende de permisos ausentes, credenciales no configuradas, autorizaciones pendientes o limitaciones externas, explica qué falta y continúa con las tareas independientes que sí puedas realizar.

**La prioridad es entregar una aplicación real, segura, coherente y mantenible, no simplemente una interfaz que parezca funcionar.**

No inventes recursos, credenciales, resultados de pruebas ni despliegues. Protege la información existente, evita operaciones destructivas sin autorización y conserva la integridad histórica de las ventas y el inventario.


### Uso obligatorio de skills y herramientas de desarrollo

Antes de implementar cada módulo, identifica y utiliza las skills disponibles que correspondan a la tarea. No asumas que una skill está instalada: verifica su disponibilidad y, si falta, informa al usuario o solicita su instalación.

* **Base de datos:** aplicar Supabase Postgres Best Practices antes de diseñar tablas, crear migraciones, modificar índices, escribir consultas o revisar problemas de rendimiento.
* **Frontend:** aplicar las recomendaciones de rendimiento del framework elegido y las guías de diseño y accesibilidad pertinentes.
* **Seguridad:** revisar autenticación, autorización, validación, sesiones, cookies y protección de los endpoints antes de considerar terminado un módulo.
* **Pruebas:** crear y ejecutar pruebas unitarias e integrales, y pruebas de navegador para los flujos principales.
* **Rendimiento:** medir los tiempos de respuesta con el backend ya iniciado, utilizando datos de prueba representativos. No confundir el tiempo de arranque del hosting con la velocidad durante el uso.
* **Infraestructura:** utilizar los MCP o las herramientas oficiales disponibles para verificar la configuración y los despliegues reales.

No instales dependencias, skills ni MCP innecesarios. Comprueba su compatibilidad con el stack elegido y evita duplicar herramientas que ya cumplen la misma función.

Antes de declarar terminado un módulo, informa qué pruebas se ejecutaron, cuáles pasaron, cuáles fallaron y qué limitaciones quedan pendientes. No afirmes haber ejecutado pruebas, consultado servicios o realizado despliegues que no hayas verificado.



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

