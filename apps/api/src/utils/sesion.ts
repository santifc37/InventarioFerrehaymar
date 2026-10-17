import jwt from 'jsonwebtoken'
import { getEnv } from '../lib/env'

const SESSION_SECRET = getEnv('SESSION_SECRET')
const NODE_ENV = getEnv('NODE_ENV', 'development')

export const NOMBRE_COOKIE_SESION = 'sesion'
export const TIEMPO_EXPIRACION_MS = 30 * 24 * 60 * 60 * 1000

export interface PayloadSesion {
  autenticado: boolean
  iat?: number
  exp?: number
}

export function firmarSesion(): string {
  const payload: PayloadSesion = { autenticado: true }
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: '30d' })
}

export function verificarSesion(token: string): PayloadSesion {
  const payload = jwt.verify(token, SESSION_SECRET) as PayloadSesion
  return payload
}

export const opcionesCookieSesion = {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: TIEMPO_EXPIRACION_MS,
  path: '/',
}
