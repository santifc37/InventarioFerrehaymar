import { Router, Request, Response } from 'express'
import { getEnv } from '../lib/env'
import {
  firmarSesion,
  opcionesCookieSesion,
  verificarSesion,
  NOMBRE_COOKIE_SESION,
} from '../utils/sesion'

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

// Informa si hay una sesión válida. Nunca responde 401: sin sesión devuelve
// { autenticado: false }.
router.get('/me', (req: Request, res: Response) => {
  const token = req.cookies?.[NOMBRE_COOKIE_SESION]

  if (!token) {
    return res.json({ autenticado: false })
  }

  try {
    const payload = verificarSesion(token)
    return res.json({ autenticado: payload.autenticado === true })
  } catch {
    return res.json({ autenticado: false })
  }
})

export const authRouter = router
