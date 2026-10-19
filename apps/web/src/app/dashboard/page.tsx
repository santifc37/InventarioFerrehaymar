
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function obtenerSesion() {
  const cookieStore = await cookies()
  const cookieSesion = cookieStore.get('sesion')?.value

  if (!cookieSesion) return { autenticado: false }

  try {
    const url = process.env.NEXT_PUBLIC_API_URL
    if (!url) return { autenticado: false }

    const res = await fetch(`${url}/auth/me`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
      headers: { cookie: `sesion=${cookieSesion}` },
    })

    return { autenticado: res.ok }
  } catch {
    return { autenticado: false }
  }
}

const secciones = [
  { nombre: 'Dashboard', ruta: '/dashboard', icono: '▦' },
  { nombre: 'Productos', ruta: '/productos', icono: '□' },
  { nombre: 'Categorías', ruta: '/categorias', icono: '▤' },
  { nombre: 'Ventas', ruta: '/ventas', icono: '$' },
  { nombre: 'Movimientos', ruta: '/movimientos', icono: '↕' },
  { nombre: 'Importación', ruta: '/importacion', icono: '⇧' },
]

const indicadores = [
  {
    titulo: 'Ventas de hoy',
    valor: '$ 485.000',
    descripcion: 'Valor total vendido',
    icono: '$',
    tipo: 'azul',
  },
  {
    titulo: 'Ventas registradas',
    valor: '12',
    descripcion: 'Operaciones de hoy',
    icono: '↗',
    tipo: 'verde',
  },
  {
    titulo: 'Productos activos',
    valor: '248',
    descripcion: 'Referencias en inventario',
    icono: '□',
    tipo: 'morado',
  },
  {
    titulo: 'Stock bajo',
    valor: '8',
    descripcion: 'Necesitan reposición',
    icono: '!',
    tipo: 'naranja',
  },
  {
    titulo: 'Agotados',
    valor: '3',
    descripcion: 'Sin existencias disponibles',
    icono: '○',
    tipo: 'rojo',
  },
  {
    titulo: 'Ganancia estimada',
    valor: '$ 126.000',
    descripcion: 'Estimación de las ventas de hoy',
    icono: '↗',
    tipo: 'verde',
  },
]

const ventasGrafico = [
  { dia: 'Lun', valor: 45 },
  { dia: 'Mar', valor: 65 },
  { dia: 'Mié', valor: 38 },
  { dia: 'Jue', valor: 80 },
  { dia: 'Vie', valor: 58 },
  { dia: 'Sáb', valor: 100 },
  { dia: 'Dom', valor: 70 },
]

const productosMasVendidos = [
  { nombre: 'Cemento gris 50 kg', sku: 'CEM-001', unidades: 42, total: '$ 1.680.000' },
  { nombre: 'Tubo PVC 1/2 pulgada', sku: 'PVC-012', unidades: 35, total: '$ 525.000' },
  { nombre: 'Pintura blanca 1 galón', sku: 'PIN-001', unidades: 28, total: '$ 1.120.000' },
  { nombre: 'Tornillo para madera', sku: 'TOR-001', unidades: 25, total: '$ 75.000' },
  { nombre: 'Cinta aislante negra', sku: 'CIN-001', unidades: 22, total: '$ 66.000' },
  { nombre: 'Brocha de 3 pulgadas', sku: 'BRO-003', unidades: 19, total: '$ 190.000' },
  { nombre: 'Pegante para PVC', sku: 'PEG-001', unidades: 17, total: '$ 255.000' },
  { nombre: 'Llave de paso 1/2', sku: 'LLA-012', unidades: 14, total: '$ 210.000' },
  { nombre: 'Disco de corte', sku: 'DIS-001', unidades: 12, total: '$ 96.000' },
  { nombre: 'Guantes de protección', sku: 'GUA-001', unidades: 10, total: '$ 80.000' },
]

const productosPorReponer = [
  { nombre: 'Cinta aislante negra', sku: 'CIN-001', actual: '2 unidades', minimo: '10 unidades', estado: 'Stock bajo' },
  { nombre: 'Tubo PVC 1/2 pulgada', sku: 'PVC-012', actual: '0 unidades', minimo: '8 unidades', estado: 'Agotado' },
  { nombre: 'Brocha de 3 pulgadas', sku: 'BRO-003', actual: '3 unidades', minimo: '6 unidades', estado: 'Stock bajo' },
  { nombre: 'Pegante para PVC', sku: 'PEG-001', actual: '0 unidades', minimo: '5 unidades', estado: 'Agotado' },
]

const actividadReciente = [
  { tipo: 'Venta', detalle: 'Venta de productos', fecha: 'Hoy · 10:35 a. m.', referencia: 'VEN-0012' },
  { tipo: 'Entrada', detalle: 'Entrada de mercancía', fecha: 'Hoy · 9:20 a. m.', referencia: 'ENT-0008' },
  { tipo: 'Ajuste', detalle: 'Ajuste de inventario', fecha: 'Ayer · 4:15 p. m.', referencia: 'AJU-0003' },
  { tipo: 'Venta', detalle: 'Venta de productos', fecha: 'Ayer · 11:40 a. m.', referencia: 'VEN-0011' },
]

