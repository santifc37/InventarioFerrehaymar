'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import FormularioProducto from './FormularioProducto'

type EstadoProducto = 'Disponible' | 'Stock bajo' | 'Agotado' | 'Inactivo'

interface ProductoAPI {
  producto_id: string
  codigo: string
  codigo_barras: string | null
  nombre: string
  descripcion: string | null
  categoria_id: string
  unidad_base_id: string
  precio_compra: number
  precio_venta: number
  stock_minimo: number
  activo: boolean
  stock_actual: number
  estado_stock: string
}

interface CategoriaAPI {
  id: string
  nombre: string
  activo: boolean
}

interface UnidadAPI {
  id: string
  codigo: string
  nombre: string
}

interface Producto {
  id: string
  nombre: string
  sku: string
  codigoBarras: string
  descripcion: string
  categoria: string
  categoriaId: string
  unidadId: string
  precioCompra: number
  precioVenta: number
  stock: number
  stockMinimo: number
  unidad: string
  activo: boolean
}

const formatoCOP = (valor: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)

function obtenerEstado(producto: Producto): EstadoProducto {
  if (!producto.activo) return 'Inactivo'
  if (producto.stock <= 0) return 'Agotado'
  if (producto.stock <= producto.stockMinimo) return 'Stock bajo'
  return 'Disponible'
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [productoEnEdicion, setProductoEnEdicion] =
    useState<Producto | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [estado, setEstado] = useState('Todos')
  const [orden, setOrden] = useState('nombre')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(5)

  const cargarProductos = useCallback(async () => {
    setCargando(true)
    setError('')

    try {
      const [respuestaStock, respuestaCategorias, respuestaUnidades] =
        await Promise.all([
          fetch('/api/inventario/stock', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/categorias', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/unidades', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ])

      if (!respuestaStock.ok) {
        throw new Error('No fue posible consultar el inventario.')
      }

      if (!respuestaCategorias.ok) {
        throw new Error('No fue posible consultar las categorías.')
      }

      if (!respuestaUnidades.ok) {
        throw new Error('No fue posible consultar las unidades.')
      }

      const datosStock = await respuestaStock.json()

      const datosCategorias: CategoriaAPI[] | {
        categorias?: CategoriaAPI[]
      } = await respuestaCategorias.json()

      const datosUnidades = await respuestaUnidades.json()

      const categoriasAPI: CategoriaAPI[] = Array.isArray(datosCategorias)
        ? datosCategorias
        : datosCategorias.categorias ?? []

      const unidadesAPI: UnidadAPI[] = Array.isArray(datosUnidades)
        ? datosUnidades
        : datosUnidades.datos ?? []

      const mapaCategorias = new Map(
        categoriasAPI.map((item) => [item.id, item.nombre]),
      )

      const mapaUnidades = new Map(
        unidadesAPI.map((item) => [item.id, item.nombre]),
      )

      const productosAPI: ProductoAPI[] = Array.isArray(datosStock.productos)
        ? datosStock.productos
        : []

      const productosConvertidos: Producto[] = productosAPI.map((item) => ({
        id: item.producto_id,
        nombre: item.nombre,
        sku: item.codigo,
        codigoBarras: item.codigo_barras ?? '',
        descripcion: item.descripcion ?? '',
        categoria: mapaCategorias.get(item.categoria_id) ?? 'Sin categoría',
        categoriaId: item.categoria_id,
        unidadId: item.unidad_base_id,
        precioCompra: Number(item.precio_compra),
        precioVenta: Number(item.precio_venta),
        stock: Number(item.stock_actual),
        stockMinimo: Number(item.stock_minimo),
        unidad: mapaUnidades.get(item.unidad_base_id) ?? 'Unidad',
        activo: item.activo,
      }))

      setProductos(productosConvertidos)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al cargar los productos.',
      )
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargarProductos()
  }, [cargarProductos])

  const categorias = useMemo(
    () =>
      [...new Set(productos.map((producto) => producto.categoria))].sort(
        (a, b) => a.localeCompare(b, 'es'),
      ),
    [productos],
  )

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return productos
      .filter((producto) => {
        const coincideBusqueda =
          !texto ||
          producto.nombre.toLowerCase().includes(texto) ||
          producto.sku.toLowerCase().includes(texto) ||
          producto.codigoBarras.toLowerCase().includes(texto)

        const coincideCategoria =
          categoria === 'Todas' || producto.categoria === categoria

        const coincideEstado =
          estado === 'Todos' || obtenerEstado(producto) === estado

        return coincideBusqueda && coincideCategoria && coincideEstado
      })
      .sort((a, b) => {
        switch (orden) {
          case 'precioAsc':
            return a.precioVenta - b.precioVenta
          case 'precioDesc':
            return b.precioVenta - a.precioVenta
          case 'stockAsc':
            return a.stock - b.stock
          case 'stockDesc':
            return b.stock - a.stock
          default:
            return a.nombre.localeCompare(b.nombre, 'es')
        }
      })
  }, [productos, busqueda, categoria, estado, orden])

  const totalPaginas = Math.max(
    1,
    Math.ceil(productosFiltrados.length / porPagina),
  )

  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * porPagina

  const productosPagina = productosFiltrados.slice(
    inicio,
    inicio + porPagina,
  )

  const disponibles = productos.filter(
    (producto) => obtenerEstado(producto) === 'Disponible',
  ).length

  const stockBajo = productos.filter(
    (producto) => obtenerEstado(producto) === 'Stock bajo',
  ).length

  const agotados = productos.filter(
    (producto) => obtenerEstado(producto) === 'Agotado',
  ).length

  function limpiarFiltros() {
    setBusqueda('')
    setCategoria('Todas')
    setEstado('Todos')
    setOrden('nombre')
    setPagina(1)
  }

  function abrirEdicion(producto: Producto) {
    setMostrarFormulario(false)
    setProductoEnEdicion(producto)
  }

  function cerrarFormulario() {
    setMostrarFormulario(false)
    setProductoEnEdicion(null)
  }

  return (
    <main className="productos-page">
      <header className="productos-encabezado">
        <div>
          <span className="productos-migaja">Inventario / Productos</span>
          <h1>Productos</h1>
          <p>Consulta y administra los productos de tu ferretería.</p>
        </div>

        <div className="productos-acciones-principales">
          <button
            type="button"
            className="productos-btn productos-btn-secundario"
            onClick={() =>
              window.alert('La importación CSV se conectará en otro paso.')
            }
          >
            Importar CSV
          </button>

          <button
            type="button"
            className="productos-btn productos-btn-primario"
            onClick={() => {
              setProductoEnEdicion(null)
              setMostrarFormulario(true)
            }}
          >
            <span aria-hidden="true">＋</span> Nuevo producto
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="productos-aviso-demo">
          <div>
            <strong>No se pudieron cargar los productos</strong>
            <p>{error}</p>

            <button
              type="button"
              className="productos-btn productos-btn-secundario"
              onClick={() => void cargarProductos()}
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      <section className="productos-resumen" aria-label="Resumen de productos">
        <article className="productos-resumen-card">
          <span className="productos-resumen-icono">▦</span>
          <div>
            <span>Productos registrados</span>
            <strong>{cargando ? '…' : productos.length}</strong>
          </div>
        </article>

        <article className="productos-resumen-card">
          <span className="productos-resumen-icono productos-icono-verde">
            ✓
          </span>
          <div>
            <span>Disponibles</span>
            <strong>{cargando ? '…' : disponibles}</strong>
          </div>
        </article>

        <article className="productos-resumen-card">
          <span className="productos-resumen-icono productos-icono-amarillo">
            !
          </span>
          <div>
            <span>Stock bajo</span>
            <strong>{cargando ? '…' : stockBajo}</strong>
          </div>
        </article>

        <article className="productos-resumen-card">
          <span className="productos-resumen-icono productos-icono-rojo">
            ×
          </span>
          <div>
            <span>Agotados</span>
            <strong>{cargando ? '…' : agotados}</strong>
          </div>
        </article>
      </section>

      <section className="productos-panel">
        <div className="productos-panel-titulo">
          <div>
            <h2>Listado de productos</h2>
            <p>Busca, filtra y consulta la información del inventario.</p>
          </div>

          <span className="productos-total">
            {productosFiltrados.length} resultado
            {productosFiltrados.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="productos-filtros">
          <label className="productos-busqueda">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar por nombre, SKU o código de barras..."
              value={busqueda}
              onChange={(event) => {
                setBusqueda(event.target.value)
                setPagina(1)
              }}
            />
          </label>

          <label className="productos-filtro">
            <span>Categoría</span>
            <select
              value={categoria}
              onChange={(event) => {
                setCategoria(event.target.value)
                setPagina(1)
              }}
            >
              <option value="Todas">Todas las categorías</option>
              {categorias.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="productos-filtro">
            <span>Estado</span>
            <select
              value={estado}
              onChange={(event) => {
                setEstado(event.target.value)
                setPagina(1)
              }}
            >
              <option value="Todos">Todos los estados</option>
              <option value="Disponible">Disponible</option>
              <option value="Stock bajo">Stock bajo</option>
              <option value="Agotado">Agotado</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </label>

          <label className="productos-filtro">
            <span>Ordenar por</span>
            <select
              value={orden}
              onChange={(event) => setOrden(event.target.value)}
            >
              <option value="nombre">Nombre (A-Z)</option>
              <option value="precioAsc">Menor precio</option>
              <option value="precioDesc">Mayor precio</option>
              <option value="stockAsc">Menor existencia</option>
              <option value="stockDesc">Mayor existencia</option>
            </select>
          </label>

          <button
            type="button"
            className="productos-limpiar"
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="productos-tabla-contenedor">
          <table className="productos-tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU / Código</th>
                <th>Categoría</th>
                <th>Precio compra</th>
                <th>Precio venta</th>
                <th>Existencias</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={8} className="productos-vacio">
                    Cargando productos del inventario…
                  </td>
                </tr>
              ) : (
                productosPagina.map((producto) => {
                  const estadoProducto = obtenerEstado(producto)

                  return (
                    <tr key={producto.id}>
                      <td>
                        <div className="productos-nombre">
                          <span
                            className="productos-avatar"
                            aria-hidden="true"
                          >
                            {producto.nombre.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <strong>{producto.nombre}</strong>
                            <small>
                              {producto.codigoBarras || 'Sin código de barras'}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="productos-sku">{producto.sku}</span>
                      </td>

                      <td>{producto.categoria}</td>
                      <td>{formatoCOP(producto.precioCompra)}</td>

                      <td>
                        <strong>{formatoCOP(producto.precioVenta)}</strong>
                      </td>

                      <td>
                        <div className="productos-stock">
                          <strong>{producto.stock}</strong>
                          <span>{producto.unidad}</span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`productos-estado productos-estado-${estadoProducto
                            .toLowerCase()
                            .replace(' ', '-')}`}
                        >
                          <span aria-hidden="true">●</span> {estadoProducto}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="productos-btn productos-btn-primario"
                          onClick={() => abrirEdicion(producto)}
                        >
                          Editar producto
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}

              {!cargando && productosPagina.length === 0 && (
                <tr>
                  <td colSpan={8} className="productos-vacio">
                    <span aria-hidden="true">⌕</span>
                    <strong>No se encontraron productos</strong>
                    <p>Prueba con otro término o cambia los filtros.</p>

                    <button
                      type="button"
                      className="productos-limpiar"
                      onClick={limpiarFiltros}
                    >
                      Limpiar búsqueda
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="productos-paginacion">
          <span>
            {productosFiltrados.length === 0
              ? 'Sin resultados'
              : `Mostrando ${inicio + 1}–${Math.min(
                  inicio + porPagina,
                  productosFiltrados.length,
                )} de ${productosFiltrados.length}`}
          </span>

          <div className="productos-paginacion-controles">
            <label>
              <span>Por página</span>
              <select
                value={porPagina}
                onChange={(event) => {
                  setPorPagina(Number(event.target.value))
                  setPagina(1)
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>

            <button
              type="button"
              disabled={paginaActual <= 1}
              onClick={() => setPagina((actual) => actual - 1)}
              aria-label="Página anterior"
            >
              ←
            </button>

            <span className="productos-pagina-numero">
              {paginaActual} / {totalPaginas}
            </span>

            <button
              type="button"
              disabled={paginaActual >= totalPaginas}
              onClick={() => setPagina((actual) => actual + 1)}
              aria-label="Página siguiente"
            >
              →
            </button>
          </div>
        </footer>
      </section>

      {(mostrarFormulario || productoEnEdicion !== null) && (
        <div
          role="presentation"
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) {
              cerrarFormulario()
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflowY: 'auto',
            background: 'rgba(15, 23, 42, 0.55)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-formulario-producto"
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              borderRadius: 16,
              background: '#fff',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
            }}
          >
            <FormularioProducto
              producto={productoEnEdicion}
              onCancelar={cerrarFormulario}
              onGuardado={() => {
                cerrarFormulario()
                void cargarProductos()
              }}
            />
          </div>
        </div>
      )}
    </main>
  )
}