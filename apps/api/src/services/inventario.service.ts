
import { getSupabaseClient } from '../config/supabase'


export async function validarProductoParaMovimiento(
  productoId: string,
) {
  const { data, error } = await getSupabaseClient()
    .from('productos')
    .select('id, nombre, codigo, unidad_base_id, precio_compra, activo')
    .eq('id', productoId)
    .maybeSingle()

  if (error) {
    console.error('Error de Supabase al consultar producto:', error)
    throw new Error('No fue posible consultar el producto')
  }

  if (!data) {
    throw new Error('Producto no encontrado')
  }

  if (!data.activo) {
    throw new Error('No se puede registrar inventario para un producto inactivo')
  }

  return data
}


type ItemEntrada = {
  producto_id: string
  unidad_id: string
  cantidad: number
}

type DatosEntrada = {
  motivo: string
  usuario_actor: string
  observaciones?: string
  items: ItemEntrada[]
}

export async function registrarEntrada(datos: DatosEntrada) {
  if (!datos.motivo.trim()) {
    throw new Error('El motivo es obligatorio')
  }

  if (!datos.usuario_actor.trim()) {
    throw new Error('El usuario actor es obligatorio')
  }

  if (!datos.items.length) {
    throw new Error('Debe incluir al menos un producto')
  }

  for (const item of datos.items) {
    if (
      !item.producto_id ||
      !item.unidad_id ||
      !Number.isFinite(item.cantidad) ||
      item.cantidad <= 0
    ) {
      throw new Error('Los datos de uno de los productos no son válidos')
    }
  }

  const { data, error } = await getSupabaseClient().rpc(
    'registrar_entrada_inventario',
    {
      p_motivo: datos.motivo.trim(),
      p_usuario_actor: datos.usuario_actor.trim(),
      p_observaciones: datos.observaciones?.trim() || null,
      p_items: datos.items,
    },
  )

  if (error) {
    console.error('Error al registrar entrada:', error)
    throw new Error('No fue posible registrar la entrada de inventario')
  }

  return { id: data }
}


export async function listarStockProductos(activo?: boolean) {
  let consulta = getSupabaseClient()
    .from('stock_productos')
    .select('*')
    .order('nombre', { ascending: true })

  if (activo !== undefined) {
    consulta = consulta.eq('activo', activo)
  }

  const { data, error } = await consulta

  if (error) {
    console.error('Error al consultar stock:', error)
    throw new Error('No fue posible consultar el inventario')
  }

  return data
}


type ItemAjuste = {
  producto_id: string
  unidad_id: string
  cantidad: number
}

type DatosAjuste = {
  motivo: string
  usuario_actor: string
  items: ItemAjuste[]
  confirmar_stock_negativo?: boolean
  fecha?: string
  observaciones?: string
  clave?: string
}

export async function registrarAjuste(datos: DatosAjuste) {
  if (!datos.motivo.trim()) {
    throw new Error('El motivo es obligatorio')
  }

  if (!datos.usuario_actor.trim()) {
    throw new Error('El usuario actor es obligatorio')
  }

  if (!datos.items.length) {
    throw new Error('Debe incluir al menos un producto')
  }

  for (const item of datos.items) {
    if (
      !item.producto_id ||
      !item.unidad_id ||
      !Number.isFinite(item.cantidad) ||
      item.cantidad === 0
    ) {
      throw new Error('Los datos de uno de los productos no son válidos')
    }
  }

  const { data, error } = await getSupabaseClient().rpc(
    'registrar_ajuste',
    {
      p_motivo: datos.motivo.trim(),
      p_usuario: datos.usuario_actor.trim(),
      p_items: datos.items,
      p_confirmar_stock_negativo:
        datos.confirmar_stock_negativo ?? false,
      p_fecha: datos.fecha || null,
      p_observaciones: datos.observaciones?.trim() || null,
      p_clave: datos.clave || null,
    },
  )

  if (error) {
  console.error('Error al registrar ajuste en Supabase:', error)
  throw error
}

  return { id: data }
}


export async function listarMovimientosInventario() {
  const { data, error } = await getSupabaseClient()
    .from('movimientos_inventario')
    .select(`
      id,
      fecha,
      tipo,
      cantidad_original,
      cantidad_base,
      motivo,
      usuario_actor,
      costo_unitario_base,
      referencia_tipo,
      referencia_id,
      producto:productos (
        id,
        codigo,
        nombre
      )
    `)
    .order('fecha', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error al consultar movimientos de inventario:', error)
    throw new Error('No fue posible consultar el historial de movimientos')
  }

  return data
}
