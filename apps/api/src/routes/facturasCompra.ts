import { Router, Request, Response } from 'express'
import { requiereAuth } from '../middleware/requiereAuth'
import {
  buscarFacturaCompra,
  ErrorValidacionFactura,
  historialPreciosProducto,
  importarFacturaCompra,
  listarFacturasCompra,
  obtenerFacturaCompra,
} from '../services/facturasCompra.service'
import { esUuid, validarSolicitudImportacion } from '../utils/facturasCompra'

const router = Router()

// Historial de facturas importadas.
router.get('/', requiereAuth, async (_req: Request, res: Response) => {
  try {
    const facturas = await listarFacturasCompra()

    return res.json({ facturas, total: facturas.length })
  } catch (error) {
    console.error('Error en GET /facturas-compra:', error)

    return res.status(500).json({
      error: 'No fue posible consultar el historial de facturas',
    })
  }
})

// ¿Esta factura ya fue importada? (proveedor + número)
router.get('/existe', requiereAuth, async (req: Request, res: Response) => {
  const { nit, numero } = req.query

  if (typeof nit !== 'string' || !nit.trim() || typeof numero !== 'string' || !numero.trim()) {
    return res.status(400).json({
      error: 'El NIT del proveedor y el número de la factura son obligatorios',
    })
  }

  try {
    return res.json(await buscarFacturaCompra(nit, numero))
  } catch (error) {
    console.error('Error en GET /facturas-compra/existe:', error)

    return res.status(500).json({
      error: 'No fue posible consultar la factura',
    })
  }
})

// Evolución de precios de un producto.
router.get('/precios/:productoId', requiereAuth, async (req: Request, res: Response) => {
  const { productoId } = req.params

  if (!esUuid(productoId)) {
    return res.status(400).json({ error: 'Identificador de producto inválido' })
  }

  try {
    const historial = await historialPreciosProducto(productoId)

    return res.json({ historial, total: historial.length })
  } catch (error) {
    console.error('Error en GET /facturas-compra/precios:', error)

    return res.status(500).json({
      error: 'No fue posible consultar el historial de precios',
    })
  }
})

router.get('/:id', requiereAuth, async (req: Request, res: Response) => {
  const { id } = req.params

  if (!esUuid(id)) {
    return res.status(400).json({ error: 'Identificador de factura inválido' })
  }

  try {
    const factura = await obtenerFacturaCompra(id)

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' })
    }

    return res.json(factura)
  } catch (error) {
    console.error('Error en GET /facturas-compra/:id:', error)

    return res.status(500).json({
      error: 'No fue posible consultar la factura',
    })
  }
})

// Importación confirmada por el usuario. Es idempotente: repetir la solicitud
// no duplica entradas ni cambios de precio (responde 409 con duplicada = true).
router.post('/', requiereAuth, async (req: Request, res: Response) => {
  const validacion = validarSolicitudImportacion(req.body)

  if (!validacion.ok) {
    return res.status(400).json({ error: validacion.error })
  }

  try {
    const resultado = await importarFacturaCompra(validacion.datos)

    if (resultado.duplicada) {
      return res.status(409).json({
        error: 'Esta factura ya fue importada',
        duplicada: true,
        factura_id: resultado.factura_id,
        importada_en: resultado.importada_en,
      })
    }

    return res.status(201).json({
      mensaje: 'Factura importada correctamente',
      duplicada: false,
      factura_id: resultado.factura_id,
      ajuste_entrada_id: resultado.ajuste_entrada_id,
      lineas_importadas: resultado.lineas_importadas,
      precios_actualizados: resultado.precios_actualizados,
    })
  } catch (error) {
    if (error instanceof ErrorValidacionFactura) {
      return res.status(400).json({ error: error.message })
    }

    console.error('Error en POST /facturas-compra:', error)

    return res.status(500).json({
      error: 'No fue posible importar la factura',
    })
  }
})

export const facturasCompraRouter = router
