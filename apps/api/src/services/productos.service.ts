
import { getSupabaseClient } from '../config/supabase'

export async function listarProductos(activo?: boolean) {
    let query = getSupabaseClient()
    .from('productos')
    .select(`
      id,
      codigo,
      codigo_barras,
      nombre,
      descripcion,
      categoria_id,
      unidad_base_id,
      precio_compra,
      precio_venta,
      stock_minimo,
      activo,
      creado_en,
      actualizado_en
    `)
    .order('nombre', { ascending: true })

  if (activo !== undefined) {
    query = query.eq('activo', activo)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error de Supabase al consultar productos:', error)
    throw new Error('No fue posible consultar los productos')
  }

  return data
}


export async function crearProducto(datos: {
  codigo: string
  codigo_barras?: string | null
  nombre: string
  descripcion?: string | null
  categoria_id: string
  unidad_base_id: string
  precio_compra: number
  precio_venta: number
  stock_minimo: number
}) {
  const { data, error } = await getSupabaseClient()
    .from('productos')
    .insert({
      codigo: datos.codigo.trim(),
      codigo_barras: datos.codigo_barras?.trim() || null,
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion?.trim() || null,
      categoria_id: datos.categoria_id,
      unidad_base_id: datos.unidad_base_id,
      precio_compra: datos.precio_compra,
      precio_venta: datos.precio_venta,
      stock_minimo: datos.stock_minimo,
    })
    .select(`
      id,
      codigo,
      codigo_barras,
      nombre,
      descripcion,
      categoria_id,
      unidad_base_id,
      precio_compra,
      precio_venta,
      stock_minimo,
      activo,
      creado_en,
      actualizado_en
    `)
    .single()

  if (error) {
    console.error('Error de Supabase al crear producto:', error)
    throw new Error('No fue posible crear el producto')
  }

  return data
}


export async function editarProducto(
  id: string,
  datos: {
    codigo: string
    codigo_barras?: string | null
    nombre: string
    descripcion?: string | null
    categoria_id: string
    unidad_base_id: string
    precio_compra: number
    precio_venta: number
    stock_minimo: number
  },
) {
  const { data, error } = await getSupabaseClient()
    .from('productos')
    .update({
      codigo: datos.codigo.trim(),
      codigo_barras: datos.codigo_barras?.trim() || null,
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion?.trim() || null,
      categoria_id: datos.categoria_id,
      unidad_base_id: datos.unidad_base_id,
      precio_compra: datos.precio_compra,
      precio_venta: datos.precio_venta,
      stock_minimo: datos.stock_minimo,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      id,
      codigo,
      codigo_barras,
      nombre,
      descripcion,
      categoria_id,
      unidad_base_id,
      precio_compra,
      precio_venta,
      stock_minimo,
      activo,
      creado_en,
      actualizado_en
    `)
    .maybeSingle()

  if (error) {
    console.error('Error de Supabase al editar producto:', error)
    throw new Error('No fue posible editar el producto')
  }

  if (!data) {
    throw new Error('Producto no encontrado')
  }

  return data
}


export async function desactivarProducto(id: string) {
  const { data, error } = await getSupabaseClient()
    .from('productos')
    .update({
      activo: false,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      id,
      codigo,
      codigo_barras,
      nombre,
      descripcion,
      categoria_id,
      unidad_base_id,
      precio_compra,
      precio_venta,
      stock_minimo,
      activo,
      creado_en,
      actualizado_en
    `)
    .maybeSingle()

  if (error) {
    console.error('Error de Supabase al desactivar producto:', error)
    throw new Error('No fue posible desactivar el producto')
  }

  if (!data) {
    throw new Error('Producto no encontrado')
  }

  return data
}


