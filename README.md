# Guía de desarrollo por fases --- Inventario Ferretería

## Propósito

Esta guía organiza la construcción de la aplicación de inventario y
ventas de una ferretería física. Está pensada para avanzar manualmente,
comprender cada parte del sistema y comprobar que cada etapa funciona
antes de continuar.

La guía define el orden de trabajo, la arquitectura prevista, la
responsabilidad de los archivos, las tareas y los criterios para dar
cada fase por terminada. No contiene el código de la aplicación.

## Cómo trabajar con esta guía

1.  Trabaja en una sola fase a la vez.
2.  Lee el objetivo, las tareas y los criterios de finalización antes de
    empezar.
3.  Divide la fase en tareas pequeñas que puedas implementar y comprobar
    por separado.
4.  Ejecuta las pruebas de la tarea actual y revisa los cambios
    realizados.
5.  Si algo falla, corrige el problema concreto antes de añadir más
    funcionalidades.
6.  Registra las decisiones técnicas importantes en la documentación.
7.  Cuando la fase funcione y cumpla sus criterios, guarda los cambios
    en Git con un commit.
8.  No marques una fase como terminada solo porque la pantalla se vea
    bien: verifica también el comportamiento y los datos.
9.  No avances si una decisión de la fase actual puede afectar el diseño
    de la base de datos o las fases posteriores.

------------------------------------------------------------------------

# 1. Definición del producto

## Objetivo de la aplicación

Crear una aplicación web privada para administrar el inventario y
registrar las ventas de una ferretería física.

El vendedor atiende a los clientes normalmente y registra las ventas
después, por ejemplo al final del día. La aplicación no es una caja
registradora ni un sistema POS en tiempo real.

## Funciones incluidas en la primera versión

-   Inicio de sesión mediante una única contraseña compartida.
-   Administración de productos y categorías.
-   Identificación de productos mediante nombre, SKU/código interno y
    código de barras.
-   Precio de compra y precio de venta.
-   Unidades base, cantidades fraccionarias y conversiones configurables
    por producto.
-   Control de existencias a través de movimientos de inventario.
-   Registro de ventas individuales y de sus productos.
-   Correcciones y anulaciones de ventas con historial.
-   Entradas de mercancía y ajustes de inventario con motivo
    obligatorio.
-   Panel de resumen con ventas, productos agotados, stock bajo y
    productos más vendidos.
-   Importación y exportación de archivos CSV.
-   Entornos separados para desarrollo y producción.
-   Pruebas, despliegue y documentación de uso.

## Reglas de negocio que deben respetarse

-   No borrar ventas ni movimientos históricos. Corregirlos mediante
    registros compensatorios y conservar el historial.
-   No permitir que la interfaz modifique directamente el stock
    calculado.
-   Guardar en cada producto vendido el precio aplicado en esa venta,
    aunque después cambie el precio del catálogo.
-   Guardar la fecha en que ocurrió la venta y la fecha en que se
    registró.
-   Permitir hasta tres decimales en las cantidades cuando la unidad lo
    permita.
-   Si no hay stock suficiente, mostrar una advertencia y solicitar
    confirmación según la regla definida.
-   No borrar físicamente productos que tengan movimientos;
    desactivarlos.
-   No incluir secretos en el código, el repositorio, los mensajes de
    error ni los registros.
-   No aplicar migraciones destructivas ni modificar producción sin
    autorización explícita.
-   Calcular los importes importantes en el servidor, no confiar en los
    totales enviados por la interfaz.
-   Hacer que las operaciones relacionadas con una venta sean
    consistentes: una operación fallida no debe dejar datos a medias.

------------------------------------------------------------------------

# 2. Arquitectura del sistema

## Tecnologías previstas

La arquitectura propuesta utiliza:

-   **Frontend:** Next.js y TypeScript.
-   **API/backend:** Node.js, Express y TypeScript.
-   **Base de datos:** PostgreSQL administrado mediante Supabase.
-   **Despliegue del frontend:** Vercel.
-   **Despliegue de la API:** Render.
-   **Control de versiones:** Git y GitHub.

