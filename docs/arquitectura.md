# Arquitectura — Inventario Ferrehaymar

> Última actualización: 2026-10-16 (Fase 0).
> Las direcciones reales de cada entorno se completan en la Fase 14. **Este archivo nunca contiene credenciales.**

## 1. Propósito y alcance

Aplicación web privada para administrar el inventario y registrar las ventas de una ferretería física.

- El vendedor atiende a los clientes normalmente y **registra las ventas después** (por ejemplo, al final del día).
- **No es una caja registradora ni un POS en tiempo real.** Por eso la fecha de la venta se elige al registrarla y se guarda aparte de la fecha de registro.
- Uso previsto: computador de escritorio, un solo negocio, acceso con una contraseña compartida (sin tabla de usuarios).

## 2. Componentes

| Componente | Tecnología | Despliegue | Responsabilidad |
|---|---|---|---|
| Frontend | Next.js + TypeScript | Vercel | Pantallas, formularios y navegación. No tiene acceso a la base de datos ni a claves privilegiadas. |
| API | Node.js + Express + TypeScript | Render | Autenticación, validación de datos, orquestación y respuestas coherentes. Única pieza que habla con Supabase. |
| Base de datos | PostgreSQL (Supabase) | Supabase | Datos, restricciones y reglas críticas (funciones RPC y triggers). |
| Control de versiones | Git + GitHub | GitHub | Historial y respaldo del código y las migraciones. |

## 3. Flujo de una operación

```
Navegador ──(1)──► API (Render) ──(2)──► Supabase / PostgreSQL
    ▲                                          │
    └──────────────(4) respuesta ◄──(3)────────┘
```

1. La interfaz envía una petición a la API con la sesión del usuario.
2. La API autentica, valida los datos y llama a Supabase con la clave `service_role` (solo en el servidor). Para operaciones con varias escrituras usa una función RPC.
3. PostgreSQL aplica restricciones, triggers y la función, todo en una transacción.
4. La API devuelve una respuesta (o un error controlado) y la interfaz actualiza la pantalla.

## 4. Reparto de responsabilidades

| Qué | Dónde vive | Por qué |
|---|---|---|
| Contraseña, sesión, CORS | API | El navegador no es de confianza. |
| Validación de formato de las peticiones | API | Errores claros antes de llegar a la base de datos. |
| Cálculo de stock, totales, conversión de unidades, movimientos | Base de datos | Una sola fuente de verdad, transaccional y a prueba de reintentos. |
| Advertencia por stock insuficiente | La base lanza el error `FH001`; la API/interfaz piden confirmación | La regla se aplica siempre, sin importar el cliente. |
| Historial inmutable | Base de datos (triggers) | Nadie puede alterar movimientos, ni siquiera por error de código. |

El detalle de tablas, funciones y reglas está en [`docs/database/schema.md`](database/schema.md).

## 5. Entornos

Los entornos de desarrollo y producción están **completamente separados**: proyectos distintos de Supabase, Render y Vercel, con variables distintas.

| Entorno | Supabase | API (Render) | Frontend (Vercel) |
|---|---|---|---|
| Desarrollo | Proyecto de desarrollo — _por definir_ | _por definir_ | _por definir_ / `http://localhost:3000` |
| Producción | Proyecto de producción — _por definir_ | _por definir_ | _por definir_ |

Reglas:
- Toda migración se aplica primero en desarrollo.
- Antes de ejecutar cualquier SQL se confirma a qué proyecto se está conectado.
- Las variables secretas se guardan en los paneles de cada servicio, nunca en Git. Ver `.env.example`.

## 6. Seguridad (resumen)

- RLS activado en todas las tablas, sin políticas para `anon`/`authenticated`; solo `service_role` accede.
- `SUPABASE_SERVICE_ROLE_KEY` únicamente en las variables de entorno de Render.
- Las rutas privadas se protegen en la API, no solo en el frontend.
- Cookie de sesión `HttpOnly`, `Secure` en producción (Fase 4). Ver decisión D-008 en `decisiones-tecnicas.md`.
- Los secretos no aparecen en el repositorio, el navegador, los registros ni los mensajes de error.

## 7. Estructura del repositorio

Estado al cierre de la Fase 0 (lo existente) y destino (se crea fase por fase):

```
Ferreteria/
├── .gitignore                      ✔ Fase 0
├── .env.example                    ✔ Fase 0
├── .nvmrc                          ✔ Fase 2
├── package.json                    ✔ Fase 2   (npm workspaces)
├── package-lock.json               ✔ Fase 2
├── README.md                       ✔ Fase 2   (se completa en la Fase 14)
├── docs/
│   ├── arquitectura.md             ✔ Fase 0
│   ├── decisiones-tecnicas.md      ✔ Fase 0
│   ├── pruebas-manuales.md         · Fase 13
│   └── database/schema.md          ✔ Fase 1
├── supabase/
│   ├── migrations/                 ✔ esquema inicial + funciones de negocio
│   └── tests/                      ✔ pruebas de humo SQL
├── apps/
│   ├── api/                        ✔ Fase 2   (Express + TypeScript; /health y su prueba)
│   │   ├── src/{app.ts, server.ts, routes/health.ts}
│   │   └── tests/health.test.ts
│   └── web/                        ✔ Fase 2   (Next.js + TypeScript; página inicial)
│       └── src/app/{layout.tsx, page.tsx, globals.css}
└── scripts/                        · Fase 13  (check-env, verify-project)
```

Carpetas como `middleware/`, `controllers/`, `services/`, `repositories/`, `validators/` (API) o `components/`, `features/` (web) se crean en la fase que las necesita.

Puertos en desarrollo: API `4000`, frontend `3000`.

La estructura interna de `apps/web` y `apps/api` está descrita en la guía de desarrollo por fases; cada carpeta se crea cuando su fase la necesita.

## 8. Estado actual

- Base de datos: esquema y funciones de negocio escritos y con pruebas de humo (Fase 1). Falta confirmar en cada proyecto de Supabase qué migraciones están realmente aplicadas.
- Aplicación (Fase 2): existe la estructura mínima. La API expone `GET /health` (sin base de datos ni sesión) y el frontend muestra si la API responde. Todavía **no** hay conexión con Supabase (Fase 3), autenticación (Fase 4) ni pantallas de negocio.
