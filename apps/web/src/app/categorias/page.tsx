
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

interface Categoria {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  creado_en: string
}

const COLORES = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#d97706',
  '#0d9488',
  '#0284c7',
  '#65a30d',
  '#64748b',
]

type FiltroEstado = 'Todas' | 'Activas' | 'Inactivas'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('Todas')

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [categoriaEditando, setCategoriaEditando] =
    useState<Categoria | null>(null)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const cargarCategorias = useCallback(async () => {
    setCargando(true)
    setError('')

    try {
      const respuesta = await fetch('/api/categorias', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      const datos = await respuesta.json().catch(() => null)

      if (!respuesta.ok) {
        throw new Error(
          datos?.error ||
            (respuesta.status === 401
              ? 'Tu sesión ha expirado. Inicia sesión nuevamente.'
              : 'No fue posible consultar las categorías.'),
        )
      }

      if (!Array.isArray(datos)) {
        throw new Error('La respuesta del servidor no tiene el formato esperado.')
      }

      setCategorias(datos)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible conectar con el servidor.',
      )
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargarCategorias()
  }, [cargarCategorias])

  const categoriasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase('es-CO')

    return categorias.filter((categoria) => {
      const nombreCategoria = categoria.nombre.toLocaleLowerCase('es-CO')
      const descripcionCategoria = (
        categoria.descripcion ?? ''
      ).toLocaleLowerCase('es-CO')

      const coincideBusqueda =
        nombreCategoria.includes(texto) ||
        descripcionCategoria.includes(texto)

      const coincideEstado =
        filtroEstado === 'Todas' ||
        (filtroEstado === 'Activas' && categoria.activo) ||
        (filtroEstado === 'Inactivas' && !categoria.activo)

      return coincideBusqueda && coincideEstado
    })
  }, [categorias, busqueda, filtroEstado])

  const activas = categorias.filter((categoria) => categoria.activo).length
  const inactivas = categorias.length - activas

  function abrirNuevaCategoria() {
    setCategoriaEditando(null)
    setNombre('')
    setDescripcion('')
    setError('')
    setMensaje('')
    setMostrarFormulario(true)
  }

  function abrirEdicion(categoria: Categoria) {
    setCategoriaEditando(categoria)
    setNombre(categoria.nombre)
    setDescripcion(categoria.descripcion ?? '')
    setError('')
    setMensaje('')
    setMostrarFormulario(true)
  }

  function cerrarFormulario() {
    if (guardando) return

    setMostrarFormulario(false)
    setCategoriaEditando(null)
    setNombre('')
    setDescripcion('')
    setError('')
  }

  async function guardarCategoria(
    evento: React.FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault()

    const nombreLimpio = nombre.trim()
    const descripcionLimpia = descripcion.trim()

    if (!nombreLimpio) {
      setError('Escribe el nombre de la categoría.')
      return
    }

    const duplicada = categorias.some(
      (categoria) =>
        categoria.nombre.trim().toLocaleLowerCase('es-CO') ===
          nombreLimpio.toLocaleLowerCase('es-CO') &&
        categoria.id !== categoriaEditando?.id,
    )

    if (duplicada) {
      setError('Ya existe una categoría con ese nombre.')
      return
    }

    setGuardando(true)
    setError('')

    try {
      const editando = categoriaEditando !== null
      const url = editando
        ? `/api/categorias/${encodeURIComponent(categoriaEditando.id)}`
        : '/api/categorias'

      const respuesta = await fetch(url, {
        method: editando ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombreLimpio,
          descripcion: descripcionLimpia || null,
        }),
      })

      const datos = await respuesta.json().catch(() => null)

      if (!respuesta.ok) {
        throw new Error(
          datos?.error ||
            (respuesta.status === 401
              ? 'Tu sesión ha expirado. Inicia sesión nuevamente.'
              : 'No fue posible guardar la categoría.'),
        )
      }

      setMostrarFormulario(false)
      setCategoriaEditando(null)
      setNombre('')
      setDescripcion('')
      setMensaje(
        editando
          ? 'Categoría actualizada correctamente.'
          : 'Categoría creada correctamente.',
      )

      await cargarCategorias()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible conectar con el servidor.',
      )
    } finally {
      setGuardando(false)
    }
  }

  async function desactivarCategoria(categoria: Categoria) {
    const confirmar = window.confirm(
      `¿Deseas desactivar la categoría "${categoria.nombre}"? Los productos existentes no se eliminarán.`,
    )

    if (!confirmar) return

    setError('')
    setMensaje('')

    try {
      const respuesta = await fetch(
        `/api/categorias/${encodeURIComponent(categoria.id)}/desactivar`,
        {
          method: 'PATCH',
          credentials: 'include',
        },
      )

      const datos = await respuesta.json().catch(() => null)

      if (!respuesta.ok) {
        throw new Error(
          datos?.error || 'No fue posible desactivar la categoría.',
        )
      }

      setMensaje('Categoría desactivada correctamente.')
      await cargarCategorias()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible conectar con el servidor.',
      )
    }
  }

  return (
    <main className="categorias-page">
      <header className="categorias-encabezado">
        <div>
          <span className="productos-migaja">
            Inventario / Categorías
          </span>
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

      {mensaje && (
        <div
          role="status"
          style={{
            padding: '13px 16px',
            marginBottom: 18,
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            background: '#f0fdf4',
            color: '#166534',
            fontSize: 13,
          }}
        >
          {mensaje}
          <button
            type="button"
            onClick={() => setMensaje('')}
            aria-label="Cerrar mensaje"
            style={{
              float: 'right',
              border: 0,
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      {error && !mostrarFormulario && (
        <div
          role="alert"
          style={{
            padding: '13px 16px',
            marginBottom: 18,
            border: '1px solid #fecaca',
            borderRadius: 10,
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: 13,
          }}
        >
          {error}
          <button
            type="button"
            onClick={() => void cargarCategorias()}
            style={{
              marginLeft: 12,
              border: 0,
              background: 'transparent',
              color: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      <section className="categorias-resumen">
        <article className="categorias-resumen-card">
          <span className="categorias-resumen-icono">▦</span>
          <div>
            <span>Total de categorías</span>
            <strong>{categorias.length}</strong>
          </div>
        </article>

        <article className="categorias-resumen-card">
          <span className="categorias-resumen-icono categorias-verde">
            ✓
          </span>
          <div>
            <span>Categorías activas</span>
            <strong>{activas}</strong>
          </div>
        </article>

        <article className="categorias-resumen-card">
          <span className="categorias-resumen-icono categorias-gris">
            Ⅱ
          </span>
          <div>
            <span>Categorías inactivas</span>
            <strong>{inactivas}</strong>
          </div>
        </article>
      </section>

      <section className="categorias-panel">
        <div className="categorias-panel-cabecera">
          <div>
            <h2>Listado de categorías</h2>
            <p>
              Administra las categorías utilizadas para clasificar
              productos.
            </p>
          </div>

          <span className="categorias-contador">
            {categoriasFiltradas.length}{' '}
            {categoriasFiltradas.length === 1 ? 'resultado' : 'resultados'}
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
              onChange={(evento) =>
                setFiltroEstado(evento.target.value as FiltroEstado)
              }
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
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={4} className="categorias-vacio">
                    Cargando categorías...
                  </td>
                </tr>
              ) : categoriasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="categorias-vacio">
                    <strong>
                      {categorias.length === 0
                        ? 'Todavía no hay categorías'
                        : 'No se encontraron categorías'}
                    </strong>
                    <p>
                      {categorias.length === 0
                        ? 'Crea tu primera categoría para comenzar.'
                        : 'Prueba con otra búsqueda o cambia el filtro.'}
                    </p>

                    {categorias.length === 0 ? (
                      <button
                        type="button"
                        className="productos-btn productos-btn-primario"
                        onClick={abrirNuevaCategoria}
                      >
                        Crear primera categoría
                      </button>
                    ) : (
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
                    )}
                  </td>
                </tr>
              ) : (
                categoriasFiltradas.map((categoria) => {
                  const indiceColor =
                    Array.from(categoria.nombre).reduce(
                      (total, caracter) => total + caracter.charCodeAt(0),
                      0,
                    ) % COLORES.length

                  return (
                    <tr key={categoria.id}>
                      <td>
                        <div className="categorias-nombre">
                          <span
                            className="categorias-muestra-color"
                            style={{
                              backgroundColor: COLORES[indiceColor],
                            }}
                          />
                          <strong>{categoria.nombre}</strong>
                        </div>
                      </td>

                      <td className="categorias-descripcion">
                        {categoria.descripcion || 'Sin descripción'}
                      </td>

                      <td>
                        <span
                          className={`categorias-estado ${
                            categoria.activo
                              ? 'categorias-estado-activa'
                              : 'categorias-estado-inactiva'
                          }`}
                        >
                          <span aria-hidden="true">●</span>
                          {categoria.activo ? 'Activa' : 'Inactiva'}
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

                          {categoria.activo && (
                            <button
                              type="button"
                              className="categorias-btn-estado"
                              onClick={() =>
                                void desactivarCategoria(categoria)
                              }
                            >
                              Desactivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {mostrarFormulario && (
        <div
          className="producto-modal-fondo"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              cerrarFormulario()
            }
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
                <span className="productos-migaja">
                  Inventario / Categorías
                </span>
                <h2 id="categoria-formulario-titulo">
                  {categoriaEditando
                    ? 'Editar categoría'
                    : 'Nueva categoría'}
                </h2>
                <p>
                  Define el nombre y la descripción de la categoría.
                </p>
              </div>

              <button
                type="button"
                className="producto-modal-cerrar"
                onClick={cerrarFormulario}
                aria-label="Cerrar formulario"
                disabled={guardando}
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
                    onChange={(evento) =>
                      setDescripcion(evento.target.value)
                    }
                    placeholder="¿Qué tipos de productos agrupa?"
                    rows={3}
                    maxLength={500}
                  />
                </label>

                {error && (
                  <div
                    className="producto-formulario-error"
                    role="alert"
                  >
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
                    onClick={cerrarFormulario}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="productos-btn productos-btn-primario"
                    disabled={guardando}
                  >
                    {guardando
                      ? 'Guardando...'
                      : categoriaEditando
                        ? 'Guardar cambios'
                        : 'Crear categoría'}
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
