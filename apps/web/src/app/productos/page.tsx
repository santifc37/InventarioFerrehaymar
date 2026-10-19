
'use client'

import { useMemo, useState } from 'react'
import FormularioProducto from './FormularioProducto'

type EstadoProducto = 'Disponible' | 'Stock bajo' | 'Agotado' | 'Inactivo'

interface Producto {
  id: string
  nombre: string
  sku: string
  codigoBarras: string
  categoria: string
  precioCompra: number
  precioVenta: number
  stock: number
  stockMinimo: number
  unidad: string
  activo: boolean
}

const productosDemo: Producto[] = [
  {
    id: '1',
    nombre: 'Cemento gris 50 kg',
    sku: 'CEM-001',
    codigoBarras: '7701234500012',
    categoria: 'Construcción',
    precioCompra: 28000,
    precioVenta: 35000,
    stock: 45,
    stockMinimo: 10,
    unidad: 'bulto',
    activo: true,
  },
  {
    id: '2',
    nombre: 'Tornillo autorroscante',
    sku: 'TOR-001',
    codigoBarras: '7701234500013',
    categoria: 'Tornillería',
    precioCompra: 150,
    precioVenta: 300,
    stock: 8,
    stockMinimo: 20,
    unidad: 'unidad',
    activo: true,
  },
  {
    id: '3',
    nombre: 'Pintura blanca 1 galón',
    sku: 'PIN-001',
    codigoBarras: '7701234500014',
    categoria: 'Pinturas',
    precioCompra: 42000,
    precioVenta: 55000,
    stock: 12,
    stockMinimo: 5,
    unidad: 'galón',
    activo: true,
  },
  {
    id: '4',
    nombre: 'Cable eléctrico calibre 12',
    sku: 'CAB-012',
    codigoBarras: '7701234500015',
    categoria: 'Electricidad',
    precioCompra: 1800,
    precioVenta: 2500,
    stock: 0,
    stockMinimo: 15,
    unidad: 'metro',
    activo: true,
  },
  {
    id: '5',
    nombre: 'Martillo de carpintero',
    sku: 'HER-001',
    codigoBarras: '7701234500016',
    categoria: 'Herramientas',
    precioCompra: 18000,
    precioVenta: 26000,
    stock: 7,
    stockMinimo: 3,
    unidad: 'unidad',
    activo: true,
  },
  {
    id: '6',
    nombre: 'Tubo PVC de 1/2 pulgada',
    sku: 'PVC-012',
    codigoBarras: '7701234500017',
    categoria: 'Plomería',
    precioCompra: 6500,
    precioVenta: 9500,
    stock: 30,
    stockMinimo: 10,
    unidad: 'unidad',
    activo: true,
  },
  {
    id: '7',
    nombre: 'Brocha de 3 pulgadas',
    sku: 'PIN-003',
    codigoBarras: '7701234500018',
    categoria: 'Pinturas',
    precioCompra: 5000,
    precioVenta: 8500,
    stock: 0,
    stockMinimo: 4,
    unidad: 'unidad',
    activo: false,
  },
]

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
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [estado, setEstado] = useState('Todos')
  const [orden, setOrden] = useState('nombre')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(5)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const categorias = useMemo(
    () => [...new Set(productosDemo.map((producto) => producto.categoria))].sort(),
    [],
  )

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return productosDemo
      .filter((producto) => {
        const coincideBusqueda =
          !texto ||
          producto.nombre.toLowerCase().includes(texto) ||
          producto.sku.toLowerCase().includes(texto) ||
          producto.codigoBarras.includes(texto)

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
  }, [busqueda, categoria, estado, orden])

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / porPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * porPagina
  const productosPagina = productosFiltrados.slice(inicio, inicio + porPagina)

  const disponibles = productosDemo.filter(
    (producto) => obtenerEstado(producto) === 'Disponible',
  ).length

  const stockBajo = productosDemo.filter(
    (producto) => obtenerEstado(producto) === 'Stock bajo',
  ).length

  const agotados = productosDemo.filter(
    (producto) => obtenerEstado(producto) === 'Agotado',
  ).length

  function limpiarFiltros() {
    setBusqueda('')
    setCategoria('Todas')
    setEstado('Todos')
    setOrden('nombre')
    setPagina(1)
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
            onClick={() => window.alert('La importación CSV se implementará en su propia pantalla.')}
          >
            Importar CSV
          </button>
          <button
            type="button"
            className="productos-btn productos-btn-primario"
            onClick={() => setMostrarFormulario(true)}
        >
            <span aria-hidden="true">＋</span> Nuevo producto
        </button>
        </div>
      </header>

      <div className="productos-aviso-demo">
        <span aria-hidden="true">ⓘ</span>
        <div>
          <strong>Vista de demostración</strong>
          <p>Los productos y existencias mostrados son datos de prueba. Los cambios no se guardan.</p>
        </div>
      </div>

      <section className="productos-resumen" aria-label="Resumen de productos">
        <article className="productos-resumen-card">
          <span className="productos-resumen-icono">▦</span>
          <div>
            <span>Productos registrados</span>
            <strong>{productosDemo.length}</strong>
          </div>
        </article>

        <article className="productos-resumen-card">
          <span className="productos-resumen-icono productos-icono-verde">✓</span>
          <div>
            <span>Disponibles</span>
            <strong>{disponibles}</strong>
          </div>
        </article>

        <article className="productos-resumen-card">
          <span className="productos-resumen-icono productos-icono-amarillo">!</span>
          <div>
            <span>Stock bajo</span>
            <strong>{stockBajo}</strong>
          </div>
        </article>

        <article className="productos-resumen-card">
          <span className="productos-resumen-icono productos-icono-rojo">×</span>
          <div>
            <span>Agotados</span>
            <strong>{agotados}</strong>
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
            {productosFiltrados.length} resultado{productosFiltrados.length === 1 ? '' : 's'}
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
                <option key={item} value={item}>{item}</option>
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
            <select value={orden} onChange={(event) => setOrden(event.target.value)}>
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
              {productosPagina.map((producto) => {
                const estadoProducto = obtenerEstado(producto)

                return (
                  <tr key={producto.id}>
                    <td>
                      <div className="productos-nombre">
                        <span className="productos-avatar" aria-hidden="true">
                          {producto.nombre.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <strong>{producto.nombre}</strong>
                          <small>{producto.codigoBarras}</small>
                        </div>
                      </div>
                    </td>
                    <td><span className="productos-sku">{producto.sku}</span></td>
                    <td>{producto.categoria}</td>
                    <td>{formatoCOP(producto.precioCompra)}</td>
                    <td><strong>{formatoCOP(producto.precioVenta)}</strong></td>
                    <td>
                      <div className="productos-stock">
                        <strong>{producto.stock}</strong>
                        <span>{producto.unidad}{producto.stock === 1 ? '' : 's'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`productos-estado productos-estado-${estadoProducto.toLowerCase().replace(' ', '-')}`}>
                        <span aria-hidden="true">●</span> {estadoProducto}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="productos-accion"
                        aria-label={`Ver detalles de ${producto.nombre}`}
                        title="Ver detalles"
                        onClick={() => window.alert(`Detalles de demostración: ${producto.nombre}`)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                )
              })}

              {productosPagina.length === 0 && (
                <tr>
                  <td colSpan={8} className="productos-vacio">
                    <span aria-hidden="true">⌕</span>
                    <strong>No se encontraron productos</strong>
                    <p>Prueba con otro término o cambia los filtros.</p>
                    <button type="button" className="productos-limpiar" onClick={limpiarFiltros}>
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
              : `Mostrando ${inicio + 1}–${Math.min(inicio + porPagina, productosFiltrados.length)} de ${productosFiltrados.length}`}
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
            <span className="productos-pagina-numero">{paginaActual} / {totalPaginas}</span>
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
      {mostrarFormulario && (
  <FormularioProducto
    onCerrar={() => setMostrarFormulario(false)}
  />
)}
    </main>
  )
}
