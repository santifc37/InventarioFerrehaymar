
import { Router, Request, Response } from 'express'
import { requiereAuth } from '../middleware/requiereAuth'
import {
  registrarVenta,
  listarVentas,
  obtenerVenta,
  anularVenta,
  corregirVenta,
} from '../services/ventas.service'

const ventasRouter = Router()

ventasRouter.use(requiereAuth)

/**
 * Obtiene y valida el identificador de venta de la ruta.
 */
function obtenerIdVenta(req: Request): string | null {
  const id = req.params.id
  return typeof id === 'string' ? id : null
}

// GET /ventas
// Lista las ventas, con filtros opcionales por fecha.
ventasRouter.get('/', async (req: Request, res: Response) => {
  try {
    const fechaDesde =
      typeof req.query.fecha_desde === 'string'
        ? req.query.fecha_desde
        : undefined

    const fechaHasta =
      typeof req.query.fecha_hasta === 'string'
        ? req.query.fecha_hasta
        : undefined

    const ventas = await listarVentas(fechaDesde, fechaHasta)

    return res.json({ datos: ventas })
  } catch (error) {
    console.error('Error en GET /ventas:', error)

    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : 'Error al consultar ventas.',
    })
  }
})

// GET /ventas/:id
// Consulta una venta por su identificador.
ventasRouter.get('/:id', async (req: Request, res: Response) => {
  const id = obtenerIdVenta(req)

  if (!id) {
    return res.status(400).json({
      error: 'Identificador de venta inválido.',
    })
  }

  try {
    const venta = await obtenerVenta(id)

    return res.json({ datos: venta })
  } catch (error) {
    console.error('Error en GET /ventas/:id:', error)

    const mensaje =
      error instanceof Error
        ? error.message
        : 'Error al consultar la venta.'

    const status = mensaje === 'Venta no encontrada.' ? 404 : 400

    return res.status(status).json({ error: mensaje })
  }
})

// POST /ventas
// Registra una nueva venta.
ventasRouter.post('/', async (req: Request, res: Response) => {
  try {
    const clave = req.get('Idempotency-Key')

if (!clave || !clave.trim()) {
  return res.status(400).json({
    error: 'Debes proporcionar la cabecera Idempotency-Key.',
  })
}

const venta = await registrarVenta(req.body, 'vendedor', clave)

    return res.status(201).json({
      mensaje: 'Venta registrada.',
      datos: venta,
    })
  } catch (error) {
    console.error('Error en POST /ventas:', error)

    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : 'Error al registrar la venta.',
    })
  }
})

// POST /ventas/:id/anular
// Anula una venta con un motivo obligatorio.
ventasRouter.post('/:id/anular', async (req: Request, res: Response) => {
  const id = obtenerIdVenta(req)

  if (!id) {
    return res.status(400).json({
      error: 'Identificador de venta inválido.',
    })
  }

  try {
    const { motivo } = req.body ?? {}

    if (typeof motivo !== 'string') {
      return res.status(400).json({
        error: 'Debes indicar el motivo de anulación.',
      })
    }

    const resultado = await anularVenta(id, motivo, 'vendedor')

    return res.json({
      mensaje: 'Venta anulada.',
      datos: resultado,
    })
  } catch (error) {
    console.error('Error en POST /ventas/:id/anular:', error)

    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : 'Error al anular la venta.',
    })
  }
})

// POST /ventas/:id/corregir
// Corrige una venta conservando su historial.
ventasRouter.post('/:id/corregir', async (req: Request, res: Response) => {
  const id = obtenerIdVenta(req)

  if (!id) {
    return res.status(400).json({
      error: 'Identificador de venta inválido.',
    })
  }

  try {
    const clave = req.get('Idempotency-Key')

    if (!clave || !clave.trim()) {
      return res.status(400).json({
        error: 'Debes proporcionar la cabecera Idempotency-Key.',
      })
    }

    const venta = await corregirVenta(
      id,
      req.body,
      'vendedor',
      clave,
    )

    return res.json({
      mensaje: 'Venta corregida.',
      datos: venta,
    })
  } catch (error) {
    console.error('Error en POST /ventas/:id/corregir:', error)

    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : 'Error al corregir la venta.',
    })
  }
})

export { ventasRouter }
