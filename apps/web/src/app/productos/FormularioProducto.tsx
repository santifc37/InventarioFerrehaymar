
'use client'

import { useEffect, useState, type FormEvent } from 'react'

type Categoria = {
  id: string
  nombre: string
  activo: boolean
}

type Unidad = {
  id: string
  codigo: string
  nombre: string
}

type ProductoEditable = {
  id: string
  nombre: string
  sku: string
  codigoBarras: string
  descripcion: string
  categoriaId: string
  unidadId: string
  precioCompra: number
  precioVenta: number
  stockMinimo: number
}

type Props = {
  onCancelar: () => void
  onGuardado: () => void
  producto?: ProductoEditable | null
}

type RespuestaLista<T> = T[] | { datos?: T[] }

function obtenerLista<T>(respuesta: RespuestaLista<T>): T[] {
  if (Array.isArray(respuesta)) return respuesta
  return respuesta.datos ?? []
}

export default function FormularioProducto({
  onCancelar,
  onGuardado,
  producto = null,
}: Props) {
  const editando = producto !== null

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [formulario, setFormulario] = useState({
    codigo: producto?.sku ?? '',
    codigo_barras: producto?.codigoBarras ?? '',
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    categoria_id: producto?.categoriaId ?? '',
    unidad_base_id: producto?.unidadId ?? '',
    precio_compra:
      producto !== null ? String(producto.precioCompra) : '',
    precio_venta:
      producto !== null ? String(producto.precioVenta) : '',
    stock_minimo:
      producto !== null ? String(producto.stockMinimo) : '0',
  })

  useEffect(() => {
    let cancelado = false

    async function cargarOpciones() {
      setCargandoDatos(true)
      setError('')

      try {
        const [respuestaCategorias, respuestaUnidades] =
          await Promise.all([
            fetch('/api/categorias', {
              credentials: 'include',
              cache: 'no-store',
            }),
            fetch('/api/unidades', {
              credentials: 'include',
              cache: 'no-store',
            }),
          ])

        if (!respuestaCategorias.ok || !respuestaUnidades.ok) {
          throw new Error(
            'No se pudieron cargar las categorías o unidades.'
          )
        }

        const datosCategorias =
          (await respuestaCategorias.json()) as RespuestaLista<Categoria>

        const datosUnidades =
          (await respuestaUnidades.json()) as RespuestaLista<Unidad>

        if (cancelado) return

        const listaCategorias = obtenerLista(datosCategorias)
        const listaUnidades = obtenerLista(datosUnidades)

        setCategorias(
          listaCategorias.filter(
            (categoria) =>
              categoria.activo || categoria.id === producto?.categoriaId
          )
        )
        setUnidades(listaUnidades)

        setFormulario({
          codigo: producto?.sku ?? '',
          codigo_barras: producto?.codigoBarras ?? '',
          nombre: producto?.nombre ?? '',
          descripcion: producto?.descripcion ?? '',
          categoria_id:
            producto?.categoriaId ??
            listaCategorias.find((categoria) => categoria.activo)?.id ??
            '',
          unidad_base_id:
            producto?.unidadId ?? listaUnidades[0]?.id ?? '',
          precio_compra:
            producto !== null ? String(producto.precioCompra) : '',
          precio_venta:
            producto !== null ? String(producto.precioVenta) : '',
          stock_minimo:
            producto !== null ? String(producto.stockMinimo) : '0',
        })
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error
              ? err.message
              : 'Error al cargar los datos del formulario.'
          )
        }
      } finally {
        if (!cancelado) setCargandoDatos(false)
      }
    }

    void cargarOpciones()

    return () => {
      cancelado = true
    }
  }, [producto])

  function cambiarCampo(
    campo: keyof typeof formulario,
    valor: string
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  async function guardarProducto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError('')

    if (!formulario.categoria_id || !formulario.unidad_base_id) {
      setError('Selecciona una categoría y una unidad base.')
      return
    }

    const precioCompra = Number(formulario.precio_compra)
    const precioVenta = Number(formulario.precio_venta)
    const stockMinimo = Number(formulario.stock_minimo)

    if (
      formulario.precio_compra.trim() === '' ||
      formulario.precio_venta.trim() === '' ||
      !Number.isFinite(precioCompra) ||
      !Number.isFinite(precioVenta) ||
      !Number.isFinite(stockMinimo) ||
      precioCompra < 0 ||
      precioVenta < 0 ||
      stockMinimo < 0
    ) {
      setError(
        'Los precios y el stock mínimo deben ser válidos y no negativos.'
      )
      return
    }

    setGuardando(true)

    try {
      const url = editando
        ? `/api/productos/${producto.id}`
        : '/api/productos'

      const respuesta = await fetch(url, {
        method: editando ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo: formulario.codigo.trim(),
          codigo_barras: formulario.codigo_barras.trim() || null,
          nombre: formulario.nombre.trim(),
          descripcion: formulario.descripcion.trim() || null,
          categoria_id: formulario.categoria_id,
          unidad_base_id: formulario.unidad_base_id,
          precio_compra: precioCompra,
          precio_venta: precioVenta,
          stock_minimo: stockMinimo,
        }),
      })

      const resultado = await respuesta.json().catch(() => ({}))

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ||
            resultado.mensaje ||
            `No se pudo ${editando ? 'actualizar' : 'guardar'} el producto.`
        )
      }

      onGuardado()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar el producto.'
      )
    } finally {
      setGuardando(false)
    }
  }

  if (cargandoDatos) {
    return <p>Cargando categorías y unidades...</p>
  }

  return (
    <form onSubmit={guardarProducto} className="formulario-producto">
      <h2>
        {editando ? 'Editar producto' : 'Nuevo producto'}
      </h2>

      {error && (
        <p role="alert" style={{ color: '#b42318' }}>
          {error}
        </p>
      )}

      <label>
        Nombre *
        <input
          required
          value={formulario.nombre}
          onChange={(e) => cambiarCampo('nombre', e.target.value)}
          maxLength={150}
        />
      </label>

      <label>
        Código interno *
        <input
          required
          value={formulario.codigo}
          onChange={(e) => cambiarCampo('codigo', e.target.value)}
          maxLength={80}
        />
      </label>

      <label>
        Código de barras
        <input
          value={formulario.codigo_barras}
          onChange={(e) =>
            cambiarCampo('codigo_barras', e.target.value)
          }
          maxLength={100}
        />
      </label>

      <label>
        Categoría *
        <select
          required
          value={formulario.categoria_id}
          onChange={(e) =>
            cambiarCampo('categoria_id', e.target.value)
          }
        >
          <option value="">Selecciona una categoría</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </select>
      </label>

      <label>
        Unidad base *
        <select
          required
          value={formulario.unidad_base_id}
          onChange={(e) =>
            cambiarCampo('unidad_base_id', e.target.value)
          }
        >
          <option value="">Selecciona una unidad</option>
          {unidades.map((unidad) => (
            <option key={unidad.id} value={unidad.id}>
              {unidad.nombre} ({unidad.codigo})
            </option>
          ))}
        </select>
      </label>

      <label>
        Precio de compra *
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={formulario.precio_compra}
          onChange={(e) =>
            cambiarCampo('precio_compra', e.target.value)
          }
        />
      </label>

      <label>
        Precio de venta *
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={formulario.precio_venta}
          onChange={(e) =>
            cambiarCampo('precio_venta', e.target.value)
          }
        />
      </label>

      <label>
        Stock mínimo *
        <input
          required
          type="number"
          min="0"
          step="0.001"
          value={formulario.stock_minimo}
          onChange={(e) =>
            cambiarCampo('stock_minimo', e.target.value)
          }
        />
      </label>

      <label>
        Descripción
        <textarea
          value={formulario.descripcion}
          onChange={(e) =>
            cambiarCampo('descripcion', e.target.value)
          }
          rows={3}
        />
      </label>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={
            guardando ||
            categorias.length === 0 ||
            unidades.length === 0
          }
        >
          {guardando
            ? 'Guardando...'
            : editando
              ? 'Guardar cambios'
              : 'Guardar producto'}
        </button>
      </div>
    </form>
  )
}
