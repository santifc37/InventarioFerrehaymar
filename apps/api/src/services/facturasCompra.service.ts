import { getSupabaseClient } from '../config/supabase'
import type { SolicitudImportacion } from '../utils/facturasCompra'

/** Error de validación de negocio lanzado por la base de datos (código FH002). */
export class ErrorValidacionFactura extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorValidacionFactura'
  }
}

export interface ResultadoImportacion {
  duplicada: boolean
  factura_id: string
  ajuste_entrada_id: string
  lineas_importadas: number
  precios_actualizados: number
  importada_en?: string
}

export interface ResultadoBusqueda {
  existe: boolean
  factura_id?: string
  numero?: string
  proveedor_nombre?: string | null
  importada_en?: string
}

// El usuario que queda registrado en los movimientos de las importaciones.
const USUARIO_IMPORTADOR = 'importador-dian'

export async function buscarFacturaCompra(
  nit: string,
  numero: string,
): Promise<ResultadoBusqueda> {
  const { data, error } = await getSupabaseClient().rpc('buscar_factura_compra', {
    p_nit: nit,
    p_numero: numero,
  })

  if (error) {
    console.error('Error al buscar la factura de compra:', error)
    throw new Error('No fue posible consultar la factura')
  }

  return data as ResultadoBusqueda
}

export async function importarFacturaCompra(
  solicitud: SolicitudImportacion,
): Promise<ResultadoImportacion> {
  const { data, error } = await getSupabaseClient().rpc('importar_factura_compra', {
    p_usuario: USUARIO_IMPORTADOR,
    p_proveedor_nit: solicitud.proveedor_nit,
    p_proveedor_nombre: solicitud.proveedor_nombre,
    p_numero: solicitud.numero,
    p_fecha_emision: solicitud.fecha_emision,
    p_tipo_documento: solicitud.tipo_documento,
    p_lineas: solicitud.lineas,
  })

  if (error) {
    if (error.code === 'FH002') {
      throw new ErrorValidacionFactura(error.message)
    }

    console.error('Error al importar la factura de compra:', error)
    throw new Error('No fue posible importar la factura')
  }

  return data as ResultadoImportacion
}

export async function listarFacturasCompra(limite = 100) {
  const { data, error } = await getSupabaseClient()
    .from('facturas_compra')
    .select(
      `
      id,
      proveedor_nit,
      proveedor_nombre,
      numero_original,
      fecha_emision,
      total_lineas,
      lineas_importadas,
      precios_actualizados,
      usuario_actor,
      creado_en
    `,
    )
    .order('creado_en', { ascending: false })
    .limit(limite)

  if (error) {
    console.error('Error al listar facturas de compra:', error)
    throw new Error('No fue posible consultar el historial de facturas')
  }

  return data ?? []
}

export async function obtenerFacturaCompra(id: string) {
  const cliente = getSupabaseClient()

  const { data: factura, error } = await cliente
    .from('facturas_compra')
    .select(
      `
      id,
      proveedor_nit,
      proveedor_nombre,
      numero_original,
      fecha_emision,
      tipo_documento,
      ajuste_entrada_id,
      total_lineas,
      lineas_importadas,
      precios_actualizados,
      usuario_actor,
      creado_en
    `,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Error al consultar la factura de compra:', error)
    throw new Error('No fue posible consultar la factura')
  }

  if (!factura) return null

  const { data: items, error: errorItems } = await cliente
    .from('factura_compra_items')
    .select(
      `
      id,
      linea,
      producto_id,
      descripcion,
      codigo_proveedor,
      cantidad,
      unidad,
      precio_unitario_factura,
      precio_compra_anterior,
      diferencia,
      variacion_pct,
      estado_coincidencia,
      estado_importacion,
      decision_precio,
      producto:productos ( id, codigo, nombre )
    `,
    )
    .eq('factura_compra_id', id)
    .order('linea', { ascending: true })

  if (errorItems) {
    console.error('Error al consultar las líneas de la factura:', errorItems)
    throw new Error('No fue posible consultar la factura')
  }

  return { ...factura, items: items ?? [] }
}

/** Evolución del precio de compra de un producto según las facturas importadas. */
export async function historialPreciosProducto(productoId: string) {
  const { data, error } = await getSupabaseClient()
    .from('factura_compra_items')
    .select(
      `
      linea,
      cantidad,
      unidad,
      precio_unitario_factura,
      precio_compra_anterior,
      diferencia,
      variacion_pct,
      decision_precio,
      estado_importacion,
      factura:facturas_compra ( id, numero_original, proveedor_nombre, fecha_emision, creado_en )
    `,
    )
    .eq('producto_id', productoId)
    .eq('estado_importacion', 'importada')
    .limit(200)

  if (error) {
    console.error('Error al consultar el historial de precios:', error)
    throw new Error('No fue posible consultar el historial de precios')
  }

  type Fila = NonNullable<typeof data>[number]
  const fechaDe = (fila: Fila): string => {
    const factura = Array.isArray(fila.factura) ? fila.factura[0] : fila.factura
    return factura?.creado_en ?? ''
  }

  return [...(data ?? [])].sort((a, b) => fechaDe(b).localeCompare(fechaDe(a)))
}
