
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Autenticación de rutas de ventas', () => {
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
    vi.resetModules()
  })

  it('rechaza consultar el historial sin autenticación', async () => {
    const { crearApp } = await import('../src/app.js')

    const res = await request(crearApp()).get('/ventas')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('No autorizado')
  })

  it('rechaza consultar una venta sin autenticación', async () => {
    const { crearApp } = await import('../src/app.js')

    const res = await request(crearApp()).get(
      '/ventas/00000000-0000-4000-8000-000000000001',
    )

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('No autorizado')
  })

  it('rechaza registrar una venta sin autenticación', async () => {
    const { crearApp } = await import('../src/app.js')

    const res = await request(crearApp())
      .post('/ventas')
      .send({
        items: [
          {
            producto_id: '00000000-0000-4000-8000-000000000001',
            cantidad: 1,
            precio_unitario: 1000,
          },
        ],
      })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('No autorizado')
  })

  it('rechaza anular una venta sin autenticación', async () => {
    const { crearApp } = await import('../src/app.js')

    const res = await request(crearApp())
      .post('/ventas/00000000-0000-4000-8000-000000000001/anular')
      .send({ motivo: 'Prueba automatizada' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('No autorizado')
  })

  it('rechaza corregir una venta sin autenticación', async () => {
    const { crearApp } = await import('../src/app.js')

    const res = await request(crearApp())
      .post('/ventas/00000000-0000-4000-8000-000000000001/corregir')
      .send({
        motivo: 'Prueba automatizada',
        items: [
          {
            producto_id: '00000000-0000-4000-8000-000000000001',
            cantidad: 1,
            precio_unitario: 1000,
          },
        ],
      })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('No autorizado')
  })

  
  it('rechaza registrar una venta autenticada sin clave de idempotencia', async () => {
    const { crearApp } = await import('../src/app.js')
    const app = crearApp()
    const agente = request.agent(app)

    const login = await agente.post('/auth/login').send({
      contrasena: 'test-password-for-vitest-only',
    })

    expect(login.status).toBe(200)

    const res = await agente.post('/ventas').send({
      items: [
        {
          producto_id: '00000000-0000-4000-8000-000000000001',
          cantidad: 1,
          precio_unitario: 1000,
        },
      ],
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Idempotency-Key')
  })

  it('rechaza corregir una venta autenticada sin clave de idempotencia', async () => {
    const { crearApp } = await import('../src/app.js')
    const app = crearApp()
    const agente = request.agent(app)

    const login = await agente.post('/auth/login').send({
      contrasena: 'test-password-for-vitest-only',
    })

    expect(login.status).toBe(200)

    const res = await agente
      .post('/ventas/00000000-0000-4000-8000-000000000001/corregir')
      .send({
        motivo: 'Corrección de prueba',
        items: [
          {
            producto_id: '00000000-0000-4000-8000-000000000001',
            cantidad: 1,
            precio_unitario: 1000,
          },
        ],
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Idempotency-Key')
  })

})