Si se decide cambiar alguna tecnología, documentar la decisión antes de
empezar a construir las partes que dependen de ella. Evitar mezclar
frameworks a mitad del proyecto sin una razón concreta.

## Estructura de carpetas prevista

La siguiente estructura representa el destino del proyecto. No es
necesario crear todas las carpetas vacías desde el principio: cada una
se incorpora cuando la fase correspondiente la necesita.

``` text
Ferreteria/
├── README.md
├── .gitignore
├── .env.example
├── package.json
├── docs/
│   ├── arquitectura.md
│   ├── decisiones-tecnicas.md
│   ├── pruebas-manuales.md
│   └── database/
│       └── schema.md
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── login/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── productos/
│   │   │   │   ├── categorias/
│   │   │   │   ├── ventas/
│   │   │   │   ├── movimientos/
│   │   │   │   └── importacion/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   ├── forms/
│   │   │   │   ├── tables/
│   │   │   │   └── feedback/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── products/
│   │   │   │   ├── sales/
│   │   │   │   ├── inventory/
│   │   │   │   └── dashboard/
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts
│   │   │   │   ├── env.ts
│   │   │   │   └── formatters.ts
│   │   │   └── styles/
│   │   └── tests/
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── app.ts
│       │   ├── server.ts
│       │   ├── config/
│       │   ├── middleware/
│       │   ├── routes/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── repositories/
│       │   ├── validators/
│       │   ├── schemas/
│       │   ├── errors/
│       │   └── utils/
│       └── tests/
├── supabase/
│   └── migrations/
└── scripts/
    ├── check-env
    └── verify-project
```

## Responsabilidad de cada zona

### Archivos de la raíz

-   `package.json`: comandos comunes para instalar, ejecutar y probar el
    monorepo.
-   `.gitignore`: excluye dependencias, compilaciones, archivos locales
    y secretos.
-   `.env.example`: enumera las variables necesarias con valores
    ficticios; nunca contiene secretos reales.
-   `README.md`: presenta el proyecto y explica cómo instalarlo,
    ejecutarlo y mantenerlo.
-   `docs/arquitectura.md`: describe los componentes, sus conexiones y
    el flujo de las solicitudes.
-   `docs/decisiones-tecnicas.md`: registra las decisiones técnicas y
    sus motivos.
-   `docs/pruebas-manuales.md`: contiene los casos que deben comprobarse
    manualmente.
-   `docs/database/schema.md`: documenta tablas, campos, relaciones,
    restricciones y reglas de la base de datos.

### Frontend (`apps/web`)

-   `src/app/`: páginas, rutas y estructuras visuales de cada sección.
-   `src/components/layout/`: menú, cabecera, navegación y estructura
    compartida.
-   `src/components/forms/`: campos y formularios reutilizables.
-   `src/components/tables/`: tablas, paginación, filtros y estados
    vacíos.
-   `src/components/feedback/`: mensajes de éxito, error, carga y
    confirmaciones.
-   `src/features/`: componentes y lógica de interfaz organizados por
    función del negocio.
-   `src/lib/api-client.ts`: punto central de comunicación con la API.
-   `src/lib/env.ts`: validación de variables públicas que necesita el
    frontend.
-   `src/lib/formatters.ts`: formatos de moneda, cantidades y fechas.
-   `tests/`: pruebas de componentes y flujos de la interfaz.

### Backend (`apps/api`)

-   `src/app.ts`: configura Express, los middleware y las rutas; no
    inicia el puerto.
-   `src/server.ts`: carga la configuración e inicia el servidor.
-   `src/config/`: configuración y validación de variables de entorno.
-   `src/middleware/`: autenticación, CORS, manejo de errores y límites
    de solicitudes.
-   `src/routes/`: declara los endpoints disponibles.
-   `src/controllers/`: recibe solicitudes HTTP y construye las
    respuestas.
-   `src/services/`: aplica reglas del negocio, como registrar una venta
    o validar cantidades.
-   `src/repositories/`: concentra el acceso a Supabase y las consultas
    de datos.
