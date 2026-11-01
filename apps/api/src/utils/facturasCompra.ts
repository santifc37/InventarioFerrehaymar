/**
 * Validación pura de la solicitud de importación de una factura de compra.
 * No depende de Express ni de Supabase, para poder probarla fácilmente.
 */

export const ESTADOS_COINCIDENCIA = [
  'coincidencia_alta',
  'revision_manual',
  'sin_coincidencia',
] as const

export type EstadoCoincidencia = (typeof ESTADOS_COINCIDENCIA)[number]

export interface LineaImportacion {
  linea: number
  producto_id: string | null
  descripcion: string
  codigo_proveedor: string | null
  cantidad: number | null
  unidad: string | null
  precio_unitario: number | null
  estado_coincidencia: EstadoCoincidencia
  importar: boolean
  actualizar_precio: boolean
  precio_nuevo: number | null
}

export interface SolicitudImportacion {
  proveedor_nit: string
  proveedor_nombre: string | null
  numero: string
  fecha_emision: string | null
  tipo_documento: 'factura'
  lineas: LineaImportacion[]
}

export type ResultadoValidacion =
  | { ok: true; datos: SolicitudImportacion }
  | { ok: false; error: string }

export const MAX_LINEAS = 500

const PATRON_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function esUuid(valor: unknown): valor is string {
  return typeof valor === 'string' && PATRON_UUID.test(valor)
}

function textoObligatorio(valor: unknown, max: number): string | null {
  if (typeof valor !== 'string') return null

  const limpio = valor.trim()

  return limpio && limpio.length <= max ? limpio : null
}

function textoOpcional(valor: unknown, max: number): string | null | undefined {
  if (valor === undefined || valor === null) return null
  if (typeof valor !== 'string') return undefined

  const limpio = valor.trim()

  if (!limpio) return null

  return limpio.length <= max ? limpio : undefined
}

function numeroOpcional(valor: unknown): number | null | undefined {
  if (valor === undefined || valor === null) return null
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return undefined

  return valor
}

function fechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false

  const fecha = new Date(`${valor}T00:00:00Z`)

  return (
    Number.isFinite(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  )
}

export function validarSolicitudImportacion(cuerpo: unknown): ResultadoValidacion {
  if (!cuerpo || typeof cuerpo !== 'object') {
    return { ok: false, error: 'La solicitud no es válida' }
  }

  const datos = cuerpo as Record<string, unknown>

  const nit = textoObligatorio(datos.proveedor_nit, 40)
  const numero = textoObligatorio(datos.numero, 80)

  if (!nit || !numero) {
    return {
      ok: false,
      error: 'El NIT del proveedor y el número de la factura son obligatorios',
    }
  }

  const nombre = textoOpcional(datos.proveedor_nombre, 200)

  if (nombre === undefined) {
    return { ok: false, error: 'El nombre del proveedor no es válido' }
  }

  let fechaEmision: string | null = null

  if (datos.fecha_emision !== undefined && datos.fecha_emision !== null) {
    if (typeof datos.fecha_emision !== 'string' || !fechaValida(datos.fecha_emision)) {
      return { ok: false, error: 'La fecha de emisión no es válida' }
    }

    fechaEmision = datos.fecha_emision
  }

  if (datos.tipo_documento !== 'factura') {
    return { ok: false, error: 'Solo se pueden importar facturas de compra' }
  }

  if (!Array.isArray(datos.lineas) || datos.lineas.length === 0) {
    return { ok: false, error: 'La factura debe incluir al menos una línea' }
  }

  if (datos.lineas.length > MAX_LINEAS) {
    return { ok: false, error: `La factura supera el máximo de ${MAX_LINEAS} líneas` }
  }

  const lineas: LineaImportacion[] = []
  const numerosUsados = new Set<number>()
  let porImportar = 0

  for (const [posicion, crudo] of datos.lineas.entries()) {
    const etiqueta = `La línea ${posicion + 1}`

    if (!crudo || typeof crudo !== 'object') {
      return { ok: false, error: `${etiqueta} no es válida` }
    }

    const item = crudo as Record<string, unknown>

    const numeroLinea = item.linea
    if (
      typeof numeroLinea !== 'number' ||
      !Number.isInteger(numeroLinea) ||
      numeroLinea < 1 ||
      numerosUsados.has(numeroLinea)
    ) {
      return { ok: false, error: `${etiqueta} tiene un número de línea no válido o repetido` }
    }
    numerosUsados.add(numeroLinea)

    const descripcion = textoObligatorio(item.descripcion, 1000)
    if (!descripcion) {
      return { ok: false, error: `${etiqueta} no tiene una descripción válida` }
    }

    if (item.producto_id !== null && item.producto_id !== undefined && !esUuid(item.producto_id)) {
      return { ok: false, error: `${etiqueta} tiene un producto no válido` }
    }

    const codigo = textoOpcional(item.codigo_proveedor, 100)
    const unidad = textoOpcional(item.unidad, 30)
    const cantidad = numeroOpcional(item.cantidad)
    const precio = numeroOpcional(item.precio_unitario)
    const precioNuevo = numeroOpcional(item.precio_nuevo)

    if (
      codigo === undefined ||
      unidad === undefined ||
      cantidad === undefined ||
      precio === undefined ||
      precioNuevo === undefined
    ) {
      return { ok: false, error: `${etiqueta} tiene datos que no son válidos` }
    }

    if (typeof item.importar !== 'boolean' || typeof item.actualizar_precio !== 'boolean') {
      return { ok: false, error: `${etiqueta} debe indicar si se importa y si cambia el precio` }
    }

    if (
      typeof item.estado_coincidencia !== 'string' ||
      !(ESTADOS_COINCIDENCIA as readonly string[]).includes(item.estado_coincidencia)
    ) {
      return { ok: false, error: `${etiqueta} tiene un estado de coincidencia no válido` }
    }

    const productoId = esUuid(item.producto_id) ? item.producto_id : null

    if (item.importar) {
      if (!productoId) {
        return { ok: false, error: `${etiqueta} se va a importar pero no tiene producto` }
      }

      if (cantidad === null || cantidad <= 0) {
        return { ok: false, error: `${etiqueta} debe tener una cantidad mayor que cero` }
      }

      porImportar++
    }

    if (item.actualizar_precio) {
      if (!item.importar) {
        return { ok: false, error: `${etiqueta} cambia el precio pero no se importa` }
      }

      if (precioNuevo === null || precioNuevo <= 0) {
        return { ok: false, error: `${etiqueta} debe tener un precio nuevo mayor que cero` }
      }
    }

    if ((precio !== null && precio < 0) || (precioNuevo !== null && precioNuevo < 0)) {
      return { ok: false, error: `${etiqueta} tiene precios negativos` }
    }

    lineas.push({
      linea: numeroLinea,
      producto_id: productoId,
      descripcion,
      codigo_proveedor: codigo,
      cantidad,
      unidad,
      precio_unitario: precio,
      estado_coincidencia: item.estado_coincidencia as EstadoCoincidencia,
      importar: item.importar,
      actualizar_precio: item.actualizar_precio,
      precio_nuevo: precioNuevo,
    })
  }

  if (porImportar === 0) {
    return { ok: false, error: 'Debe haber al menos una línea para importar' }
  }

  return {
    ok: true,
    datos: {
      proveedor_nit: nit,
      proveedor_nombre: nombre,
      numero,
      fecha_emision: fechaEmision,
      tipo_documento: 'factura',
      lineas,
    },
  }
}
