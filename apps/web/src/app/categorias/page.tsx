
'use client'

import { useMemo, useState } from 'react'

interface Categoria {
  id: string
  nombre: string
  descripcion: string
  color: string
  activa: boolean
  productos: number
}

const categoriasIniciales: Categoria[] = [
  {
    id: '1',
    nombre: 'Construcción',
    descripcion: 'Cementos, ladrillos y materiales de obra.',
    color: '#2563eb',
    activa: true,
    productos: 18,
  },
  {
    id: '2',
    nombre: 'Tornillería',
    descripcion: 'Tornillos, tuercas, arandelas y fijaciones.',
    color: '#7c3aed',
    activa: true,
    productos: 35,
  },
  {
    id: '3',
    nombre: 'Pinturas',
    descripcion: 'Pinturas, brochas, rodillos y accesorios.',
    color: '#db2777',
    activa: true,
    productos: 12,
  },
  {
    id: '4',
    nombre: 'Electricidad',
    descripcion: 'Cables, interruptores, tomas y conexiones.',
    color: '#d97706',
    activa: true,
    productos: 21,
  },
  {
    id: '5',
    nombre: 'Herramientas',
    descripcion: 'Herramientas manuales y accesorios.',
    color: '#0d9488',
    activa: true,
    productos: 16,
  },
  {
    id: '6',
    nombre: 'Plomería',
    descripcion: 'Tuberías, conexiones, válvulas y grifería.',
    color: '#0284c7',
    activa: true,
    productos: 14,
  },
  {
    id: '7',
    nombre: 'Jardinería',
    descripcion: 'Artículos para mantenimiento de jardines.',
    color: '#65a30d',
    activa: false,
    productos: 0,
  },
]

