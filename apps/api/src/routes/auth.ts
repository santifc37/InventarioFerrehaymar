import { Router, Request, Response } from 'express'
import { getEnv } from '../lib/env'
import { firmarSesion, opcionesCookieSesion, NOMBRE_COOKIE_SESION } from '../utils/sesion'
import { requiereAuth } from '../middleware/requiereAuth'

const router = Router()
const AUTH_PASSWORD = getEnv('AUTH_PASSWORD')

router.post('/login', (req: Request, res: Response) => {
  const { contrasena } = req.body || {}

  if (typeof contrasena !== 'string') {
    return res.status(400).json({ error: 'Contraseña requerida' })
  }

  if (contrasena !== AUTH_PASSWORD) {
    return res.status(401).json({ error: 'Credenciales inválidas' })
  }

  const token = firmarSesion()
  res.cookie(NOMBRE_COOKIE_SESION, token, opcionesCookieSesion)
  return res.json({ autenticado: true })
})

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(NOMBRE_COOKIE_SESION, { path: '/' })
  return res.json({ ok: true })
})

router.get('/me', requiereAuth, (req: Request, res: Response) => {
  return res.json({ autenticado: req.usuario?.autenticado ?? true })
})

export const authRouter = router
