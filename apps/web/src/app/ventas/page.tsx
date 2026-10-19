
"use client";

import { useMemo, useState } from "react";

type Producto = {
  id: number;
  nombre: string;
  sku: string;
  precio: number;
  costo: number;
  stock: number;
};

type Venta = {
  id: number;
  fecha: string;
  productoId: number;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number;
  estado: "Registrada" | "Corregida";
};

const productosIniciales: Producto[] = [
  { id: 1, nombre: "Martillo de uña 16 oz", sku: "HER-001", precio: 28000, costo: 18000, stock: 24 },
  { id: 2, nombre: "Destornillador estrella", sku: "HER-002", precio: 9500, costo: 5200, stock: 40 },
  { id: 3, nombre: "Cinta aislante negra", sku: "ELE-001", precio: 4500, costo: 2200, stock: 75 },
  { id: 4, nombre: "Tornillo drywall 1 pulgada", sku: "TOR-001", precio: 180, costo: 90, stock: 500 },
  { id: 5, nombre: "Brocha 3 pulgadas", sku: "PIN-001", precio: 12500, costo: 7000, stock: 18 },
];

const ventasIniciales: Venta[] = [
  { id: 1004, fecha: "2026-10-18", productoId: 1, producto: "Martillo de uña 16 oz", cantidad: 2, precioUnitario: 28000, costoUnitario: 18000, estado: "Registrada" },
  { id: 1003, fecha: "2026-10-18", productoId: 3, producto: "Cinta aislante negra", cantidad: 4, precioUnitario: 4500, costoUnitario: 2200, estado: "Registrada" },
  { id: 1002, fecha: "2026-10-17", productoId: 2, producto: "Destornillador estrella", cantidad: 3, precioUnitario: 9000, costoUnitario: 5200, estado: "Registrada" },
  { id: 1001, fecha: "2026-10-17", productoId: 5, producto: "Brocha 3 pulgadas", cantidad: 1, precioUnitario: 12500, costoUnitario: 7000, estado: "Registrada" },
];

const formatoCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(valor);

const fechaHoy = () => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

