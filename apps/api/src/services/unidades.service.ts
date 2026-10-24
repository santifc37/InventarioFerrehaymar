
import { getSupabaseClient } from '../config/supabase'

export async function listarUnidades() {
  const { data, error } = await getSupabaseClient()
    .from('unidades')
    .select('id, codigo, nombre')
    .order('nombre', { ascending: true })

  if (error) {
    console.error('Error de Supabase al consultar unidades:', error)
    throw new Error('No fue posible consultar las unidades')
  }

  return data
}
