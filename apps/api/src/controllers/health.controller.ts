import type { Request, Response } from 'express';
import { HealthService } from '../services/health.service';

export class HealthController {
  private readonly healthService = new HealthService();

  async check(_req: Request, res: Response): Promise<void> {
    const result = await this.healthService.check();

    const statusCode = result.db === 'ok' ? 200 : 503;

    res.status(statusCode).json({
      estado: 'ok',
      servicio: 'ferrehaymar-api',
      fecha: new Date().toISOString(),
      db: result.db,
      ...(result.mensajeDb ? { mensajeDb: result.mensajeDb } : {}),
    });
  }
}