-   `src/validators/` y `src/schemas/`: validan los datos recibidos.
-   `src/errors/`: define errores controlados y respuestas consistentes.
-   `src/utils/`: funciones técnicas pequeñas que no pertenecen a una
    función de negocio.
-   `tests/`: pruebas unitarias, de API e integración.

### Base de datos (`supabase`)

-   `migrations/`: cambios versionados del esquema. Una migración ya
    aplicada no se edita; los cambios posteriores se registran en una
    migración nueva.
-   `docs/database/schema.md`: explica el propósito de cada tabla, sus
    campos, relaciones, restricciones e interacciones.

## Flujo de una operación

La interfaz envía una petición a la API. La API autentica la solicitud,
valida los datos y aplica las reglas del negocio. Después,
Supabase/PostgreSQL guarda la información y ejecuta las restricciones o
funciones de base de datos que correspondan. Finalmente, la API devuelve
una respuesta y la interfaz actualiza la pantalla.

La interfaz no debe escribir directamente en la base de datos ni tener
acceso a claves privilegiadas.

------------------------------------------------------------------------

# 3. Desarrollo por fases

## Fase 0 --- Preparación y decisiones

**Objetivo:** preparar el entorno de trabajo y confirmar qué existe
antes de programar.

### Tareas

-   Confirmar las versiones de Node.js y npm.
-   Confirmar la rama de Git y el estado de los cambios.
-   Revisar los archivos y carpetas que ya existen.
-   Identificar qué migraciones de base de datos existen y cuáles se han
    aplicado realmente.
-   Decidir y documentar frontend, backend, gestor de paquetes y
    estrategia de pruebas.
-   Revisar `.gitignore` y `.env.example`.
-   Crear o completar `docs/arquitectura.md` y
    `docs/decisiones-tecnicas.md`.
-   Crear un commit inicial que permita volver a un estado conocido.

### Criterios para terminar

-   Las decisiones tecnológicas están documentadas.
-   Se conoce el estado real del repositorio y de las migraciones.
-   El proyecto tiene un estado inicial guardado en Git.
-   No se han creado servicios ni modificado datos de producción
    accidentalmente.

## Fase 1 --- Diseñar y estabilizar la base de datos

**Objetivo:** tener un modelo de datos coherente antes de construir las
pantallas.

### Tareas

-   Revisar tablas, claves foráneas, restricciones, índices, vistas y
    funciones o triggers existentes.
-   Definir cómo se representan productos, categorías, unidades, ventas,
    artículos vendidos y movimientos de inventario.
-   Comprobar que los productos sin movimientos aparezcan con stock
    cero.
-   Definir cómo se convierten unidades: cantidad en unidad de origen
    multiplicada por el factor equivale a cantidad en unidad base.
-   Definir cómo se guardan el coste histórico, el precio aplicado, los
    subtotales y el total de una venta.
-   Definir el proceso transaccional de registro, corrección y anulación
    de ventas.
-   Revisar permisos y políticas RLS. El frontend no debe recibir una
    clave privilegiada de Supabase.
-   Preparar datos de prueba y consultas de verificación.
-   Corregir el esquema mediante migraciones nuevas; no editar
    migraciones ya aplicadas.

### Criterios para terminar

-   Un producto sin movimientos aparece con stock cero.
-   Las entradas aumentan el stock y las ventas lo reducen
    correctamente.
-   Las conversiones de unidades producen cantidades correctas.
-   Los datos inválidos se rechazan de forma controlada.
-   El esquema, las reglas y el procedimiento para aplicar migraciones
    están documentados.
-   Las pruebas se han realizado en desarrollo, no sobre producción.

## Fase 2 --- Crear la estructura mínima del proyecto

**Objetivo:** conseguir que el frontend y la API funcionen localmente,
sin implementar todavía el inventario.

### Archivos principales

-   `package.json` de la raíz.
-   `apps/web/package.json` y configuración de Next.js/TypeScript.
-   `apps/api/package.json`, configuración de TypeScript, `src/app.ts` y
    `src/server.ts`.
-   `.gitignore` y `.env.example`.

