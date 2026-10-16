import express from 'express';
import { healthRouter } from './routes/health';

// Configura Express (middleware y rutas). No inicia el puerto: eso lo hace server.ts.
export function crearApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(healthRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  return app;
}
