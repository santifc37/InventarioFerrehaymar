
import { Router, Request, Response } from 'express'
import { requiereAuth } from '../middleware/requiereAuth'
import {
  listarProductos,
  crearProducto,
  editarProducto,
  desactivarProducto,
} from '../services/productos.service'

const router = Router()

router.get('/', requiereAuth, async (req: Request, res: Response) => {
  try {
    
const activoParam = req.query.activo
let activo: boolean | undefined

if (activoParam !== undefined) {
  if (activoParam === 'true') {
    activo = true
  } else if (activoParam === 'false') {
    activo = false
  } else {
    return res.status(400).json({
      error: 'El parámetro activo debe ser true o false',
    })
  }
}

const productos = await listarProductos(activo)

    return res.json(productos)
  } catch {
    return res.status(500).json({
      error: 'No fue posible consultar los productos',
    })
  }
})


router.post('/', requiereAuth, async (req: Request, res: Response) => {
  const {
    codigo,
    codigo_barras,
    nombre,
    descripcion,
    categoria_id,
    unidad_base_id,
    precio_compra,
    precio_venta,
    stock_minimo,
  } = req.body || {}

  if (
    typeof codigo !== 'string' ||
    !codigo.trim() ||
    typeof nombre !== 'string' ||
    !nombre.trim()
  ) {
    return res.status(400).json({
      error: 'El código y el nombre del producto son obligatorios',
    })
  }

  if (
    typeof categoria_id !== 'string' ||
    typeof unidad_base_id !== 'string'
  ) {
    return res.status(400).json({
      error: 'La categoría y la unidad base son obligatorias',
    })
  }

  if (
    (codigo_barras !== undefined &&
      codigo_barras !== null &&
      typeof codigo_barras !== 'string') ||
    (descripcion !== undefined &&
      descripcion !== null &&
      typeof descripcion !== 'string')
  ) {
    return res.status(400).json({
      error: 'El código de barras y la descripción deben ser textos',
    })
  }

  const precios = [precio_compra, precio_venta, stock_minimo]

  if (
    precios.some(
      (valor) =>
        typeof valor !== 'number' ||
        !Number.isFinite(valor) ||
        valor < 0,
    )
  ) {
    return res.status(400).json({
      error: 'Los precios y el stock mínimo deben ser números no negativos',
    })
  }

  try {
    const producto = await crearProducto({
      codigo,
      codigo_barras,
      nombre,
      descripcion,
      categoria_id,
      unidad_base_id,
      precio_compra,
      precio_venta,
      stock_minimo,
    })

    return res.status(201).json(producto)
  } catch {
    return res.status(500).json({
      error: 'No fue posible crear el producto. Verifica la categoría, la unidad y que el código no esté duplicado.',
    })
  }
})


router.patch('/:id', requiereAuth, async (req: Request, res: Response) => {
  const id = req.params.id

  if (typeof id !== 'string') {
    return res.status(400).json({
      error: 'Identificador de producto inválido',
    })
  }

  const {
    codigo,
    codigo_barras,
    nombre,
    descripcion,
    categoria_id,
    unidad_base_id,
    precio_compra,
    precio_venta,
    stock_minimo,
  } = req.body || {}

  if (
    typeof codigo !== 'string' ||
    !codigo.trim() ||
    typeof nombre !== 'string' ||
    !nombre.trim()
  ) {
    return res.status(400).json({
      error: 'El código y el nombre del producto son obligatorios',
    })
  }

  if (
    typeof categoria_id !== 'string' ||
    typeof unidad_base_id !== 'string'
  ) {
    return res.status(400).json({
      error: 'La categoría y la unidad base son obligatorias',
    })
  }

  if (
    (codigo_barras !== undefined &&
      codigo_barras !== null &&
      typeof codigo_barras !== 'string') ||
    (descripcion !== undefined &&
      descripcion !== null &&
      typeof descripcion !== 'string')
  ) {
    return res.status(400).json({
      error: 'El código de barras y la descripción deben ser textos',
    })
  }

  const precios = [precio_compra, precio_venta, stock_minimo]

  if (
    precios.some(
      (valor) =>
        typeof valor !== 'number' ||
        !Number.isFinite(valor) ||
        valor < 0,
    )
  ) {
    return res.status(400).json({
      error: 'Los precios y el stock mínimo deben ser números no negativos',
    })
  }

  try {
    const producto = await editarProducto(id, {
      codigo,
      codigo_barras,
      nombre,
      descripcion,
      categoria_id,
      unidad_base_id,
      precio_compra,
      precio_venta,
      stock_minimo,
    })

    return res.json(producto)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Producto no encontrado'
    ) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'No fue posible editar el producto. Verifica la categoría, la unidad y que el código no esté duplicado.',
    })
  }
})


router.patch(
  '/:id/desactivar',
  requiereAuth,
  async (req: Request, res: Response) => {
    const id = req.params.id

    if (typeof id !== 'string') {
      return res.status(400).json({
        error: 'Identificador de producto inválido',
      })
    }

    try {
      const producto = await desactivarProducto(id)
      return res.json(producto)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Producto no encontrado'
      ) {
        return res.status(404).json({ error: error.message })
      }

      return res.status(500).json({
        error: 'No fue posible desactivar el producto',
      })
    }
  },
)


export const productosRouter = router
