
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}))

vi.mock('../src/config/supabase.js', () => ({
  getSupabaseClient: () => ({
    rpc: rpcMock,
  }),
}))

describe('Servicio de ventas: idempotencia', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envía la clave de idempotencia al registrar una venta', async () => {
    rpcMock.mockResolvedValue({
      data: '00000000-0000-4000-8000-000000000010',
      error: null,
    })

    const { registrarVenta } = await import('../src/services/ventas.service.js')

    const clave = 'prueba-registro-001'

    const resultado = await registrarVenta(
      {
        items: [
          {
            producto_id: '00000000-0000-4000-8000-000000000001',
            cantidad: 1,
            precio_unitario: 1000,
          },
        ],
      },
      'vendedor',
      clave,
    )

    expect(resultado.id).toBe('00000000-0000-4000-8000-000000000010')
    expect(rpcMock).toHaveBeenCalledOnce()
    expect(rpcMock).toHaveBeenCalledWith(
      'registrar_venta',
      expect.objectContaining({
        p_usuario: 'vendedor',
        p_clave: clave,
      }),
    )
  })

  
  it('envía la clave de idempotencia al corregir una venta', async () => {
    rpcMock.mockResolvedValue({
      data: '00000000-0000-4000-8000-000000000020',
      error: null,
    })

    const { corregirVenta } = await import('../src/services/ventas.service.js')

    const clave = 'prueba-correccion-001'

    const resultado = await corregirVenta(
      '00000000-0000-4000-8000-000000000010',
      {
        motivo: 'Corrección de prueba',
        items: [
          {
            producto_id: '00000000-0000-4000-8000-000000000001',
            cantidad: 2,
            precio_unitario: 1200,
          },
        ],
      },
      'vendedor',
      clave,
    )

    expect(resultado.id).toBe('00000000-0000-4000-8000-000000000020')
    expect(rpcMock).toHaveBeenCalledOnce()
    expect(rpcMock).toHaveBeenCalledWith(
      'corregir_venta',
      expect.objectContaining({
        p_venta_id: '00000000-0000-4000-8000-000000000010',
        p_usuario: 'vendedor',
        p_clave: clave,
      }),
    )
  })

})
