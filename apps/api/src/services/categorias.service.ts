
import { getSupabaseClient } from '../config/supabase'

export async function listarCategorias() {
  const { data, error } = await getSupabaseClient()
    .from('categorias')
    .select('id, nombre, descripcion, activo, creado_en')
    .order('nombre', { ascending: true })

  if (error) {
      console.error('Error de Supabase al consultar categorías:', error)
  throw new Error('No fue posible consultar las categorías')
  }

  return data
}


export async function crearCategoria(
  nombre: string,
  descripcion?: string,
) {
  const nombreNormalizado = nombre.trim()

  if (!nombreNormalizado) {
    throw new Error('El nombre de la categoría es obligatorio')
  }

  const { data, error } = await getSupabaseClient()
    .from('categorias')
    .insert({
      nombre: nombreNormalizado,
      descripcion: descripcion?.trim() || null,
    })
    .select('id, nombre, descripcion, activo, creado_en')
    .single()

  if (error) {
    throw new Error('No fue posible crear la categoría')
  }

  return data
}


export async function editarCategoria(
  id: string,
  nombre: string,
  descripcion?: string | null,
) {
  const nombreNormalizado = nombre.trim()

  if (!nombreNormalizado) {
    throw new Error('El nombre de la categoría es obligatorio')
  }

  const { data, error } = await getSupabaseClient()
    .from('categorias')
    .update({
      nombre: nombreNormalizado,
      descripcion: descripcion?.trim() || null,
    })
    .eq('id', id)
    .select('id, nombre, descripcion, activo, creado_en')
    .maybeSingle()

  if (error) {
    throw new Error('No fue posible editar la categoría')
  }

  if (!data) {
    throw new Error('Categoría no encontrada')
  }

  return data
}


export async function desactivarCategoria(id: string) {
  const { data, error } = await getSupabaseClient()
    .from('categorias')
    .update({ activo: false })
    .eq('id', id)
    .select('id, nombre, descripcion, activo, creado_en')
    .maybeSingle()

  if (error) {
    throw new Error('No fue posible desactivar la categoría')
  }

  if (!data) {
    throw new Error('Categoría no encontrada')
  }

  return data
}

