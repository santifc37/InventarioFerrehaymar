
import { Router } from 'express'
import { requiereAuth } from '../middleware/requiereAuth'
import {
  listarStockProductos,
  listarMovimientosInventario,
  registrarAjuste,
  registrarEntrada,
} from '../services/inventario.service'

const router = Router()


router.get('/stock', requiereAuth, async (req, res) => {
  try {
    const activoParam = req.query.activo
    let activo: boolean | undefined

    if (activoParam !== undefined) {
      if (activoParam === 'true') {
        activo = true
      } else if (activoParam === 'false') {
        activo = false
      } else {
        res.status(400).json({
          error: 'El parámetro activo debe ser true o false',
        })
        return
      }
    }

    const productos = await listarStockProductos(activo)

    res.status(200).json({
      productos,
      total: productos.length,
    })
  } catch (error) {
    console.error('Error en GET /inventario/stock:', error)

    res.status(500).json({
      error: 'No fue posible consultar el inventario',
    })
  }
})


router.post('/entradas', requiereAuth, async (req, res) => {
  try {
    const { motivo, observaciones, items } = req.body ?? {}

    if (typeof motivo !== 'string' || !motivo.trim()) {
      res.status(400).json({ error: 'El motivo es obligatorio' })
      return
    }

    if (
      observaciones !== undefined &&
      observaciones !== null &&
      typeof observaciones !== 'string'
    ) {
      res.status(400).json({ error: 'Las observaciones no son válidas' })
      return
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        error: 'Debe incluir al menos un producto',
      })
      return
    }

    for (const item of items) {
      if (
        !item ||
        typeof item.producto_id !== 'string' ||
        !item.producto_id.trim() ||
        typeof item.unidad_id !== 'string' ||
        !item.unidad_id.trim() ||
        typeof item.cantidad !== 'number' ||
        !Number.isFinite(item.cantidad) ||
        item.cantidad <= 0
      ) {
        res.status(400).json({
          error:
            'Cada producto debe tener identificadores válidos y una cantidad mayor que cero',
        })
        return
      }
    }

    // El responsable se fija en el backend; no se acepta del cliente.
    const usuario_actor = 'vendedor'

    const resultado = await registrarEntrada({
      motivo,
      usuario_actor,
      observaciones,
      items,
    })

    res.status(201).json({
      mensaje: 'Entrada de inventario registrada correctamente',
      id: resultado.id,
    })

  } catch (error) {
    console.error('Error en POST /inventario/entradas:', error)

    const mensaje =
      error instanceof Error ? error.message : ''

    const erroresValidacion = [
      'El motivo es obligatorio',
      'El usuario actor es obligatorio',
      'Debe incluir al menos un producto',
      'Los datos de uno de los productos no son válidos',
    ]

    if (erroresValidacion.includes(mensaje)) {
      res.status(400).json({ error: mensaje })
      return
    }

    res.status(500).json({
      error: 'No fue posible registrar la entrada de inventario',
    })
  }
})


router.post('/ajustes', requiereAuth, async (req, res) => {
  const {
    motivo,
    observaciones,
    items,
    confirmar_stock_negativo,
    fecha,
    clave,
  } = req.body

  if (typeof motivo !== 'string' || !motivo.trim()) {
    res.status(400).json({ error: 'El motivo es obligatorio' })
    return
  }

  if (
    observaciones !== undefined &&
    observaciones !== null &&
    typeof observaciones !== 'string'
  ) {
    res.status(400).json({ error: 'Las observaciones no son válidas' })
    return
  }

  if (
    confirmar_stock_negativo !== undefined &&
    typeof confirmar_stock_negativo !== 'boolean'
  ) {
    res.status(400).json({
      error: 'La confirmación de stock negativo debe ser booleana',
    })
    return
  }

  if (
    fecha !== undefined &&
    (typeof fecha !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      !Number.isFinite(Date.parse(`${fecha}T00:00:00Z`)) ||
      new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) !== fecha)
  ) {
    res.status(400).json({ error: 'La fecha no es válida' })
    return
  }

  if (clave !== undefined && (typeof clave !== 'string' || !clave.trim())) {
    res.status(400).json({ error: 'La clave no es válida' })
    return
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      error: 'Debe incluir al menos un producto',
    })
    return
  }

  for (const item of items) {
    if (
      !item ||
      typeof item.producto_id !== 'string' ||
      typeof item.unidad_id !== 'string' ||
      typeof item.cantidad !== 'number' ||
      !Number.isFinite(item.cantidad) ||
      item.cantidad === 0
    ) {
      res.status(400).json({
        error: 'Los datos de uno de los productos no son válidos',
      })
      return
    }
  }

  try {
    const resultado = await registrarAjuste({
      motivo,
      usuario_actor: 'vendedor',
      observaciones,
      items,
      confirmar_stock_negativo: confirmar_stock_negativo ?? false,
      fecha,
      clave,
    })

    res.status(201).json({
      mensaje: 'Ajuste de inventario registrado correctamente',
      id: resultado.id,
    })
  } catch (error) {
    

console.error('Error en POST /inventario/ajustes:', error)

if (
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'FH001'
) {
  res.status(409).json({
    error: 'Stock insuficiente para realizar el ajuste',
    requiere_confirmacion: true,
  })
  return
}

res.status(500).json({
  error: 'No fue posible registrar el ajuste de inventario',
})

  }
})

router.get('/movimientos', requiereAuth, async (_req, res) => {
  try {
    const movimientos = await listarMovimientosInventario()

    res.json({
      movimientos,
      total: movimientos.length,
    })
  } catch (error) {
    console.error('Error al consultar el historial de inventario:', error)

    res.status(500).json({
      error: 'No fue posible consultar el historial de inventario',
    })
  }
})


export default router
