
import { Router, Request, Response, NextFunction } from 'express'
import { requiereAuth } from '../middleware/requiereAuth'
import { listarUnidades } from '../services/unidades.service'

const router = Router()

router.get('/', requiereAuth, async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const unidades = await listarUnidades()
    res.json({ datos: unidades })
  } catch (error) {
    next(error)
  }
})

export default router