### Tareas

-   Crear únicamente los proyectos mínimos.
-   Añadir comandos para instalar dependencias, ejecutar en desarrollo,
    compilar y probar.
-   Crear un endpoint de salud de la API.
-   Crear una página inicial sencilla del frontend.
-   Evitar instalar bibliotecas que todavía no se necesitan.

### Criterios para terminar

-   El frontend y la API arrancan mediante comandos documentados.
-   La API responde al endpoint de salud.
-   Ambos proyectos compilan sin errores.
-   Los secretos reales no aparecen en Git.

## Fase 3 --- Conectar la API con Supabase

**Objetivo:** permitir que el backend acceda a la base de datos de
desarrollo de forma controlada.

### Archivos principales

-   `apps/api/src/config/`
-   `apps/api/src/repositories/`
-   `apps/api/src/errors/`
-   `.env.example`

### Tareas

-   Configurar las variables de entorno necesarias.
-   Validar las variables obligatorias al arrancar.
-   Crear un módulo central de conexión a Supabase.
-   Manejar los errores de conexión sin mostrar secretos.
-   Crear una comprobación de conexión de uso interno o administrativo.
-   Establecer un formato consistente para las respuestas y los errores
    de la API.

### Criterios para terminar

-   La API conecta con el proyecto de desarrollo.
-   Si falta una variable obligatoria, aparece un error claro y seguro.
-   Las credenciales no se envían al navegador ni se imprimen en los
    registros.
-   La conexión puede verificarse sin modificar datos de negocio.

## Fase 4 --- Implementar la autenticación

**Objetivo:** proteger la aplicación mediante una contraseña compartida,
sin crear una tabla de usuarios.

### Archivos principales

-   API: rutas, controladores y servicios de autenticación; middleware y
    configuración de secretos.
-   Frontend: página `login`, protección de navegación y manejo de
    sesión.
-   Documentación: variables necesarias y duración de sesión.

### Tareas

-   Validar la contraseña en el servidor mediante una variable de
    entorno.
-   Emitir y verificar una sesión firmada con expiración de 30 días.
-   Proteger todas las rutas privadas de la API, no solamente las
    páginas del frontend.
-   Configurar CORS para los dominios permitidos.
-   Definir la estrategia de cookies. Se recomienda `HttpOnly`, `Secure`
    en producción y un valor `SameSite` apropiado. Una cookie accesible
    desde JavaScript aumenta el riesgo ante ataques XSS.
-   Añadir cierre de sesión y respuestas coherentes para sesiones
    vencidas.

### Criterios para terminar

-   Una contraseña incorrecta no permite entrar.
-   Sin sesión válida, las rutas privadas responden como no
    autenticadas.
-   Una sesión válida permite acceder.
-   La expiración y el cierre de sesión funcionan.
-   La contraseña y el secreto de firma no pueden obtenerse desde el
    navegador.

## Fase 5 --- Construir categorías y catálogo de productos

**Objetivo:** permitir administrar el catálogo básico.

### Archivos principales

-   API: rutas, controladores, servicios, repositorios y validadores de
    categorías y productos.
-   Frontend: páginas de categorías y productos, formularios y tabla del
    catálogo.
-   Componentes para seleccionar categoría y unidad.

### Tareas

-   Crear, listar, editar y desactivar categorías.
-   Crear, listar, editar y desactivar productos.
-   Manejar nombre, descripción, categoría, SKU/código interno y código
    de barras.
-   Manejar precio de compra, precio de venta y stock mínimo.
-   Detectar posibles duplicados y mostrar mensajes útiles.
-   Desactivar, en vez de borrar, productos que ya tengan movimientos.
-   Implementar búsqueda por nombre, SKU, código de barras y categoría.
-   Incorporar paginación, filtros, ordenamiento y acciones rápidas.

### Criterios para terminar

-   Los cambios se conservan al recargar la página.
-   Los duplicados se detectan según las reglas definidas.
-   La búsqueda, la paginación y los filtros funcionan con datos reales.
-   Un producto con movimientos no se elimina físicamente.
-   Los errores de los formularios son comprensibles.

