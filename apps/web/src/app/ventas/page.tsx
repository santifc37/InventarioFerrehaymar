"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ItemVenta = {
  id: string;
  producto_id: string;
  cantidad: number | string;
  unidad_id?: string | null;
  cantidad_base?: number | string | null;
  precio_unitario: number | string;
  subtotal: number | string;
  nombre_producto_snapshot?: string | null;
  codigo_producto_snapshot?: string | null;
};

type Venta = {
  id: string;
  fecha_venta: string;
  fecha_registro: string;
  total: number | string;
  observaciones?: string | null;
  estado: string;
  usuario_registro?: string | null;
  motivo_correccion?: string | null;
  corregida_por_venta_id?: string | null;
  venta_items: ItemVenta[];
};

type FiltroFecha = "todas" | "hoy" | "ayer" | "7dias" | "personalizado";

const formatoCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(valor);

const numero = (valor: number | string | null | undefined) =>
  Number(valor ?? 0);

function fechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function fechaDeVenta(fecha: string): string {
  // Las fechas YYYY-MM-DD se interpretan como fechas locales,
  // evitando que aparezcan el día anterior por la zona horaria.
  return fecha.slice(0, 10);
}

function formatoFecha(fecha: string): string {
  if (!fecha) return "Sin fecha";

  const soloFecha = fechaDeVenta(fecha);
  const partes = soloFecha.split("-");

  if (partes.length !== 3) return fecha;

  const [anio, mes, dia] = partes.map(Number);
  const fechaLocalObjeto = new Date(anio, mes - 1, dia);

  if (Number.isNaN(fechaLocalObjeto.getTime())) return fecha;

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fechaLocalObjeto);
}

