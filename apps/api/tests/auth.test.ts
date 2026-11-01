import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GET /auth/me', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      SESSION_SECRET: 'test-session-secret-for-vitest-only',
      AUTH_PASSWORD: 'test-password-for-vitest-only',
      NODE_ENV: 'test',
    }
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  async function crear() {
    const { crearApp } = await import('../src/app.js')
    return crearApp()
  }

  it('sin cookie responde 200 con autenticado false', async () => {
    const respuesta = await request(await crear()).get('/auth/me')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toEqual({ autenticado: false })
  })

  it('con cookie inválida responde 200 con autenticado false', async () => {
    const respuesta = await request(await crear())
      .get('/auth/me')
      .set('Cookie', 'sesion=token-falso')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toEqual({ autenticado: false })
  })

  it('con sesión válida responde autenticado true', async () => {
    const app = await crear()
    const login = await request(app)
      .post('/auth/login')
      .send({ contrasena: 'test-password-for-vitest-only' })

    expect(login.status).toBe(200)

    const respuesta = await request(app)
      .get('/auth/me')
      .set('Cookie', login.headers['set-cookie'])

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toEqual({ autenticado: true })
  })
})