const coloresDisponibles = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#d97706',
  '#0d9488',
  '#0284c7',
  '#65a30d',
  '#64748b',
]

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState(categoriasIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todas')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [color, setColor] = useState(coloresDisponibles[0])
  const [error, setError] = useState('')

  const categoriasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return categorias.filter((categoria) => {
      const coincideBusqueda =
        categoria.nombre.toLowerCase().includes(texto) ||
        categoria.descripcion.toLowerCase().includes(texto)

      const coincideEstado =
        filtroEstado === 'Todas' ||
        (filtroEstado === 'Activas' && categoria.activa) ||
        (filtroEstado === 'Inactivas' && !categoria.activa)

      return coincideBusqueda && coincideEstado
    })
  }, [categorias, busqueda, filtroEstado])

  const activas = categorias.filter((categoria) => categoria.activa).length
  const inactivas = categorias.filter((categoria) => !categoria.activa).length
  const totalProductos = categorias.reduce(
    (total, categoria) => total + categoria.productos,
    0,
  )

  function abrirNuevaCategoria() {
    setCategoriaEditando(null)
    setNombre('')
    setDescripcion('')
    setColor(coloresDisponibles[0])
    setError('')
    setMostrarFormulario(true)
  }

  function abrirEdicion(categoria: Categoria) {
    setCategoriaEditando(categoria.id)
    setNombre(categoria.nombre)
    setDescripcion(categoria.descripcion)
    setColor(categoria.color)
    setError('')
    setMostrarFormulario(true)
  }

  function guardarCategoria(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const nombreLimpio = nombre.trim()

    if (!nombreLimpio) {
      setError('Escribe el nombre de la categoría.')
      return
    }

    const duplicada = categorias.some(
      (categoria) =>
        categoria.nombre.toLowerCase() === nombreLimpio.toLowerCase() &&
        categoria.id !== categoriaEditando,
    )

    if (duplicada) {
      setError('Ya existe una categoría con ese nombre.')
      return
    }

    if (categoriaEditando) {
      setCategorias((actuales) =>
        actuales.map((categoria) =>
          categoria.id === categoriaEditando
            ? { ...categoria, nombre: nombreLimpio, descripcion: descripcion.trim(), color }
            : categoria,
        ),
      )
    } else {
      const nuevaCategoria: Categoria = {
        id: `demo-${Date.now()}`,
        nombre: nombreLimpio,
        descripcion: descripcion.trim(),
        color,
        activa: true,
        productos: 0,
      }

      setCategorias((actuales) => [...actuales, nuevaCategoria])
    }

    setMostrarFormulario(false)
  }

  function cambiarEstado(categoria: Categoria) {
    const accion = categoria.activa ? 'desactivar' : 'activar'

    if (
      !window.confirm(
        `¿Deseas ${accion} la categoría "${categoria.nombre}"? Los productos existentes no se eliminarán.`,
      )
    ) {
      return
    }

    setCategorias((actuales) =>
      actuales.map((item) =>
        item.id === categoria.id ? { ...item, activa: !item.activa } : item,
      ),
    )
  }

  return (
    <main className="categorias-page">
      <header className="categorias-encabezado">
        <div>
          <span className="productos-migaja">Inventario / Categorías</span>
          <h1>Categorías</h1>
          <p>Organiza los productos de tu ferretería por tipo.</p>
        </div>

        <button
          type="button"
          className="productos-btn productos-btn-primario"
          onClick={abrirNuevaCategoria}
        >
          <span aria-hidden="true">＋</span> Nueva categoría
        </button>
      </header>

      <div className="categorias-aviso-demo">
        <span aria-hidden="true">ⓘ</span>
        <div>
          <strong>Vista de demostración</strong>
          <p>
            Puedes crear, editar y activar categorías durante esta sesión.
            Los cambios son temporales y se perderán al recargar la página.
          </p>
        </div>
      </div>

      <section className="categorias-resumen">
        <article className="categorias-resumen-card">
          <span className="categorias-resumen-icono">▦</span>
          <div>
            <span>Total de categorías</span>
            <strong>{categorias.length}</strong>
          </div>
        </article>

        <article className="categorias-resumen-card">
          <span className="categorias-resumen-icono categorias-verde">✓</span>
          <div>
            <span>Categorías activas</span>
            <strong>{activas}</strong>
          </div>
        </article>

        <article className="categorias-resumen-card">
          <span className="categorias-resumen-icono categorias-gris">Ⅱ</span>
          <div>
            <span>Categorías inactivas</span>
            <strong>{inactivas}</strong>
          </div>
        </article>

        <article className="categorias-resumen-card">
          <span className="categorias-resumen-icono categorias-azul">▤</span>
          <div>
            <span>Productos asociados</span>
            <strong>{totalProductos}</strong>
          </div>
        </article>
      </section>

      <section className="categorias-panel">
        <div className="categorias-panel-cabecera">
          <div>
            <h2>Listado de categorías</h2>
            <p>Administra las categorías utilizadas para clasificar productos.</p>
          </div>
          <span className="categorias-contador">
            {categoriasFiltradas.length} resultado{categoriasFiltradas.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="categorias-filtros">
          <label className="categorias-busqueda">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar categoría..."
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </label>

          <label className="categorias-filtro-estado">
            <span>Estado</span>
            <select
              value={filtroEstado}
              onChange={(evento) => setFiltroEstado(evento.target.value)}
            >
              <option value="Todas">Todas las categorías</option>
              <option value="Activas">Activas</option>
              <option value="Inactivas">Inactivas</option>
            </select>
          </label>
        </div>

        <div className="categorias-tabla-contenedor">
          <table className="categorias-tabla">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Productos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categoriasFiltradas.map((categoria) => (
                <tr key={categoria.id}>
                  <td>
                    <div className="categorias-nombre">
                      <span
                        className="categorias-muestra-color"
                        style={{ backgroundColor: categoria.color }}
                      />
                      <strong>{categoria.nombre}</strong>
                    </div>
                  </td>
                  <td className="categorias-descripcion">
                    {categoria.descripcion || 'Sin descripción'}
                  </td>
                  <td>
                    <span className="categorias-productos-cantidad">
                      {categoria.productos}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`categorias-estado ${
                        categoria.activa ? 'categorias-estado-activa' : 'categorias-estado-inactiva'
                      }`}
                    >
                      <span aria-hidden="true">●</span>
                      {categoria.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div className="categorias-acciones">
                      <button
                        type="button"
                        className="categorias-btn-editar"
                        onClick={() => abrirEdicion(categoria)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="categorias-btn-estado"
                        onClick={() => cambiarEstado(categoria)}
                      >
                        {categoria.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {categoriasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="categorias-vacio">
                    <strong>No se encontraron categorías</strong>
                    <p>Prueba con otra búsqueda o cambia el filtro.</p>
                    <button
                      type="button"
                      className="productos-limpiar"
                      onClick={() => {
                        setBusqueda('')
                        setFiltroEstado('Todas')
                      }}
                    >
                      Limpiar filtros
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {mostrarFormulario && (
        <div
          className="producto-modal-fondo"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) setMostrarFormulario(false)
          }}
        >
          <section
            className="producto-formulario-modal categorias-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="categoria-formulario-titulo"
          >
            <header className="producto-formulario-cabecera">
              <div>
                <span className="productos-migaja">Inventario / Categorías</span>
                <h2 id="categoria-formulario-titulo">
                  {categoriaEditando ? 'Editar categoría' : 'Nueva categoría'}
                </h2>
                <p>Define el nombre y la apariencia de la categoría.</p>
              </div>
              <button
                type="button"
                className="producto-modal-cerrar"
                onClick={() => setMostrarFormulario(false)}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </header>

            <form onSubmit={guardarCategoria}>
              <div className="producto-formulario-contenido">
                <label className="producto-campo">
                  Nombre de la categoría *
                  <input
                    autoFocus
                    value={nombre}
                    onChange={(evento) => {
                      setNombre(evento.target.value)
                      setError('')
                    }}
                    placeholder="Ej. Materiales eléctricos"
                    maxLength={100}
                    required
                  />
                </label>

                <label className="producto-campo">
                  Descripción
                  <textarea
                    value={descripcion}
                    onChange={(evento) => setDescripcion(evento.target.value)}
                    placeholder="¿Qué tipos de productos agrupa?"
                    rows={3}
                    maxLength={500}
                  />
                </label>

                <fieldset className="categorias-selector-colores">
                  <legend>Color identificador</legend>
                  <div>
                    {coloresDisponibles.map((colorDisponible) => (
                      <button
                        key={colorDisponible}
                        type="button"
                        className={`categorias-color-opcion ${
                          color === colorDisponible ? 'categorias-color-seleccionado' : ''
                        }`}
                        style={{ backgroundColor: colorDisponible }}
                        onClick={() => setColor(colorDisponible)}
                        aria-label={`Seleccionar color ${colorDisponible}`}
                        aria-pressed={color === colorDisponible}
                      />
                    ))}
                  </div>
                </fieldset>

                {error && (
                  <div className="producto-formulario-error" role="alert">
                    {error}
                  </div>
                )}
              </div>

              <footer className="producto-formulario-pie">
                <span>* Campo obligatorio.</span>
                <div>
                  <button
                    type="button"
                    className="productos-btn productos-btn-secundario"
                    onClick={() => setMostrarFormulario(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="productos-btn productos-btn-primario"
                  >
                    {categoriaEditando ? 'Guardar cambios' : 'Crear categoría'}
                  </button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
