
import { Router, Request, Response } from 'express'
import { requiereAuth } from '../middleware/requiereAuth'
import {     listarCategorias,
  crearCategoria,
  editarCategoria,
  desactivarCategoria, } from '../services/categorias.service'

const router = Router()

router.get('/', requiereAuth, async (_req: Request, res: Response) => {
  try {
    const categorias = await listarCategorias()
    return res.json(categorias)
  } catch {
    return res.status(500).json({
      error: 'No fue posible consultar las categorías',
    })
  }
})


router.post('/', requiereAuth, async (req: Request, res: Response) => {
  const { nombre, descripcion } = req.body || {}

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({
      error: 'El nombre de la categoría es obligatorio',
    })
  }

  if (
    descripcion !== undefined &&
    descripcion !== null &&
    typeof descripcion !== 'string'
  ) {
    return res.status(400).json({
      error: 'La descripción debe ser un texto',
    })
  }

  try {
    const categoria = await crearCategoria(nombre, descripcion)
    return res.status(201).json(categoria)
  } catch {
    return res.status(500).json({
      error: 'No fue posible crear la categoría',
    })
  }
})


router.patch('/:id', requiereAuth, async (req: Request, res: Response) => {
  const id = req.params.id

if (typeof id !== 'string') {
  return res.status(400).json({
    error: 'Identificador de categoría inválido',
  })
}
  const { nombre, descripcion } = req.body || {}

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({
      error: 'El nombre de la categoría es obligatorio',
    })
  }

  if (
    descripcion !== undefined &&
    descripcion !== null &&
    typeof descripcion !== 'string'
  ) {
    return res.status(400).json({
      error: 'La descripción debe ser un texto',
    })
  }

  try {
    const categoria = await editarCategoria(id, nombre, descripcion)
    return res.json(categoria)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Categoría no encontrada'
    ) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'No fue posible editar la categoría',
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
        error: 'Identificador de categoría inválido',
      })
    }

    try {
      const categoria = await desactivarCategoria(id)
      return res.json(categoria)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Categoría no encontrada'
      ) {
        return res.status(404).json({ error: error.message })
      }

      return res.status(500).json({
        error: 'No fue posible desactivar la categoría',
      })
    }
  },
)


export const categoriasRouter = router