export default async function DashboardPage() {
  const sesion = await obtenerSesion()

  if (!sesion.autenticado) redirect('/login')

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
              Resumen general de tu ferretería.
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
          <div className="aviso-demostracion">
            <span>i</span>
            <p>
              <strong>Vista de demostración.</strong> Las cifras, los gráficos
              y los registros de esta pantalla son ejemplos, no datos reales.
            </p>
          </div>

          <section className="bienvenida-panel">
            <div>
              <p className="bienvenida-etiqueta">PANEL DE CONTROL</p>
              <h2>¡Bienvenido a Ferrehaymar!</h2>
              <p>
                Controla tus existencias, revisa las ventas y encuentra
                rápidamente los productos que necesitan atención.
              </p>
            </div>
            <div className="bienvenida-icono" aria-hidden="true">
              ▥
            </div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Resumen general</h2>
                <p>Indicadores principales del negocio</p>
              </div>
              <span className="etiqueta-ejemplo">Datos de ejemplo</span>
            </div>

            <div className="rejilla-indicadores">
              {indicadores.map((indicador) => (
                <article className="tarjeta-indicador" key={indicador.titulo}>
                  <div className="indicador-superior">
                    <span className={`indicador-icono indicador-${indicador.tipo}`}>
                      {indicador.icono}
                    </span>
                  </div>
                  <h3>{indicador.titulo}</h3>
                  <p className="indicador-valor">{indicador.valor}</p>
                  <p className="indicador-descripcion">
                    {indicador.descripcion}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Evolución de las ventas</h2>
                <p>Ejemplo de ventas durante los últimos siete días</p>
              </div>
              <span className="etiqueta-ejemplo">Datos de ejemplo</span>
            </div>

            <div className="panel-grafico">
              <div className="grafico-resumen">
                <span>Total de ejemplo de la semana</span>
                <strong>$ 3.250.000</strong>
              </div>

              <div
                className="grafico-barras"
                role="img"
                aria-label="Gráfico ilustrativo de ventas de lunes a domingo"
              >
                {ventasGrafico.map((venta) => (
                  <div className="columna-grafico" key={venta.dia}>
                    <div className="zona-barra">
                      <div
                        className="barra-venta"
                        style={{ height: `${venta.valor}%` }}
                        title={`${venta.dia}: valor ilustrativo ${venta.valor}`}
                      />
                    </div>
                    <span>{venta.dia}</span>
                  </div>
                ))}
              </div>
              <p className="nota-grafico">
                Gráfico ilustrativo. Los valores reales se calcularán al
                conectar el historial de ventas.
              </p>
            </div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Productos más vendidos</h2>
                <p>Ranking ilustrativo por unidades vendidas</p>
              </div>
              <a className="enlace-seccion" href="/ventas">
                Consultar ventas →
              </a>
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
                  {productosMasVendidos.map((producto, indice) => (
                    <tr key={producto.sku}>
                      <td className="puesto-ranking">{indice + 1}</td>
                      <td className="celda-producto">{producto.nombre}</td>
                      <td>{producto.sku}</td>
                      <td>{producto.unidades}</td>
                      <td className="celda-dinero">{producto.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Alertas de inventario</h2>
                <p>Ejemplo de productos que requieren reposición</p>
              </div>
              <a className="enlace-seccion" href="/productos">
                Ver inventario →
              </a>
            </div>

            <div className="tabla-contenedor">
              <table className="tabla-dashboard">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock actual</th>
                    <th>Stock mínimo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productosPorReponer.map((producto) => (
                    <tr key={producto.sku}>
                      <td>
                        <span className="celda-producto">{producto.nombre}</span>
                        <small className="texto-codigo">{producto.sku}</small>
                      </td>
                      <td>{producto.actual}</td>
                      <td>{producto.minimo}</td>
                      <td>
                        <span
                          className={`etiqueta-estado ${
                            producto.estado === 'Agotado'
                              ? 'estado-agotado'
                              : 'estado-bajo'
                          }`}
                        >
                          {producto.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Actividad reciente</h2>
                <p>Ejemplo de operaciones del inventario</p>
              </div>
              <a className="enlace-seccion" href="/movimientos">
                Ver movimientos →
              </a>
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
                  {actividadReciente.map((actividad) => (
                    <tr key={actividad.referencia}>
                      <td>
                        <span
                          className={`etiqueta-actividad actividad-${actividad.tipo.toLowerCase()}`}
                        >
                          {actividad.tipo}
                        </span>
                      </td>
                      <td className="celda-producto">{actividad.detalle}</td>
                      <td>{actividad.fecha}</td>
                      <td>{actividad.referencia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="seccion-dashboard">
            <div className="encabezado-seccion">
              <div>
                <h2>Accesos rápidos</h2>
                <p>Atajos a las operaciones frecuentes</p>
              </div>
            </div>

            <div className="rejilla-accesos">
              <a className="tarjeta-acceso" href="/productos">
                <span className="acceso-icono">＋</span>
                <span>
                  <strong>Agregar producto</strong>
                  <small>Registrar un artículo nuevo</small>
                </span>
                <span className="acceso-flecha">→</span>
              </a>

              <a className="tarjeta-acceso" href="/ventas">
                <span className="acceso-icono acceso-verde">$</span>
                <span>
                  <strong>Registrar venta</strong>
                  <small>Guardar una venta realizada</small>
                </span>
                <span className="acceso-flecha">→</span>
              </a>

              <a className="tarjeta-acceso" href="/movimientos">
                <span className="acceso-icono acceso-naranja">↥</span>
                <span>
                  <strong>Registrar entrada</strong>
                  <small>Ingresar mercancía al inventario</small>
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