function formatoHora(fecha: string): string {
  if (!fecha) return "";

  const objeto = new Date(fecha);

  if (Number.isNaN(objeto.getTime())) return "";

  return objeto.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function etiquetaEstado(estado: string): string {
  const normalizado = estado.toLowerCase();

  if (normalizado.includes("anulad")) return "Anulada";
  if (normalizado.includes("correg")) return "Corregida";
  if (normalizado.includes("registr")) return "Registrada";
  if (normalizado.includes("vigent")) return "Vigente";

  return estado || "Sin estado";
}

function obtenerNombreProducto(item: ItemVenta): string {
  return item.nombre_producto_snapshot || `Producto ${item.producto_id}`;
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>("7dias");
  const [fechaDesde, setFechaDesde] = useState(fechaLocal(new Date()));
  const [fechaHasta, setFechaHasta] = useState(fechaLocal(new Date()));
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(
    null
  );

  const cargarVentas = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/ventas", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const resultado = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ||
            `No fue posible consultar las ventas (${respuesta.status}).`
        );
      }

      if (!Array.isArray(resultado.datos)) {
        throw new Error("La API respondió con un formato de ventas inesperado.");
      }

      setVentas(resultado.datos);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al cargar el historial."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarVentas();
  }, [cargarVentas]);

  const ventasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es-CO");
    const hoy = fechaLocal(new Date());
    const ayerDate = new Date();
    ayerDate.setDate(ayerDate.getDate() - 1);
    const ayer = fechaLocal(ayerDate);
    const haceSieteDias = new Date();
    haceSieteDias.setDate(haceSieteDias.getDate() - 6);
    const inicioSieteDias = fechaLocal(haceSieteDias);

    return ventas.filter((venta) => {
      const fecha = fechaDeVenta(venta.fecha_venta || "");
      let coincideFecha = true;

      if (filtroFecha === "hoy") {
        coincideFecha = fecha === hoy;
      } else if (filtroFecha === "ayer") {
        coincideFecha = fecha === ayer;
      } else if (filtroFecha === "7dias") {
        coincideFecha = fecha >= inicioSieteDias && fecha <= hoy;
      } else if (filtroFecha === "personalizado") {
        coincideFecha =
          (!fechaDesde || fecha >= fechaDesde) &&
          (!fechaHasta || fecha <= fechaHasta);
      }

      const coincideBusqueda =
        !termino ||
        venta.id.toLocaleLowerCase("es-CO").includes(termino) ||
        etiquetaEstado(venta.estado).toLocaleLowerCase("es-CO").includes(termino) ||
        (venta.observaciones || "").toLocaleLowerCase("es-CO").includes(termino) ||
        (venta.venta_items || []).some((item) =>
          [
            obtenerNombreProducto(item),
            item.codigo_producto_snapshot || "",
            item.producto_id || "",
          ].some((dato) => dato.toLocaleLowerCase("es-CO").includes(termino))
        );

      return coincideFecha && coincideBusqueda;
    });
  }, [ventas, busqueda, filtroFecha, fechaDesde, fechaHasta]);

  const totalFiltrado = ventasFiltradas.reduce(
    (acumulado, venta) => acumulado + numero(venta.total),
    0
  );

  const unidadesFiltradas = ventasFiltradas.reduce(
    (acumulado, venta) =>
      acumulado +
      (venta.venta_items || []).reduce(
        (subtotal, item) => subtotal + numero(item.cantidad),
        0
      ),
    0
  );

  const ventasAnuladas = ventasFiltradas.filter((venta) =>
    venta.estado.toLowerCase().includes("anulad")
  ).length;

  return (
    <main className="pagina-seccion historial-ventas">
      <header className="encabezado-seccion encabezado-historial-ventas">
        <div>
          <span className="etiqueta-seccion">OPERACIÓN</span>
          <h1>Ventas</h1>
          <p>Consulta el historial y revisa el detalle de cada venta.</p>
        </div>

        <button
          type="button"
          className="boton-recargar-ventas"
          onClick={() => void cargarVentas()}
          disabled={cargando}
        >
          <span aria-hidden="true">↻</span>
          {cargando ? "Actualizando..." : "Actualizar"}
        </button>
      </header>

      <section className="resumen-historial-ventas">
        <article className="tarjeta-historial-ventas">
          <span>Valor de las ventas filtradas</span>
          <strong>{formatoCOP(totalFiltrado)}</strong>
          <small>Suma de los registros mostrados, incluidas las anuladas</small>
        </article>

        <article className="tarjeta-historial-ventas">
          <span>Ventas encontradas</span>
          <strong>{ventasFiltradas.length}</strong>
          <small>Registros que coinciden con los filtros</small>
        </article>

        <article className="tarjeta-historial-ventas">
          <span>Unidades vendidas</span>
          <strong>
            {new Intl.NumberFormat("es-CO", {
              maximumFractionDigits: 3,
            }).format(unidadesFiltradas)}
          </strong>
          <small>Suma de las cantidades de los registros mostrados</small>
        </article>
      </section>

      <section className="panel-historial-ventas">
        <div className="cabecera-historial-ventas">
          <div>
            <h2>Historial de ventas</h2>
            <p>Selecciona una venta para consultar sus productos y valores.</p>
          </div>

          <span className="contador-historial-ventas">
            {ventasFiltradas.length} registros
          </span>
        </div>

        <div className="filtros-historial-ventas">
          <div className="campo-historial-ventas campo-busqueda-historial">
            <label htmlFor="buscar-historial-ventas">Buscar</label>
            <input
              id="buscar-historial-ventas"
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Producto, código, ID u observación"
            />
          </div>

          <div className="campo-historial-ventas">
            <label htmlFor="filtro-fecha-ventas">Período</label>
            <select
              id="filtro-fecha-ventas"
              value={filtroFecha}
              onChange={(evento) =>
                setFiltroFecha(evento.target.value as FiltroFecha)
              }
            >
              <option value="todas">Todas las fechas</option>
              <option value="hoy">Hoy</option>
              <option value="ayer">Ayer</option>
              <option value="7dias">Últimos 7 días</option>
              <option value="personalizado">Fechas personalizadas</option>
            </select>
          </div>

          {filtroFecha === "personalizado" && (
            <>
              <div className="campo-historial-ventas">
                <label htmlFor="fecha-desde-ventas">Desde</label>
                <input
                  id="fecha-desde-ventas"
                  type="date"
                  value={fechaDesde}
                  max={fechaHasta || undefined}
                  onChange={(evento) => setFechaDesde(evento.target.value)}
                />
              </div>

              <div className="campo-historial-ventas">
                <label htmlFor="fecha-hasta-ventas">Hasta</label>
                <input
                  id="fecha-hasta-ventas"
                  type="date"
                  value={fechaHasta}
                  min={fechaDesde || undefined}
                  onChange={(evento) => setFechaHasta(evento.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="error-historial-ventas" role="alert">
            <div>
              <strong>No se pudo cargar el historial</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={() => void cargarVentas()}>
              Reintentar
            </button>
          </div>
        )}

        {cargando && (
          <div className="estado-historial-ventas">
            <span className="spinner-historial-ventas" />
            <p>Cargando ventas desde el servidor...</p>
          </div>
        )}

        {!cargando && !error && (
          <div className="tabla-historial-contenedor">
            <table className="tabla-historial-ventas">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Fecha</th>
                  <th>Productos</th>
                  <th>Unidades</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Detalle</th>
                </tr>
              </thead>

              <tbody>
                {ventasFiltradas.map((venta) => {
                  const items = venta.venta_items || [];
                  const unidades = items.reduce(
                    (suma, item) => suma + numero(item.cantidad),
                    0
                  );

                  const estado = etiquetaEstado(venta.estado);
                  const claseEstado = estado.toLowerCase();

                  return (
                    <tr key={venta.id}>
                      <td>
                        <strong className="id-historial-venta">
                          #{venta.id.slice(0, 8)}
                        </strong>
                        <small className="subtexto-historial-venta">
                          {items.length} {items.length === 1 ? "referencia" : "referencias"}
                        </small>
                      </td>

                      <td>
                        <strong>{formatoFecha(venta.fecha_venta)}</strong>
                        <small className="subtexto-historial-venta">
                          {formatoHora(venta.fecha_registro)}
                        </small>
                      </td>

                      <td>
                        {items.length === 0 ? (
                          <span className="texto-secundario-ventas">
                            Sin productos detallados
                          </span>
                        ) : (
                          <div className="resumen-productos-venta">
                            <strong>{obtenerNombreProducto(items[0])}</strong>
                            {items.length > 1 && (
                              <small>y {items.length - 1} más</small>
                            )}
                          </div>
                        )}
                      </td>

                      <td>
                        {new Intl.NumberFormat("es-CO", {
                          maximumFractionDigits: 3,
                        }).format(unidades)}
                      </td>

                      <td>
                        <strong className="total-historial-venta">
                          {formatoCOP(numero(venta.total))}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`estado-historial-venta estado-${claseEstado}`}
                        >
                          {estado}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="boton-ver-detalle-venta"
                          onClick={() => setVentaSeleccionada(venta)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {ventasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="vacio-historial-ventas">
                      <span aria-hidden="true">⌕</span>
                      <strong>No hay ventas para mostrar</strong>
                      <p>
                        Prueba otro período o cambia el texto de búsqueda.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!cargando && !error && ventasAnuladas > 0 && (
          <p className="nota-historial-ventas">
            Hay {ventasAnuladas} venta(s) anulada(s) en este resultado. Se
            mantienen visibles para conservar el historial.
          </p>
        )}
      </section>

      {ventaSeleccionada && (
        <div
          className="fondo-modal-historial-ventas"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              setVentaSeleccionada(null);
            }
          }}
        >
          <section
            className="modal-historial-ventas"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-detalle-venta"
          >
            <header className="cabecera-modal-historial-ventas">
              <div>
                <span className="etiqueta-seccion">DETALLE</span>
                <h2 id="titulo-detalle-venta">
                  Venta #{ventaSeleccionada.id.slice(0, 8)}
                </h2>
                <p>
                  {formatoFecha(ventaSeleccionada.fecha_venta)}
                  {formatoHora(ventaSeleccionada.fecha_registro)
                    ? ` · ${formatoHora(ventaSeleccionada.fecha_registro)}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                className="cerrar-modal-historial-ventas"
                aria-label="Cerrar detalle"
                onClick={() => setVentaSeleccionada(null)}
              >
                ×
              </button>
            </header>

            <div className="contenido-modal-historial-ventas">
              <div className="datos-detalle-venta">
                <div>
                  <span>Estado</span>
                  <strong>
                    {etiquetaEstado(ventaSeleccionada.estado)}
                  </strong>
                </div>

                <div>
                  <span>Registrada por</span>
                  <strong>
                    {ventaSeleccionada.usuario_registro || "No especificado"}
                  </strong>
                </div>
              </div>

              <h3>Productos vendidos</h3>

              {(ventaSeleccionada.venta_items || []).length === 0 ? (
                <p className="texto-secundario-ventas">
                  Esta venta no contiene productos detallados en la respuesta
                  de la API.
                </p>
              ) : (
                <div className="tabla-detalle-venta-contenedor">
                  <table className="tabla-detalle-venta">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio unitario</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>

                    <tbody>
                      {ventaSeleccionada.venta_items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{obtenerNombreProducto(item)}</strong>
                            {item.codigo_producto_snapshot && (
                              <small>
                                Código: {item.codigo_producto_snapshot}
                              </small>
                            )}
                          </td>
                          <td>
                            {new Intl.NumberFormat("es-CO", {
                              maximumFractionDigits: 3,
                            }).format(numero(item.cantidad))}
                          </td>
                          <td>{formatoCOP(numero(item.precio_unitario))}</td>
                          <td>
                            <strong>{formatoCOP(numero(item.subtotal))}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {ventaSeleccionada.observaciones && (
                <div className="observaciones-detalle-venta">
                  <span>Observaciones</span>
                  <p>{ventaSeleccionada.observaciones}</p>
                </div>
              )}

              {ventaSeleccionada.motivo_correccion && (
                <div className="observaciones-detalle-venta">
                  <span>Motivo de corrección</span>
                  <p>{ventaSeleccionada.motivo_correccion}</p>
                </div>
              )}

              <div className="total-detalle-venta">
                <span>Total de la venta</span>
                <strong>{formatoCOP(numero(ventaSeleccionada.total))}</strong>
              </div>
            </div>

            <footer className="pie-modal-historial-ventas">
              <button
                type="button"
                onClick={() => setVentaSeleccionada(null)}
              >
                Cerrar
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
