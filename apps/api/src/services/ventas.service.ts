
import { getSupabaseClient } from '../config/supabase'

export interface ItemVenta {
  producto_id: string
  cantidad: number
  unidad_id?: string
  precio_unitario: number
}

export interface RegistrarVentaInput {
  items: ItemVenta[]
  fecha_venta?: string
  observaciones?: string | null
  confirmar_stock_negativo?: boolean
}

export interface CorregirVentaInput extends RegistrarVentaInput {
  motivo: string
}

function validarItems(items: ItemVenta[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('La venta debe contener al menos un producto.')
  }

  for (const item of items) {
    if (
      !item.producto_id ||
      typeof item.producto_id !== 'string' ||
      !Number.isFinite(item.cantidad) ||
      item.cantidad <= 0 ||
      !Number.isFinite(item.precio_unitario) ||
      item.precio_unitario < 0
    ) {
      throw new Error('Uno o más productos tienen datos inválidos.')
    }

    if (
      item.unidad_id !== undefined &&
      typeof item.unidad_id !== 'string'
    ) {
      throw new Error('La unidad de medida no es válida.')
    }
  }
}

function validarMotivo(motivo: string): void {
  if (typeof motivo !== 'string' || motivo.trim().length < 3) {
    throw new Error('Debes indicar un motivo de al menos 3 caracteres.')
  }
}

export async function registrarVenta(
  input: RegistrarVentaInput,
  usuario: string,
  clave: string,
) {
  validarItems(input.items)

  if (!clave.trim()) {
  throw new Error('Debes proporcionar una clave de idempotencia.')
}

  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('registrar_venta', {
    p_usuario: usuario,
    p_items: input.items,
    p_fecha_venta: input.fecha_venta ?? null,
    p_observaciones: input.observaciones ?? null,
    p_confirmar_stock_negativo: input.confirmar_stock_negativo ?? false,
    p_clave: clave,
  })

  if (error) {
    console.error('Error al registrar venta:', error.message)
    throw new Error(error.message)
  }

  return { id: data as string }
}

export async function listarVentas(
  fechaDesde?: string,
  fechaHasta?: string,
) {
  const supabase = getSupabaseClient()

  let consulta = supabase
    .from('ventas')
    .select(`
      id,
      fecha_venta,
      fecha_registro,
      total,
      observaciones,
      estado,
      usuario_registro,
      motivo_correccion,
      corregida_por_venta_id,
      venta_items (
        id,
        producto_id,
        cantidad,
        unidad_id,
        factor_conversion,
        cantidad_base,
        precio_unitario,
        costo_unitario_base,
        subtotal,
        utilidad_estimada,
        nombre_producto_snapshot,
        codigo_producto_snapshot
      )
    `)
    .order('fecha_venta', { ascending: false })
    .order('fecha_registro', { ascending: false })

  if (fechaDesde) {
    consulta = consulta.gte('fecha_venta', fechaDesde)
  }

  if (fechaHasta) {
    consulta = consulta.lte('fecha_venta', fechaHasta)
  }

  const { data, error } = await consulta

  if (error) {
    console.error('Error al consultar ventas:', error.message)
    throw new Error('No fue posible consultar las ventas.')
  }

  return data
}

export async function obtenerVenta(id: string) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('ventas')
    .select(`
      id,
      fecha_venta,
      fecha_registro,
      total,
      observaciones,
      estado,
      usuario_registro,
      motivo_correccion,
      corregida_por_venta_id,
      venta_items (
        id,
        producto_id,
        cantidad,
        unidad_id,
        factor_conversion,
        cantidad_base,
        precio_unitario,
        costo_unitario_base,
        subtotal,
        utilidad_estimada,
        nombre_producto_snapshot,
        codigo_producto_snapshot
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Error al consultar venta:', error.message)
    throw new Error('No fue posible consultar la venta.')
  }

  if (!data) {
    throw new Error('Venta no encontrada.')
  }

  return data
}

export async function anularVenta(
  id: string,
  motivo: string,
  usuario = 'vendedor',
) {
  validarMotivo(motivo)

  const supabase = getSupabaseClient()

  const { error } = await supabase.rpc('anular_venta', {
    p_venta_id: id,
    p_motivo: motivo.trim(),
    p_usuario_actor: usuario,
  })

  if (error) {
    console.error('Error al anular venta:', error.message)
    throw new Error(error.message)
  }

  return { id, estado: 'anulada' }
}

export async function corregirVenta(
  id: string,
  input: CorregirVentaInput,
  usuario: string,
  clave: string,
) {
  validarMotivo(input.motivo)
  validarItems(input.items)

  if (!clave.trim()) {
    throw new Error('Debes proporcionar una clave de idempotencia.')
  }

  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('corregir_venta', {
    p_venta_id: id,
    p_motivo: input.motivo.trim(),
    p_usuario: usuario,
    p_items: input.items,
    p_fecha_venta: input.fecha_venta ?? null,
    p_observaciones: input.observaciones ?? null,
    p_confirmar_stock_negativo: input.confirmar_stock_negativo ?? false,
    p_clave: clave,
  })

  if (error) {
    console.error('Error al corregir venta:', error.message)
    throw new Error(error.message)
  }

  return { id: data as string }
}