## Fase 6 --- Implementar unidades y conversiones

**Objetivo:** permitir vender productos por unidades, medidas o
fracciones.

### Archivos principales

-   Servicios y validadores de conversiones en la API.
-   Formularios para definir la unidad base y los factores por producto.
-   Pruebas de conversión.

### Tareas

-   Definir una unidad base para cada producto.
-   Definir el sentido del factor: cantidad en unidad de origen × factor
    = cantidad en unidad base.
-   Admitir hasta tres decimales en las cantidades permitidas.
-   Rechazar conversiones ausentes, ambiguas o con factores no
    positivos.
-   Evitar redondeos prematuros.
-   Mostrar claramente la unidad utilizada al registrar una cantidad.

### Criterios para terminar

-   Los ejemplos de conversión documentados producen los resultados
    esperados.
-   Las cantidades se almacenan de forma consistente en unidad base.
-   Las conversiones no válidas se rechazan.
-   La interfaz muestra la unidad correcta en los formularios y
    listados.

## Fase 7 --- Registrar movimientos, entradas y ajustes de inventario

**Objetivo:** mantener las existencias a través de movimientos
auditables.

### Archivos principales

-   API: rutas, controladores, servicios y validadores de movimientos.
-   Frontend: formularios de entradas y ajustes y vista de existencias.
-   Pruebas de consistencia del stock.

### Tareas

-   Registrar entradas de mercancía.
-   Registrar ajustes positivos o negativos con motivo obligatorio.
-   Consultar stock actual, productos agotados y productos con stock
    bajo.
-   Solicitar confirmación para ajustes importantes.
-   Usar transacciones o funciones de base de datos cuando una operación
    requiera varias escrituras coordinadas.
-   Evitar duplicar en la API la lógica que ya ejecuten las funciones o
    triggers de la base de datos.

### Criterios para terminar

-   Cada entrada o ajuste crea el movimiento correspondiente una sola
    vez.
-   El stock coincide con la suma de los movimientos.
-   La interfaz no puede alterar directamente el stock calculado.
-   Los movimientos conservan referencia, fecha y justificación.

## Fase 8 --- Registrar ventas

**Objetivo:** registrar ventas individuales después de atender a los
clientes.

### Archivos principales

-   API: rutas, controladores, servicios y validadores de ventas.
-   Frontend: página para crear una venta, lista y detalle de ventas.
-   Formulario para añadir productos y cantidades.

### Tareas

-   Registrar la fecha en que ocurrió la venta y la fecha real de
    registro.
-   Añadir uno o varios productos a una venta.
-   Guardar cantidad, unidad y precio unitario realmente aplicado.
-   Calcular subtotales y total en el servidor.
-   Guardar el coste histórico necesario para estimar la ganancia.
-   Descontar stock mediante movimientos, sin duplicar la lógica de la
    base de datos.
-   Advertir si el stock es insuficiente y aplicar la regla de
    confirmación definida.
-   Evitar que un reintento de la misma petición cree una venta
    duplicada.
-   Permitir consultar las ventas por fecha.
-   Guardar únicamente la información de pago contemplada en el alcance:
    total diario, sin detalle de métodos de pago.

### Criterios para terminar

-   Una venta válida se guarda y descuenta la cantidad correcta.
-   Los importes se calculan en el servidor.
-   Una operación fallida no deja una venta incompleta.
-   Las ventas pueden consultarse por fecha.
-   El precio y el coste guardados en la venta no cambian al editar el
    producto del catálogo.

## Fase 9 --- Corregir y anular ventas

**Objetivo:** corregir errores sin destruir el historial.

### Archivos principales

-   Servicio transaccional de corrección y anulación.
-   Vistas de detalle e historial de la venta.
-   Pruebas de compensación de movimientos.

### Tareas

-   Exigir un motivo para cada corrección.
-   Conservar la venta original y sus artículos.
-   Registrar movimientos compensatorios para revertir el efecto
    anterior.
-   Registrar la versión corregida sin duplicar descuentos ni
    devoluciones.