export default function VentasPage() {
  const [productos, setProductos] = useState(productosIniciales);
  const [ventas, setVentas] = useState(ventasIniciales);

  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("todas");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [advertenciaStock, setAdvertenciaStock] = useState("");

  const [productoId, setProductoId] = useState("1");
const [busquedaProducto, setBusquedaProducto] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [precioUnitario, setPrecioUnitario] = useState("28000");
  const [fechaVenta, setFechaVenta] = useState(fechaHoy());
  const [motivoCorreccion, setMotivoCorreccion] = useState("");

  const ventasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return ventas.filter((venta) => {
      const coincideBusqueda =
        venta.producto.toLowerCase().includes(termino) ||
        String(venta.id).includes(termino);

      const coincideFecha =
        filtroFecha === "todas" ||
        (filtroFecha === "hoy" && venta.fecha === fechaHoy()) ||
        (filtroFecha === "ayer" &&
          venta.fecha ===
            (() => {
              const ayer = new Date();
              ayer.setDate(ayer.getDate() - 1);
              const anio = ayer.getFullYear();
              const mes = String(ayer.getMonth() + 1).padStart(2, "0");
              const dia = String(ayer.getDate()).padStart(2, "0");
              return `${anio}-${mes}-${dia}`;
            })());

      return coincideBusqueda && coincideFecha;
    });
  }, [ventas, busqueda, filtroFecha]);

  const totalFiltrado = ventasFiltradas.reduce(
    (total, venta) => total + venta.cantidad * venta.precioUnitario,
    0
  );

  const totalHoy = ventas
    .filter((venta) => venta.fecha === fechaHoy())
    .reduce((total, venta) => total + venta.cantidad * venta.precioUnitario, 0);

  const unidadesVendidasHoy = ventas
    .filter((venta) => venta.fecha === fechaHoy())
    .reduce((total, venta) => total + venta.cantidad, 0);

  const gananciaHoy = ventas
    .filter((venta) => venta.fecha === fechaHoy())
    .reduce(
      (total, venta) =>
        total +
        venta.cantidad * (venta.precioUnitario - venta.costoUnitario),
      0
    );

  function limpiarFormulario() {
  setProductoId(String(productos[0]?.id ?? ""));
  setBusquedaProducto("");
  setCantidad("1");
  setPrecioUnitario(String(productos[0]?.precio ?? 0));
  setFechaVenta(fechaHoy());
  setAdvertenciaStock("");
}

  function seleccionarProducto(id: string) {
  setProductoId(id);
  setBusquedaProducto("");
  const producto = productos.find((item) => item.id === Number(id));

  if (producto) {
    setPrecioUnitario(String(producto.precio));
  }

  setAdvertenciaStock("");
}

  function registrarVenta(forzar = false) {
    const producto = productos.find((item) => item.id === Number(productoId));
    const cantidadNumerica = Number(cantidad);
    const precioNumerico = Number(precioUnitario);

    if (!producto) {
      setMensaje("Selecciona un producto válido.");
      return;
    }

    if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
      setMensaje("La cantidad debe ser mayor que cero.");
      return;
    }

    if (!Number.isFinite(precioNumerico) || precioNumerico < 0) {
      setMensaje("El precio aplicado no puede ser negativo.");
      return;
    }

    if (cantidadNumerica > producto.stock && !forzar) {
      setAdvertenciaStock(
        `Solo hay ${producto.stock} unidades disponibles de "${producto.nombre}". Puedes revisar la cantidad o confirmar la venta de todas formas.`
      );
      return;
    }

    const nuevaVenta: Venta = {
      id: ventas.reduce((mayor, venta) => Math.max(mayor, venta.id), 1000) + 1,
      fecha: fechaVenta,
      productoId: producto.id,
      producto: producto.nombre,
      cantidad: cantidadNumerica,
      precioUnitario: precioNumerico,
      costoUnitario: producto.costo,
      estado: "Registrada",
    };

    setVentas((actuales) => [nuevaVenta, ...actuales]);

    setProductos((actuales) =>
      actuales.map((item) =>
        item.id === producto.id
          ? { ...item, stock: item.stock - cantidadNumerica }
          : item
      )
    );

    setMostrarFormulario(false);
    setAdvertenciaStock("");
    setMensaje(
      `Venta #${nuevaVenta.id} registrada en esta demostración. Los cambios son temporales.`
    );
    limpiarFormulario();
  }

  function corregirVenta(venta: Venta) {
    if (venta.estado === "Corregida") {
      setMensaje("Esta venta ya está marcada como corregida.");
      return;
    }

    if (motivoCorreccion.trim().length < 5) {
      setMensaje("Escribe un motivo de corrección de al menos 5 caracteres.");
      return;
    }

    setVentas((actuales) =>
      actuales.map((item) =>
        item.id === venta.id ? { ...item, estado: "Corregida" } : item
      )
    );

    setVentaSeleccionada(null);
    setMotivoCorreccion("");
    setMensaje(
      `La venta #${venta.id} quedó marcada como corregida en esta demostración. No se eliminó el registro. El ajuste real del inventario se implementará al conectar el backend.`
    );
  }

  return (
    <main className="pagina-seccion ventas-pagina">
      <div className="encabezado-seccion">
        <div>
          <span className="etiqueta-seccion">OPERACIÓN</span>
          <h1>Ventas</h1>
          <p>Registra las ventas del día y consulta su historial.</p>
        </div>

        <button
          className="boton-principal"
          onClick={() => {
            limpiarFormulario();
            setVentaSeleccionada(null);
            setMostrarFormulario(true);
            setMensaje("");
          }}
        >
          + Registrar venta
        </button>
      </div>

      <div className="aviso-demostracion">
        <strong>Modo de demostración:</strong> las ventas y los cambios de
        inventario se guardan únicamente en la pantalla. Al recargar, se
        recuperan los datos de ejemplo.
      </div>

      {mensaje && (
        <div className="mensaje-ventas" role="status">
          <span>{mensaje}</span>
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}

      <section className="resumen-ventas">
        <article className="tarjeta-resumen-venta">
          <span>Ventas de hoy</span>
          <strong>{formatoCOP(totalHoy)}</strong>
          <small>Valor registrado para la fecha actual</small>
        </article>

        <article className="tarjeta-resumen-venta">
          <span>Unidades vendidas hoy</span>
          <strong>{unidadesVendidasHoy}</strong>
          <small>Unidades de productos registradas hoy</small>
        </article>

        <article className="tarjeta-resumen-venta">
          <span>Ganancia estimada hoy</span>
          <strong>{formatoCOP(gananciaHoy)}</strong>
          <small>Venta menos costo guardado por unidad</small>
        </article>
      </section>

      <section className="panel-ventas">
        <div className="cabecera-panel-ventas">
          <div>
            <h2>Historial de ventas</h2>
            <p>Consulta los registros y sus valores.</p>
          </div>
          <span className="contador-ventas">
            {ventasFiltradas.length} registros
          </span>
        </div>

        <div className="filtros-ventas">
          <div className="campo-filtro-ventas">
            <label htmlFor="buscar-venta">Buscar venta</label>
            <input
              id="buscar-venta"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Nombre del producto o número de venta"
            />
          </div>

          <div className="campo-filtro-ventas filtro-fecha-ventas">
            <label htmlFor="filtro-fecha-venta">Fecha</label>
            <select
              id="filtro-fecha-venta"
              value={filtroFecha}
              onChange={(evento) => setFiltroFecha(evento.target.value)}
            >
              <option value="todas">Todas las fechas</option>
              <option value="hoy">Hoy</option>
              <option value="ayer">Ayer</option>
            </select>
          </div>
        </div>

        <div className="tabla-ventas-contenedor">
          <table className="tabla-ventas">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Total</th>
                <th>Ganancia estimada</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map((venta) => (
                <tr key={venta.id}>
                  <td>#{venta.id}</td>
                  <td>{venta.fecha}</td>
                  <td>
                    <strong>{venta.producto}</strong>
                    <small className="detalle-tabla-venta">
                      SKU:{" "}
                      {productos.find((p) => p.id === venta.productoId)?.sku ??
                        "—"}
                    </small>
                  </td>
                  <td>{venta.cantidad}</td>
                  <td>{formatoCOP(venta.precioUnitario)}</td>
                  <td className="valor-venta">
                    {formatoCOP(venta.cantidad * venta.precioUnitario)}
                  </td>
                  <td className="ganancia-venta">
                    {formatoCOP(
                      venta.cantidad *
                        (venta.precioUnitario - venta.costoUnitario)
                    )}
                  </td>
                  <td>
                    <span
                      className={`estado-venta ${
                        venta.estado === "Corregida"
                          ? "estado-venta-corregida"
                          : "estado-venta-registrada"
                      }`}
                    >
                      {venta.estado}
                    </span>
                  </td>
                  <td>
                    <button
                      className="boton-tabla-venta"
                      onClick={() => {
                        setVentaSeleccionada(venta);
                        setMotivoCorreccion("");
                        setMensaje("");
                      }}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}

              {ventasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="tabla-ventas-vacia">
                    No se encontraron ventas con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pie-tabla-ventas">
          <span>
            Total del listado filtrado: <strong>{formatoCOP(totalFiltrado)}</strong>
          </span>
        </div>
      </section>

      {mostrarFormulario && (
        <div
          className="fondo-modal-ventas"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              setMostrarFormulario(false);
              setAdvertenciaStock("");
            }
          }}
        >
          <section
            className="modal-ventas"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-formulario-venta"
          >
            <div className="cabecera-modal-ventas">
              <div>
                <span className="etiqueta-seccion">NUEVO REGISTRO</span>
                <h2 id="titulo-formulario-venta">Registrar venta</h2>
                <p>Ingresa los datos de la venta realizada.</p>
              </div>
              <button
                className="cerrar-modal-ventas"
                onClick={() => {
                  setMostrarFormulario(false);
                  setAdvertenciaStock("");
                }}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            <div className="formulario-ventas">
              
<div className="campo-formulario-venta campo-completo-venta">
  <label htmlFor="buscar-producto-venta">Buscar producto *</label>

  <input
    id="buscar-producto-venta"
    type="text"
    value={busquedaProducto}
    placeholder="Escribe el nombre, SKU o código de barras..."
    autoComplete="off"
    onChange={(evento) => {
      setBusquedaProducto(evento.target.value);
      setAdvertenciaStock("");
    }}
  />

  {busquedaProducto.trim() && (
    <div className="resultados-busqueda-venta">
      {productos
        .filter((producto) => {
          const termino = busquedaProducto.trim().toLowerCase();

          return (
            producto.nombre.toLowerCase().includes(termino) ||
            producto.sku.toLowerCase().includes(termino)
          );
        })
        .map((producto) => (
          <button
            key={producto.id}
            type="button"
            className="resultado-producto-venta"
            onClick={() => seleccionarProducto(String(producto.id))}
          >
            <span className="resultado-producto-info">
              <strong>{producto.nombre}</strong>
              <small>
                SKU: {producto.sku} · Stock: {producto.stock}
              </small>
            </span>

            <strong>{formatoCOP(producto.precio)}</strong>
          </button>
        ))}

      {productos.filter((producto) => {
        const termino = busquedaProducto.trim().toLowerCase();

        return (
          producto.nombre.toLowerCase().includes(termino) ||
          producto.sku.toLowerCase().includes(termino)
        );
      }).length === 0 && (
        <p className="sin-resultados-venta">
          No se encontraron productos.
        </p>
      )}
    </div>
  )}

  {(() => {
    const producto = productos.find(
      (item) => item.id === Number(productoId)
    );

    if (!producto) return null;

    return (
      <div className="producto-seleccionado-venta">
        <span>Producto seleccionado</span>
        <strong>{producto.nombre}</strong>
        <small>
          SKU: {producto.sku} · Stock: {producto.stock} unidades
        </small>
      </div>
    );
  })()}
</div>


              {(() => {
                const producto = productos.find(
                  (item) => item.id === Number(productoId)
                );

                if (!producto) return null;

                return (
                  <div className="info-stock-venta">
                    <span>Stock de demostración</span>
                    <strong>{producto.stock} unidades</strong>
                    <span>Precio habitual: {formatoCOP(producto.precio)}</span>
                  </div>
                );
              })()}

              <div className="campo-formulario-venta">
                <label htmlFor="cantidad-venta">Cantidad *</label>
                <input
                  id="cantidad-venta"
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={cantidad}
                  onChange={(evento) => {
                    setCantidad(evento.target.value);
                    setAdvertenciaStock("");
                  }}
                  required
                />
              </div>

              <div className="campo-formulario-venta">
                <label htmlFor="precio-venta">Precio por unidad (COP) *</label>
                <input
                  id="precio-venta"
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioUnitario}
                  onChange={(evento) => setPrecioUnitario(evento.target.value)}
                  required
                />
              </div>

              <div className="campo-formulario-venta campo-completo-venta">
                <label htmlFor="fecha-venta">Fecha de la venta *</label>
                <input
                  id="fecha-venta"
                  type="date"
                  value={fechaVenta}
                  onChange={(evento) => setFechaVenta(evento.target.value)}
                  required
                />
              </div>

              <div className="total-previo-venta">
                <span>Total de la venta</span>
                <strong>
                  {formatoCOP(
                    Math.max(0, Number(cantidad) || 0) *
                      Math.max(0, Number(precioUnitario) || 0)
                  )}
                </strong>
              </div>

              {advertenciaStock && (
                <div className="advertencia-stock-venta" role="alert">
                  <strong>Stock insuficiente</strong>
                  <p>{advertenciaStock}</p>
                  <div className="acciones-advertencia-venta">
                    <button
                      className="boton-secundario-venta"
                      onClick={() => setAdvertenciaStock("")}
                    >
                      Revisar cantidad
                    </button>
                    <button
                      className="boton-confirmar-venta"
                      onClick={() => registrarVenta(true)}
                    >
                      Confirmar de todas formas
                    </button>
                  </div>
                </div>
              )}

              <div className="acciones-formulario-venta">
                <button
                  className="boton-secundario-venta"
                  onClick={() => {
                    setMostrarFormulario(false);
                    setAdvertenciaStock("");
                  }}
                >
                  Cancelar
                </button>
                {!advertenciaStock && (
                  <button
                    className="boton-confirmar-venta"
                    onClick={() => registrarVenta()}
                  >
                    Registrar venta
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {ventaSeleccionada && (
        <div
          className="fondo-modal-ventas"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              setVentaSeleccionada(null);
              setMotivoCorreccion("");
            }
          }}
        >
          <section
            className="modal-ventas modal-detalle-venta"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-detalle-venta"
          >
            <div className="cabecera-modal-ventas">
              <div>
                <span className="etiqueta-seccion">HISTORIAL</span>
                <h2 id="titulo-detalle-venta">
                  Detalle de venta #{ventaSeleccionada.id}
                </h2>
                <p>Consulta los valores guardados para este registro.</p>
              </div>
              <button
                className="cerrar-modal-ventas"
                onClick={() => setVentaSeleccionada(null)}
                aria-label="Cerrar detalle"
              >
                ×
              </button>
            </div>

            <div className="detalle-valores-venta">
              <div>
                <span>Producto</span>
                <strong>{ventaSeleccionada.producto}</strong>
              </div>
              <div>
                <span>Fecha de venta</span>
                <strong>{ventaSeleccionada.fecha}</strong>
              </div>
              <div>
                <span>Cantidad</span>
                <strong>{ventaSeleccionada.cantidad}</strong>
              </div>
              <div>
                <span>Precio unitario aplicado</span>
                <strong>{formatoCOP(ventaSeleccionada.precioUnitario)}</strong>
              </div>
              <div>
                <span>Costo unitario guardado</span>
                <strong>{formatoCOP(ventaSeleccionada.costoUnitario)}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>
                  {formatoCOP(
                    ventaSeleccionada.cantidad *
                      ventaSeleccionada.precioUnitario
                  )}
                </strong>
              </div>
              <div>
                <span>Ganancia estimada</span>
                <strong>
                  {formatoCOP(
                    ventaSeleccionada.cantidad *
                      (ventaSeleccionada.precioUnitario -
                        ventaSeleccionada.costoUnitario)
                  )}
                </strong>
              </div>
              <div>
                <span>Estado</span>
                <strong>{ventaSeleccionada.estado}</strong>
              </div>
            </div>

            {ventaSeleccionada.estado === "Registrada" && (
              <div className="zona-correccion-venta">
                <h3>Marcar venta como corregida</h3>
                <p>
                  El registro no se elimina. Esta acción de demostración no
                  realiza todavía el ajuste compensatorio real del inventario.
                </p>
                <label htmlFor="motivo-correccion">
                  Motivo de la corrección *
                </label>
                <textarea
                  id="motivo-correccion"
                  value={motivoCorreccion}
                  onChange={(evento) =>
                    setMotivoCorreccion(evento.target.value)
                  }
                  placeholder="Explica por qué debe corregirse esta venta..."
                  rows={3}
                />
                <button
                  className="boton-secundario-venta"
                  onClick={() => corregirVenta(ventaSeleccionada)}
                >
                  Confirmar corrección
                </button>
              </div>
            )}

            <div className="acciones-formulario-venta">
              <button
                className="boton-secundario-venta"
                onClick={() => setVentaSeleccionada(null)}
              >
                Cerrar detalle
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
