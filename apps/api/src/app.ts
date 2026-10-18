import express, { Application } from 'express'
import cookieParser from 'cookie-parser'
import { healthRouter } from './routes/health'
import { authRouter } from './routes/auth'
import { categoriasRouter } from './routes/categorias'
import { productosRouter } from './routes/productos'
import inventarioRouter from './routes/inventario'
import { ventasRouter } from './routes/ventas'

export function crearApp(): Application {
  const app: Application = express()
  app.disable('x-powered-by')

  app.use(express.json())
  app.use(cookieParser())

  app.use('/health', healthRouter)
  app.use('/auth', authRouter)
  app.use('/categorias', categoriasRouter)
  app.use('/productos', productosRouter)
  app.use('/inventario', inventarioRouter)
  app.use('/ventas', ventasRouter)

  app.get('/', (_req, res) => {
    res.json({ ok: true, mensaje: 'API Ferretería funcionando correctamente' })
  })

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' })
  })

  return app
}