-   Mostrar fecha original, fecha de corrección, motivo y estado.
-   Definir y documentar el comportamiento al anular una venta.

### Criterios para terminar

-   Corregir una venta revierte exactamente el efecto anterior y aplica
    el nuevo.
-   Anular una venta restituye las cantidades que corresponden.
-   La venta original sigue disponible para consulta.
-   Repetir una petición no duplica compensaciones ni movimientos.

## Fase 10 --- Consolidar la experiencia de usuario

**Objetivo:** ofrecer una interfaz clara y ágil para el uso diario en
computador.

### Archivos principales

-   `components/layout/`: menú, navegación y cabecera.
-   `components/tables/`: tablas y paginación.
-   `components/forms/`: campos y formularios compartidos.
-   `components/feedback/`: carga, errores, avisos y confirmaciones.
-   `styles/`: estilos globales y elementos visuales compartidos.

### Tareas

-   Crear navegación sencilla para dashboard, productos, categorías,
    ventas, movimientos e importación.
-   Mantener un diseño limpio, consistente y en español de Colombia.
-   Añadir estados de carga, vacío, éxito y error.
-   Evitar que una búsqueda o un guardado bloquee innecesariamente toda
    la pantalla.
-   Confirmar las acciones importantes.
-   Revisar que todos los botones y controles tengan una función real.
-   Optimizar los flujos frecuentes para registrar y consultar
    información sin pasos innecesarios.

### Criterios para terminar

-   Las pantallas principales son utilizables en escritorio.
-   Los formularios validan y muestran errores comprensibles.
-   Los controles interactivos funcionan.
-   Las operaciones frecuentes se sienten ágiles una vez cargada la
    aplicación.
-   La interfaz no presenta errores visibles en los flujos normales.

## Fase 11 --- Crear el dashboard y los informes

**Objetivo:** mostrar información útil para la gestión diaria.

### Archivos principales

-   Servicio y endpoint de estadísticas.
-   Página del dashboard y componentes de indicadores o gráficas.
-   Pruebas de cálculos por período.

### Indicadores

-   Total vendido y número de ventas.
-   Productos con stock bajo y productos agotados.
-   Productos más vendidos.
-   Ganancia estimada, con su metodología documentada.
-   Períodos: hoy, ayer, últimos siete días y rango personalizado.
-   Comparación con un período anterior equivalente.

### Tareas

-   Definir una zona horaria para el negocio.
-   Definir cómo se contabilizan las ventas corregidas y anuladas.
-   Verificar los cálculos con consultas independientes a la base de
    datos.
-   Mostrar con claridad cuándo la ganancia es una estimación por
    depender del coste registrado.

### Criterios para terminar

-   Las cifras coinciden con las consultas de comprobación.
-   Las ventas corregidas y anuladas se contabilizan según la regla
    documentada.
-   Los rangos de fechas usan la zona horaria definida.
-   La ganancia estimada no se presenta como un valor exacto si el coste
    disponible es aproximado.

## Fase 12 --- Importar y exportar archivos CSV

**Objetivo:** facilitar la carga inicial del catálogo y la extracción de
datos.

### Archivos principales

-   Servicios de importación y exportación en la API.
-   Pantalla de importación, vista previa y resumen de resultados.
-   Plantillas CSV documentadas.
-   Pruebas con archivos válidos e inválidos.

### Tareas

-   Definir columnas, formatos de fecha, separadores decimales y
    codificación.
-   Validar el archivo antes de escribir en la base de datos.
-   Mostrar errores por fila y permitir revisar una vista previa.
-   Definir qué hacer con códigos duplicados.
-   Evitar importaciones parciales inesperadas; utilizar transacciones
    cuando corresponda.
-   Registrar el inventario inicial mediante movimientos, no alterando
    directamente una columna de stock.
-   Probar la apertura de los archivos exportados en una hoja de
    cálculo.

### Criterios para terminar

-   Una importación válida produce registros correctos.
-   Un archivo inválido informa qué filas fallaron.
-   Reimportar no crea duplicados silenciosamente.
-   Las exportaciones pueden abrirse en una hoja de cálculo.
-   Los cambios de inventario importados conservan la trazabilidad
    requerida.

