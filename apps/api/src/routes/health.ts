import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

export const healthRouter = Router();
const healthController = new HealthController();

// Comprobación de salud: verifica conexión con base de datos
healthRouter.get('/health', healthController.check.bind(healthController));
