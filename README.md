# Inventario Ferrehaymar

Aplicación web privada para administrar el inventario y registrar las ventas de una ferretería física. No es una caja registradora: las ventas se registran después de atender a los clientes.

> Estado: **Fase 2** (estructura mínima ejecutable). El README se completa en la Fase 14.

## Requisitos

- Node.js 22 o superior (`.nvmrc` indica la versión).
- npm 10 o superior.

## Instalación

```bash
npm install
```

## Ejecutar en desarrollo

Se usan dos terminales, una para la API y otra para el frontend:

```bash
npm run dev:api     # API en http://localhost:4000
npm run dev:web     # Frontend en http://localhost:3000
```

Comprobaciones rápidas:

- API: abrir <http://localhost:4000/health>. Debe responder `{"estado":"ok", ...}`.
- Frontend: abrir <http://localhost:3000>. Debe mostrar si la API está conectada.

En esta fase no hacen falta variables de entorno: la API usa el puerto 4000 y el frontend busca la API en `http://localhost:4000`. Si necesitas cambiarlos, ver `.env.example`.

## Otros comandos

```bash
npm run build       # compila API y frontend
npm run typecheck   # revisa los tipos de TypeScript
npm test            # ejecuta las pruebas automáticas
npm run start:api   # inicia la API compilada (después de build)
npm run start:web   # inicia el frontend compilado (después de build)
```

## Estructura

```
apps/api/     API (Node.js + Express + TypeScript)
apps/web/     Frontend (Next.js + TypeScript)
supabase/     Migraciones y pruebas de la base de datos
docs/         Arquitectura, decisiones técnicas y esquema de la base de datos
```

## Documentación

- [`docs/arquitectura.md`](docs/arquitectura.md)
- [`docs/decisiones-tecnicas.md`](docs/decisiones-tecnicas.md)
- [`docs/database/schema.md`](docs/database/schema.md)

## Seguridad

Nunca se versionan archivos `.env` ni claves. El frontend no accede a la base de datos ni recibe claves privilegiadas.