## Fase 13 --- Pruebas integrales, seguridad y rendimiento

**Objetivo:** comprobar que todas las partes funcionan juntas y que los
datos están protegidos.

### Archivos principales

-   Pruebas unitarias de API y frontend.
-   Pruebas de integración con la base de datos de desarrollo.
-   `docs/pruebas-manuales.md`.
-   Scripts de verificación del proyecto.

### Tareas

-   Probar acceso válido e inválido.
-   Probar productos, conversiones, entradas, ajustes, ventas,
    correcciones y anulaciones.
-   Probar valores límite, duplicados, falta de stock y errores de red.
-   Verificar que no se filtren secretos.
-   Verificar la paginación y los índices de las consultas frecuentes.
-   Comprobar que la API no realice consultas repetitivas innecesarias
    por cada fila.
-   Comprobar que las operaciones críticas sean consistentes cuando
    ocurre un error.
-   Documentar los resultados reales y los fallos pendientes.
-   Corregir los defectos críticos antes de desplegar.

### Criterios para terminar

-   Las pruebas automáticas definidas pasan.
-   Los flujos críticos se han probado manualmente.
-   Los errores conocidos están documentados y no hay defectos críticos
    abiertos.
-   Los secretos no aparecen en el repositorio, en el navegador ni en
    los registros.
-   No se declara terminada una función solo porque su pantalla se vea
    bien.

## Fase 14 --- Desplegar en desarrollo y producción

**Objetivo:** publicar la aplicación de forma controlada y repetible.

### Archivos principales

-   Configuración de despliegue del frontend y la API.
-   `.env.example` actualizado.
-   `README.md` con instalación, pruebas, migraciones y despliegue.
-   `docs/arquitectura.md` con las direcciones y el flujo de despliegue,
    sin credenciales.

### Tareas

-   Configurar Supabase, Render y Vercel por separado para desarrollo y
    producción.
-   Guardar las variables secretas en los paneles de configuración de
    cada servicio.
-   Restringir CORS a los dominios reales necesarios.
-   Aplicar migraciones primero en desarrollo y verificar sus efectos.
-   Desplegar la API y el frontend y probar su comunicación con las
    direcciones reales.
-   Comprobar el inicio de sesión y la lectura y escritura de datos
    después del despliegue.
-   Documentar cómo volver a una versión anterior y qué respaldos
    existen.
-   Verificar el comportamiento después de una primera carga en frío del
    servicio backend y después de que esté activo.

### Criterios para terminar

-   La URL de producción funciona realmente.
-   La API responde y se conecta con la base de datos correcta.
-   Las variables de entorno están configuradas sin exponerse.
-   El proceso de despliegue puede repetirse siguiendo la documentación.
-   Se han probado los flujos críticos en el entorno desplegado.
-   Existe un procedimiento documentado para recuperar una versión
    anterior.

------------------------------------------------------------------------

# 4. Rutina de trabajo para cada fase

Utiliza esta secuencia en todas las fases:

1.  **Planificar:** dividir el objetivo de la fase en tareas pequeñas y
    ordenadas.
2.  **Preparar:** identificar los archivos y dependencias necesarios
    para la tarea.
3.  **Implementar:** completar una tarea concreta sin mezclar
    funcionalidades futuras.
4.  **Probar:** ejecutar pruebas y comprobar el resultado real.
5.  **Revisar:** leer los cambios y comprobar que solo afectan al
    alcance previsto.
6.  **Corregir:** solucionar los fallos encontrados antes de continuar.
7.  **Documentar:** registrar decisiones, comandos, resultados y
    problemas conocidos.
8.  **Guardar en Git:** crear un commit cuando exista un estado
    funcional.
9.  **Cerrar la fase:** comprobar todos sus criterios de finalización y
    actualizar el registro de avance.

## Qué hacer cuando una prueba falla

