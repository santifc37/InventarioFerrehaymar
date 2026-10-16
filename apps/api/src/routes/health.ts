import { Router } from 'express';

export const healthRouter = Router();

// Comprobación de salud: no toca la base de datos ni requiere sesión.
healthRouter.get('/health', (_req, res) => {
  res.json({
    estado: 'ok',
    servicio: 'ferrehaymar-api',
    fecha: new Date().toISOString(),
  });
});
