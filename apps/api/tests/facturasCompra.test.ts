import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validarSolicitudImportacion } from '../src/utils/facturasCompra'

const PRODUCTO = '11111111-1111-4111-8111-111111111111'

function solicitudBase() {
  return {
    proveedor_nit: '900123456',
    proveedor_nombre: 'Proveedor SAS',
    numero: 'FE-1001',
    fecha_emision: '2026-10-30',
    tipo_documento: 'factura',
    lineas: [
      {
        linea: 1,
        producto_id: PRODUCTO,
        descripcion: 'Pulidora 4.5"',
        codigo_proveedor: 'P-1',
        cantidad: 3,
        unidad: 'UND',
        precio_unitario: 185000,
        estado_coincidencia: 'coincidencia_alta',
        importar: true,
        actualizar_precio: true,
        precio_nuevo: 185000,
      },
      {
        linea: 2,
        producto_id: null,
        descripcion: 'Producto que no existe',
        codigo_proveedor: null,
        cantidad: 1,
        unidad: null,
        precio_unitario: 5000,
        estado_coincidencia: 'sin_coincidencia',
        importar: false,
        actualizar_precio: false,
        precio_nuevo: null,
      },
    ],
  }
}

describe('validarSolicitudImportacion', () => {
  it('acepta una solicitud correcta', () => {
    const resultado = validarSolicitudImportacion(solicitudBase())

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.datos.lineas).toHaveLength(2)
      expect(resultado.datos.lineas[1].producto_id).toBeNull()
    }
  })

  it('rechaza cuerpos que no son objetos', () => {
    expect(validarSolicitudImportacion(null).ok).toBe(false)
    expect(validarSolicitudImportacion('texto').ok).toBe(false)
  })

  it('exige NIT y número de factura', () => {
    const sinNit = { ...solicitudBase(), proveedor_nit: '  ' }
    const sinNumero = { ...solicitudBase(), numero: undefined }

    expect(validarSolicitudImportacion(sinNit).ok).toBe(false)
    expect(validarSolicitudImportacion(sinNumero).ok).toBe(false)
  })

  it('solo acepta facturas (no notas crédito)', () => {
    const nota = { ...solicitudBase(), tipo_documento: 'nota_credito' }

    expect(validarSolicitudImportacion(nota).ok).toBe(false)
  })

  it('rechaza fechas imposibles', () => {
    const solicitud = { ...solicitudBase(), fecha_emision: '2026-02-31' }

    expect(validarSolicitudImportacion(solicitud).ok).toBe(false)
  })

  it('rechaza una línea a importar sin producto', () => {
    const solicitud = solicitudBase()
    solicitud.lineas[0].producto_id = null as unknown as string

    expect(validarSolicitudImportacion(solicitud).ok).toBe(false)
  })

  it('rechaza cantidades en cero o negativas en líneas a importar', () => {
    const solicitud = solicitudBase()
    solicitud.lineas[0].cantidad = 0

    expect(validarSolicitudImportacion(solicitud).ok).toBe(false)
  })

  it('rechaza cambiar el precio de una línea que no se importa', () => {
    const solicitud = solicitudBase()
    solicitud.lineas[1].actualizar_precio = true
    solicitud.lineas[1].precio_nuevo = 100

    expect(validarSolicitudImportacion(solicitud).ok).toBe(false)
  })

  it('rechaza cambios de precio sin un precio nuevo válido', () => {
    const solicitud = solicitudBase()
    solicitud.lineas[0].precio_nuevo = 0

    expect(validarSolicitudImportacion(solicitud).ok).toBe(false)
  })

  it('rechaza identificadores de producto que no son UUID', () => {
    const solicitud = solicitudBase()
    solicitud.lineas[0].producto_id = 'no-es-uuid'

    expect(validarSolicitudImportacion(solicitud).ok).toBe(false)
  })

  it('rechaza números de línea repetidos', () => {
    const solicitud = solicitudBase()
    solicitud.lineas[1].linea = 1

    expect(validarSolicitudImportacion(solicitud).ok).toBe(false)
  })

  it('exige al menos una línea para importar', () => {
    const solicitud = solicitudBase()
    solicitud.lineas[0].importar = false
    solicitud.lineas[0].actualizar_precio = false

    expect(validarSolicitudImportacion(solicitud).ok).toBe(false)
  })

  it('rechaza estados de coincidencia desconocidos', () => {
    const solicitud = solicitudBase()
    solicitud.lineas[0].estado_coincidencia = 'otro' as 'coincidencia_alta'

    expect(validarSolicitudImportacion(solicitud).ok).toBe(false)
  })
})

describe('Rutas de facturas de compra', () => {
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

  it('exige autenticación en todas las rutas', async () => {
    const { crearApp } = await import('../src/app.js')
    const app = crearApp()

    const respuestas = await Promise.all([
      request(app).get('/facturas-compra'),
      request(app).get('/facturas-compra/existe?nit=1&numero=2'),
      request(app).get(`/facturas-compra/${PRODUCTO}`),
      request(app).get(`/facturas-compra/precios/${PRODUCTO}`),
      request(app).post('/facturas-compra').send(solicitudBase()),
    ])

    for (const respuesta of respuestas) {
      expect(respuesta.status).toBe(401)
    }
  })

  it('rechaza una importación inválida antes de tocar la base de datos', async () => {
    const { crearApp } = await import('../src/app.js')
    const { firmarSesion, NOMBRE_COOKIE_SESION } = await import('../src/utils/sesion.js')

    const res = await request(crearApp())
      .post('/facturas-compra')
      .set('Cookie', `${NOMBRE_COOKIE_SESION}=${firmarSesion()}`)
      .send({ ...solicitudBase(), lineas: [] })

    expect(res.status).toBe(400)
    expect(res.body.error).toBeTruthy()
  })

  it('valida los parámetros de la consulta de existencia', async () => {
    const { crearApp } = await import('../src/app.js')
    const { firmarSesion, NOMBRE_COOKIE_SESION } = await import('../src/utils/sesion.js')

    const res = await request(crearApp())
      .get('/facturas-compra/existe?nit=900')
      .set('Cookie', `${NOMBRE_COOKIE_SESION}=${firmarSesion()}`)

    expect(res.status).toBe(400)
  })
})