-   Reproducir el fallo.
-   Leer el mensaje de error completo.
-   Identificar qué parte del sistema lo provoca.
-   Corregir esa causa específica.
-   Repetir la prueba que falló y las pruebas relacionadas.
-   Documentar el resultado.

Evita cambiar varias partes del sistema a la vez cuando todavía no se
conoce la causa del problema. Eso dificulta identificar qué cambio lo
solucionó o introdujo un error nuevo.

## Antes de tocar la base de datos

-   Confirmar a qué proyecto y entorno se está conectado.
-   Revisar la migración y su efecto.
-   Comprobar si existen datos que deban conservarse.
-   Aplicar los cambios primero en desarrollo.
-   Verificar los resultados antes de llevarlos a producción.
-   No editar una migración que ya se haya aplicado; crear una nueva.

## Antes de cerrar una fase

-   [ ] Se completaron las tareas previstas.
-   [ ] Se ejecutaron las pruebas pertinentes.
-   [ ] Se revisaron los cambios realizados.
-   [ ] No hay errores críticos conocidos sin documentar.
-   [ ] Se actualizaron los documentos afectados.
-   [ ] Se creó un commit de Git.
-   [ ] Se marcaron los criterios de aceptación como cumplidos.

------------------------------------------------------------------------

# 5. Registro de avance

Marca cada fase únicamente después de verificar sus criterios de
finalización.

-   [ ] Fase 0 --- Preparación y decisiones.
-   [ ] Fase 1 --- Base de datos diseñada, auditada y probada.
-   [ ] Fase 2 --- Estructura mínima del proyecto ejecutable.
-   [ ] Fase 3 --- Conexión segura con Supabase.
-   [ ] Fase 4 --- Autenticación y protección de rutas.
-   [ ] Fase 5 --- Categorías y productos.
-   [ ] Fase 6 --- Unidades y conversiones.
-   [ ] Fase 7 --- Movimientos, entradas y ajustes.
-   [ ] Fase 8 --- Registro de ventas.
-   [ ] Fase 9 --- Correcciones y anulaciones.
-   [ ] Fase 10 --- Experiencia de usuario.
-   [ ] Fase 11 --- Dashboard e informes.
-   [ ] Fase 12 --- Importación y exportación CSV.
-   [ ] Fase 13 --- Pruebas integrales, seguridad y rendimiento.
-   [ ] Fase 14 --- Despliegue.

## Estado actual conocido del proyecto

La documentación de partida indica que existen archivos de documentación
y migraciones SQL, pero todavía no hay una aplicación frontend/backend
completa. Las migraciones existentes deben revisarse antes de continuar.
En particular, se debe verificar la conversión de unidades en el proceso
de ventas y comprobar que la vista de stock incluya también productos
sin movimientos, mostrándolos con stock cero.

Este estado debe confirmarse revisando el repositorio y la base de datos
reales antes de dar por hecho que sigue siendo vigente.

**Importante:** no ejecutar migraciones sobre producción hasta
identificar el proyecto conectado, conocer el estado de la base de datos
y revisar el efecto de cada cambio.

------------------------------------------------------------------------

# 6. Definición de terminado del proyecto

La primera versión puede considerarse lista para uso cuando:

-   [ ] Se puede iniciar y cerrar sesión correctamente.
-   [ ] Se pueden crear, editar, buscar y desactivar productos y
    categorías.
-   [ ] Las unidades y conversiones funcionan correctamente.
-   [ ] Las entradas y ajustes generan movimientos auditables.
-   [ ] Las ventas descuentan el stock correctamente.
-   [ ] Las correcciones y anulaciones conservan el historial.
-   [ ] El dashboard muestra cifras verificadas.
-   [ ] La importación y exportación CSV funcionan y están documentadas.
-   [ ] Las pruebas críticas pasan.
-   [ ] La aplicación está desplegada y se verificó con las direcciones
    reales.
-   [ ] Las variables de entorno y los secretos están protegidos.
-   [ ] Existe documentación para instalar, ejecutar, probar y desplegar
    el proyecto.
-   [ ] Se conocen los procedimientos para aplicar migraciones y
    recuperar una versión anterior.
