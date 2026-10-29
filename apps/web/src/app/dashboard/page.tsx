
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Registro = Record<string, any>

const secciones = [
  { nombre: 'Dashboard', ruta: '/dashboard', icono: '▦' },
  { nombre: 'Productos', ruta: '/productos', icono: '□' },
  { nombre: 'Categorías', ruta: '/categorias', icono: '▤' },
  { nombre: 'Ventas', ruta: '/ventas', icono: '$' },
  { nombre: 'Movimientos', ruta: '/movimientos', icono: '↕' },
  { nombre: 'Importación', ruta: '/importacion', icono: '⇧' },
]

const API_URL = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000'
).replace(/\/+$/, '')

const moneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function dinero(valor: number) {
  return moneda.format(Number.isFinite(valor) ? valor : 0)
}

function numero(valor: unknown): number {
  const resultado = Number(valor)
  return Number.isFinite(resultado) ? resultado : 0
}

function texto(valor: unknown, alternativa = '—'): string {
  return typeof valor === 'string' && valor.trim()
    ? valor
    : alternativa
}

function fechaBogota(fecha = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha)

  const obtener = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? ''

  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`
}

function claveFecha(fecha: unknown): string {
  if (typeof fecha !== 'string' || !fecha) return ''
  return fecha.slice(0, 10)
}

function fechaLegible(fecha: unknown): string {
  if (typeof fecha !== 'string' || !fecha) return 'Sin fecha'

  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) return fecha

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function cantidadStock(producto: Registro): number {
  for (const campo of [
    'stock_actual',
    'cantidad_actual',
    'existencia',
    'stock',
    'cantidad_disponible',
    'cantidad',
  ]) {
    if (producto[campo] !== undefined && producto[campo] !== null) {
      return numero(producto[campo])
    }
  }

  return 0
}

function minimoStock(producto: Registro): number {
  return numero(
    producto.stock_minimo ??
    producto.minimo_stock ??
    producto.cantidad_minima ??
    0,
  )
}

function nombreProducto(item: Registro): string {
  const producto = Array.isArray(item.producto)
    ? item.producto[0]
    : item.producto

  return texto(
    item.nombre_producto_snapshot ??
    producto?.nombre ??
    item.nombre,
    'Producto sin nombre',
  )
}

function codigoProducto(item: Registro): string {
  const producto = Array.isArray(item.producto)
    ? item.producto[0]
    : item.producto

  return texto(
    item.codigo_producto_snapshot ??
    producto?.codigo ??
    item.codigo,
    'Sin código',
  )
}

async function consultarApi(
  ruta: string,
  cookieSesion: string,
): Promise<any | null> {
  try {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
      headers: {
        cookie: `sesion=${cookieSesion}`,
      },
    })

    if (!respuesta.ok) return null

    return await respuesta.json()
  } catch (error) {
    console.error(`Error consultando ${ruta}:`, error)
    return null
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const cookieSesion = cookieStore.get('sesion')?.value

  if (!cookieSesion) redirect('/login')

  const sesion = await consultarApi('/auth/me', cookieSesion)

  if (!sesion) redirect('/login')

  const [respuestaProductos, respuestaStock, respuestaVentas, respuestaMovimientos] =
    await Promise.all([
      consultarApi('/productos?activo=true', cookieSesion),
      consultarApi('/inventario/stock?activo=true', cookieSesion),
      consultarApi('/ventas', cookieSesion),
      consultarApi('/inventario/movimientos', cookieSesion),
    ])

  const productos: Registro[] = Array.isArray(respuestaProductos)
    ? respuestaProductos
    : []

  const stock: Registro[] = Array.isArray(respuestaStock?.productos)
    ? respuestaStock.productos
    : []

  const ventas: Registro[] = Array.isArray(respuestaVentas?.datos)
    ? respuestaVentas.datos
    : []

  const movimientos: Registro[] = Array.isArray(
    respuestaMovimientos?.movimientos,
  )
    ? respuestaMovimientos.movimientos
    : []

  const hoy = fechaBogota()
  const ventasValidas = ventas.filter(
    (venta) => String(venta.estado ?? '').toLowerCase() !== 'anulada',
  )

  const ventasHoy = ventasValidas.filter(
    (venta) => claveFecha(venta.fecha_venta) === hoy,
  )

  const totalHoy = ventasHoy.reduce(
    (total, venta) => total + numero(venta.total),
    0,
  )

  const cantidadVentasHoy = ventasHoy.length

  const stockBajo = stock.filter((producto) => {
    const actual = cantidadStock(producto)
    const minimo = minimoStock(producto)
    return actual > 0 && minimo > 0 && actual <= minimo
  })

  const agotados = stock.filter(
    (producto) => cantidadStock(producto) <= 0,
  )

  const gananciaHoy = ventasHoy.reduce((total, venta) => {
    const items = Array.isArray(venta.venta_items)
      ? venta.venta_items
      : []

    return total + items.reduce(
      (suma: number, item: Registro) =>
        suma + numero(item.utilidad_estimada),
      0,
    )
  }, 0)

  const dias = Array.from({ length: 7 }, (_, indice) => {
    const fecha = new Date(`${hoy}T12:00:00-05:00`)
    fecha.setUTCDate(fecha.getUTCDate() - (6 - indice))

    const clave = [
      fecha.getUTCFullYear(),
      String(fecha.getUTCMonth() + 1).padStart(2, '0'),
      String(fecha.getUTCDate()).padStart(2, '0'),
    ].join('-')

    const nombre = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      weekday: 'short',
    }).format(fecha)

    return { clave, nombre: nombre.replace('.', '') }
  })

  const ventasSemana = dias.map((dia) => ({
    ...dia,
    total: ventasValidas
      .filter((venta) => claveFecha(venta.fecha_venta) === dia.clave)
      .reduce((suma, venta) => suma + numero(venta.total), 0),
  }))

  const maxVentaSemana = Math.max(
    ...ventasSemana.map((dia) => dia.total),
    1,
  )

  const totalSemana = ventasSemana.reduce(
    (suma, dia) => suma + dia.total,
    0,
  )

  const ranking = new Map<
    string,
    { nombre: string; codigo: string; unidades: number; total: number }
  >()

  for (const venta of ventasValidas) {
    const items = Array.isArray(venta.venta_items)
      ? venta.venta_items
      : []

    for (const item of items) {
      const id = texto(item.producto_id, nombreProducto(item))
      const existente = ranking.get(id) ?? {
        nombre: nombreProducto(item),
        codigo: codigoProducto(item),
        unidades: 0,
        total: 0,
      }

      existente.unidades += numero(item.cantidad)
      existente.total += numero(item.subtotal)
      ranking.set(id, existente)
    }
  }

  const productosMasVendidos = Array.from(ranking.values())
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 5)

  const alertas = stock
    .filter((producto) => {
      const actual = cantidadStock(producto)
      const minimo = minimoStock(producto)
      return actual <= 0 || (minimo > 0 && actual <= minimo)
    })
    .sort((a, b) => cantidadStock(a) - cantidadStock(b))
    .slice(0, 5)

  const actividad = [
    ...ventas.map((venta) => ({
      tipo: 'Venta',
      detalle: `Venta ${texto(venta.estado, 'registrada').toLowerCase()}`,
      fecha: texto(venta.fecha_venta ?? venta.fecha_registro),
      referencia: texto(venta.id).slice(0, 8),
    })),
    ...movimientos.map((movimiento) => {
      const producto = Array.isArray(movimiento.producto)
        ? movimiento.producto[0]
        : movimiento.producto

      return {
        tipo: texto(movimiento.tipo, 'Movimiento'),
        detalle: texto(producto?.nombre, texto(movimiento.motivo, 'Movimiento de inventario')),
        fecha: texto(movimiento.fecha),
        referencia: texto(movimiento.id).slice(0, 8),
      }
    }),
  ]
    .sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime() || 0
      const fechaB = new Date(b.fecha).getTime() || 0
      return fechaB - fechaA
    })
    .slice(0, 6)

  const hayErrorDatos =
    !respuestaProductos ||
    !respuestaStock ||
    !respuestaVentas ||
    !respuestaMovimientos

  return (
    <main className="panel-aplicacion">
      <aside className="barra-lateral">
        <a className="marca" href="/dashboard">
          <span className="marca-icono">H</span>
          <span>
            <strong>Ferrehaymar</strong>
            <small>Gestión de inventario</small>
          </span>
        </a>

        <p className="menu-etiqueta">MENÚ PRINCIPAL</p>

        <nav className="menu-navegacion" aria-label="Menú principal">
          {secciones.map((seccion) => {
            const activa = seccion.ruta === '/dashboard'

            return (
              <a
                key={seccion.ruta}
                href={seccion.ruta}
                className={`enlace-menu ${activa ? 'enlace-menu-activo' : ''}`}
                aria-current={activa ? 'page' : undefined}
              >
                <span className="menu-icono">{seccion.icono}</span>
                {seccion.nombre}
                {activa && <span className="menu-indicador" />}
              </a>
            )
          })}
        </nav>

        <div className="lateral-pie">
          <span className="estado-conectado" />
          <span>
            <strong>Sistema de inventario</strong>
            <small>Ferretería Haymar</small>
          </span>
        </div>
      </aside>

      <section className="contenido-aplicacion">
        <header className="cabecera-panel">
          <div>
            <p className="migas-pan">Inicio / Dashboard</p>
            <h1>Dashboard</h1>
            <p className="texto-secundario">
              Resumen de tu ferretería con información del inventario y las ventas.
            </p>
          </div>

          <div className="usuario-panel">
            <div className="avatar-usuario">H</div>
            <div>
              <strong>Ferretería Haymar</strong>
              <small>Sesión activa</small>
            </div>
          </div>
        </header>

        <div className="contenido-dashboard">
          {hayErrorDatos && (
            <div className="aviso-demostracion">
              <span>!</span>
              <p>
                <strong>Información incompleta.</strong> No fue posible consultar
                uno o más servicios de la API. Los indicadores muestran únicamente
                los datos que se pudieron obtener; revisa la conexión con Render.
              </p>
            </div>
          )}

          <section className="bienvenida-panel">
            <div>
              <p className="bienvenida-etiqueta">PANEL DE CONTROL</p>
              <h2>¡Bienvenido a Ferrehaymar!</h2>
              <p>
                Consulta tus ventas, revisa las existencias y encuentra
                rápidamente los productos que necesitan reposición.
              </p>
            </div>
            <div className="bienvenida-icono" aria-hidden="true">▥</div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Resumen general</h2>
                <p>Indicadores del día y del inventario actual</p>
              </div>
              <span className="etiqueta-ejemplo">Datos reales</span>
            </div>

            <div className="rejilla-indicadores">
              {[
                {
                  titulo: 'Ventas de hoy',
                  valor: dinero(totalHoy),
                  descripcion: 'Total de ventas no anuladas',
                  icono: '$',
                  tipo: 'azul',
                },
                {
                  titulo: 'Ventas registradas',
                  valor: String(cantidadVentasHoy),
                  descripcion: 'Ventas válidas de hoy',
                  icono: '↗',
                  tipo: 'verde',
                },
                {
                  titulo: 'Productos activos',
                  valor: String(productos.length),
                  descripcion: 'Referencias activas',
                  icono: '□',
                  tipo: 'morado',
                },
                {
                  titulo: 'Stock bajo',
                  valor: String(stockBajo.length),
                  descripcion: 'Productos en su mínimo o por debajo',
                  icono: '!',
                  tipo: 'naranja',
                },
                {
                  titulo: 'Agotados',
                  valor: String(agotados.length),
                  descripcion: 'Productos sin existencias',
                  icono: '○',
                  tipo: 'rojo',
                },
                {
                  titulo: 'Ganancia estimada',
                  valor: dinero(gananciaHoy),
                  descripcion: 'Suma de utilidad estimada registrada en las ventas',
                  icono: '↗',
                  tipo: 'verde',
                },
              ].map((indicador) => (
                <article className="tarjeta-indicador" key={indicador.titulo}>
                  <div className="indicador-superior">
                    <span className={`indicador-icono indicador-${indicador.tipo}`}>
                      {indicador.icono}
                    </span>
                  </div>
                  <h3>{indicador.titulo}</h3>
                  <p className="indicador-valor">{indicador.valor}</p>
                  <p className="indicador-descripcion">{indicador.descripcion}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Evolución de las ventas</h2>
                <p>Ventas de los últimos siete días, incluido hoy</p>
              </div>
            </div>

            <div className="panel-grafico">
              <div className="grafico-resumen">
                <span>Total vendido en el periodo</span>
                <strong>{dinero(totalSemana)}</strong>
              </div>

              <div
                className="grafico-barras"
                role="img"
                aria-label="Gráfico de ventas de los últimos siete días"
              >
                {ventasSemana.map((dia) => (
                  <div className="columna-grafico" key={dia.clave}>
                    <div className="zona-barra">
                      <div
                        className="barra-venta"
                        style={{
                          height: `${dia.total === 0 ? 0 : Math.max(5, (dia.total / maxVentaSemana) * 100)}%`,
                        }}
                        title={`${dia.clave}: ${dinero(dia.total)}`}
                      />
                    </div>
                    <span>{dia.nombre}</span>
                  </div>
                ))}
              </div>
              <p className="nota-grafico">
                Se excluyen las ventas anuladas. Los días sin ventas aparecen sin barra.
              </p>
            </div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Productos más vendidos</h2>
                <p>Ranking por unidades registradas en ventas válidas</p>
              </div>
              <a className="enlace-seccion" href="/ventas">Consultar ventas →</a>
            </div>

            <div className="tabla-contenedor">
              <table className="tabla-dashboard">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>Código</th>
                    <th>Unidades</th>
                    <th>Valor vendido</th>
                  </tr>
                </thead>
                <tbody>
                  {productosMasVendidos.length ? productosMasVendidos.map((producto, indice) => (
                    <tr key={`${producto.codigo}-${producto.nombre}`}>
                      <td className="puesto-ranking">{indice + 1}</td>
                      <td className="celda-producto">{producto.nombre}</td>
                      <td>{producto.codigo}</td>
                      <td>{producto.unidades.toLocaleString('es-CO')}</td>
                      <td className="celda-dinero">{dinero(producto.total)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="tabla-sin-datos">
                      Aún no hay productos registrados en ventas válidas.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Alertas de inventario</h2>
                <p>Productos agotados o con existencias iguales o inferiores al mínimo</p>
              </div>
              <a className="enlace-seccion" href="/productos">Ver productos →</a>
            </div>

            <div className="tabla-contenedor">
              <table className="tabla-dashboard">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Código</th>
                    <th>Stock actual</th>
                    <th>Stock mínimo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.length ? alertas.map((producto) => {
                    const actual = cantidadStock(producto)
                    const agotado = actual <= 0

                    return (
                      <tr key={texto(producto.id, texto(producto.codigo))}>
                        <td className="celda-producto">{texto(producto.nombre, 'Producto sin nombre')}</td>
                        <td>{texto(producto.codigo)}</td>
                        <td>{actual.toLocaleString('es-CO')}</td>
                        <td>{minimoStock(producto).toLocaleString('es-CO')}</td>
                        <td>
                          <span className={`etiqueta-estado ${agotado ? 'estado-agotado' : 'estado-bajo'}`}>
                            {agotado ? 'Agotado' : 'Stock bajo'}
                          </span>
                        </td>
                      </tr>
                    )
                  }) : (
                    <tr><td colSpan={5} className="tabla-sin-datos">
                      No hay alertas de inventario con los datos disponibles.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Actividad reciente</h2>
                <p>Últimas ventas y movimientos de inventario</p>
              </div>
              <a className="enlace-seccion" href="/movimientos">Ver movimientos →</a>
            </div>

            <div className="tabla-contenedor">
              <table className="tabla-dashboard">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Fecha</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {actividad.length ? actividad.map((registro, indice) => (
                    <tr key={`${registro.tipo}-${registro.referencia}-${indice}`}>
                      <td>
                        <span className={`etiqueta-actividad actividad-${registro.tipo.toLowerCase()}`}>
                          {registro.tipo}
                        </span>
                      </td>
                      <td className="celda-producto">{registro.detalle}</td>
                      <td>{fechaLegible(registro.fecha)}</td>
                      <td>{registro.referencia}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="tabla-sin-datos">
                      No hay actividad registrada para mostrar.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Accesos rápidos</h2>
                <p>Atajos a las pantallas disponibles</p>
              </div>
            </div>

            <div className="rejilla-accesos">
              <a className="tarjeta-acceso" href="/productos">
                <span className="acceso-icono">□</span>
                <span>
                  <strong>Consultar productos</strong>
                  <small>Ver el inventario y sus referencias</small>
                </span>
                <span className="acceso-flecha">→</span>
              </a>

              <a className="tarjeta-acceso" href="/ventas">
                <span className="acceso-icono acceso-verde">$</span>
                <span>
                  <strong>Historial de ventas</strong>
                  <small>Consultar las ventas registradas</small>
                </span>
                <span className="acceso-flecha">→</span>
              </a>

              <a className="tarjeta-acceso" href="/movimientos">
                <span className="acceso-icono acceso-naranja">↕</span>
                <span>
                  <strong>Movimientos</strong>
                  <small>Consultar el historial de inventario</small>
                </span>
                <span className="acceso-flecha">→</span>
              </a>
            </div>
          </section>

          <footer className="pie-dashboard">
            Inventario Ferrehaymar · Panel de gestión
          </footer>
        </div>
      </section>
    </main>
  )
}
