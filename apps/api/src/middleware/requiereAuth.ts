import { Request, Response, NextFunction } from 'express'
import { NOMBRE_COOKIE_SESION, verificarSesion } from '../utils/sesion'

export interface UsuarioSesion {
  autenticado: boolean
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioSesion
    }
  }
}

export function requiereAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[NOMBRE_COOKIE_SESION]

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const payload = verificarSesion(token)
    req.usuario = { autenticado: payload.autenticado }
    return next()
  } catch {
    return res.status(401).json({ error: 'No autorizado' })
  }
}
