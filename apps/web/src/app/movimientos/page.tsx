
"use client";

import { useMemo, useState } from "react";

type TipoMovimiento = "Entrada" | "Salida" | "Ajuste";

type Movimiento = {
  id: number;
  fecha: string;
  producto: string;
  sku: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  usuario: string;
};

type Producto = {
  id: number;
  nombre: string;
  sku: string;
  stock: number;
};

const productosIniciales: Producto[] = [
  { id: 1, nombre: "Martillo de uña 16 oz", sku: "HER-001", stock: 24 },
  { id: 2, nombre: "Destornillador estrella", sku: "HER-002", stock: 40 },
  { id: 3, nombre: "Cinta aislante negra", sku: "ELE-001", stock: 75 },
  { id: 4, nombre: "Tornillo drywall 1 pulgada", sku: "TOR-001", stock: 500 },
  { id: 5, nombre: "Brocha 3 pulgadas", sku: "PIN-001", stock: 18 },
];

const movimientosIniciales: Movimiento[] = [
  {
    id: 2005,
    fecha: "2026-10-18",
    producto: "Martillo de uña 16 oz",
    sku: "HER-001",
    tipo: "Entrada",
    cantidad: 10,
    motivo: "Reposición de mercancía",
    usuario: "Administrador",
  },
  {
    id: 2004,
    fecha: "2026-10-18",
    producto: "Cinta aislante negra",
    sku: "ELE-001",
    tipo: "Salida",
    cantidad: 4,
    motivo: "Venta registrada #1003",
    usuario: "Administrador",
  },
  {
    id: 2003,
    fecha: "2026-10-17",
    producto: "Destornillador estrella",
    sku: "HER-002",
    tipo: "Ajuste",
    cantidad: -2,
    motivo: "Diferencia encontrada en conteo físico",
    usuario: "Administrador",
  },
  {
    id: 2002,
    fecha: "2026-10-17",
    producto: "Brocha 3 pulgadas",
    sku: "PIN-001",
    tipo: "Entrada",
    cantidad: 6,
    motivo: "Compra de mercancía",
    usuario: "Administrador",
  },
  {
    id: 2001,
    fecha: "2026-10-16",
    producto: "Tornillo drywall 1 pulgada",
    sku: "TOR-001",
    tipo: "Salida",
    cantidad: 25,
    motivo: "Salida de inventario",
    usuario: "Administrador",
  },
];

const formatoFecha = () =>
  new Date().toLocaleDateString("en-CA");

const formatoCantidad = (cantidad: number) =>
  new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 3,
  }).format(cantidad);

export default function MovimientosPage() {
  const [productos, setProductos] = useState(productosIniciales);
  const [movimientos, setMovimientos] = useState(movimientosIniciales);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroFecha, setFiltroFecha] = useState("Todas");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [advertenciaStock, setAdvertenciaStock] = useState("");

  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productoId, setProductoId] = useState("1");
  const [tipo, setTipo] = useState<TipoMovimiento>("Entrada");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [fecha, setFecha] = useState(formatoFecha());

  const movimientosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyer = [
      ayer.getFullYear(),
      String(ayer.getMonth() + 1).padStart(2, "0"),
      String(ayer.getDate()).padStart(2, "0"),
    ].join("-");

    return movimientos.filter((movimiento) => {
      const coincideBusqueda =
        movimiento.producto.toLowerCase().includes(termino) ||
        movimiento.sku.toLowerCase().includes(termino) ||
        String(movimiento.id).includes(termino) ||
        movimiento.motivo.toLowerCase().includes(termino);

      const coincideTipo =
        filtroTipo === "Todos" || movimiento.tipo === filtroTipo;

      const coincideFecha =
        filtroFecha === "Todas" ||
        (filtroFecha === "Hoy" && movimiento.fecha === formatoFecha()) ||
        (filtroFecha === "Ayer" && movimiento.fecha === fechaAyer);

      return coincideBusqueda && coincideTipo && coincideFecha;
    });
  }, [movimientos, busqueda, filtroTipo, filtroFecha]);

  const entradas = movimientos.filter(
    (movimiento) => movimiento.tipo === "Entrada"
  );

  const salidas = movimientos.filter(
    (movimiento) => movimiento.tipo === "Salida"
  );

  const ajustes = movimientos.filter(
    (movimiento) => movimiento.tipo === "Ajuste"
  );

  const cantidadEntradas = entradas.reduce(
    (total, movimiento) => total + Math.abs(movimiento.cantidad),
    0
  );

  const cantidadSalidas = salidas.reduce(
    (total, movimiento) => total + Math.abs(movimiento.cantidad),
    0
  );

  function limpiarFormulario() {
    setBusquedaProducto("");
    setProductoId(String(productos[0]?.id ?? ""));
    setTipo("Entrada");
    setCantidad("1");
    setMotivo("");
    setObservaciones("");
    setFecha(formatoFecha());
    setAdvertenciaStock("");
  }

  
function registrarMovimiento(forzar = false) {
  const producto = productos.find(
    (item) => item.id === Number(productoId)
  );
  const cantidadNumerica = Number(cantidad);

  if (!producto) {
    setMensaje("Selecciona un producto válido.");
    return;
  }

  if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
    setMensaje("La cantidad debe ser mayor que cero.");
    return;
  }

  if (motivo.trim().length < 5) {
    setMensaje("El motivo debe tener al menos 5 caracteres.");
    return;
  }

  const direccionAjuste = observaciones.startsWith("[AUMENTAR]")
    ? 1
    : -1;

  const cantidadMovimiento =
    tipo === "Entrada"
      ? cantidadNumerica
      : tipo === "Salida"
        ? -cantidadNumerica
        : cantidadNumerica * direccionAjuste;

  const stockNuevo = producto.stock + cantidadMovimiento;

  if (stockNuevo < 0 && !forzar) {
    setAdvertenciaStock(
      `Este movimiento dejaría el stock de "${producto.nombre}" en ${formatoCantidad(stockNuevo)}. Puedes revisar la cantidad o confirmar de todas formas.`
    );
    return;
  }

  const nuevoMovimiento: Movimiento = {
    id:
      movimientos.reduce(
        (mayor, movimiento) => Math.max(mayor, movimiento.id),
        2000
      ) + 1,
    fecha,
    producto: producto.nombre,
    sku: producto.sku,
    tipo,
    cantidad: cantidadMovimiento,
    motivo: observaciones.replace(/^\[(AUMENTAR|DISMINUIR)\]\s*/, "").trim()
      ? `${motivo.trim()} — ${observaciones.replace(/^\[(AUMENTAR|DISMINUIR)\]\s*/, "").trim()}`
      : motivo.trim(),
    usuario: "Administrador",
  };

  setMovimientos((actuales) => [nuevoMovimiento, ...actuales]);

  setProductos((actuales) =>
    actuales.map((item) =>
      item.id === producto.id ? { ...item, stock: stockNuevo } : item
    )
  );

  setMostrarFormulario(false);
  setAdvertenciaStock("");
  setMensaje(
    `Movimiento #${nuevoMovimiento.id} registrado en la demostración. Los cambios son temporales.`
  );
  limpiarFormulario();
}


  return (
    <main className="pagina-seccion movimientos-pagina">
      <div className="encabezado-seccion">
        <div>
          <span className="etiqueta-seccion">INVENTARIO</span>
          <h1>Movimientos de inventario</h1>
          <p>
            Controla las entradas, salidas y ajustes de mercancía.
          </p>
        </div>

        <button
          className="boton-principal"
          onClick={() => {
            limpiarFormulario();
            setMensaje("");
            setMostrarFormulario(true);
          }}
        >
          + Registrar movimiento
        </button>
      </div>

      <div className="aviso-demostracion">
        <strong>Modo de demostración:</strong> los movimientos y las
        existencias solo se mantienen en esta pantalla. Al recargar, vuelven
        los datos de ejemplo.
      </div>

      {mensaje && (
        <div className="mensaje-movimientos" role="status">
          <span>{mensaje}</span>
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}

      <section className="resumen-movimientos">
        <article className="tarjeta-resumen-movimiento">
          <div className="icono-resumen-movimiento entrada">
            <span>↓</span>
          </div>
          <div>
            <span>Entradas registradas</span>
            <strong>{entradas.length}</strong>
            <small>{formatoCantidad(cantidadEntradas)} unidades</small>
          </div>
        </article>

        <article className="tarjeta-resumen-movimiento">
          <div className="icono-resumen-movimiento salida">
            <span>↑</span>
          </div>
          <div>
            <span>Salidas registradas</span>
            <strong>{salidas.length}</strong>
            <small>{formatoCantidad(cantidadSalidas)} unidades</small>
          </div>
        </article>

        <article className="tarjeta-resumen-movimiento">
          <div className="icono-resumen-movimiento ajuste">
            <span>±</span>
          </div>
          <div>
            <span>Ajustes registrados</span>
            <strong>{ajustes.length}</strong>
            <small>Correcciones de existencias</small>
          </div>
        </article>
      </section>

      <section className="panel-movimientos">
        <div className="cabecera-panel-movimientos">
          <div>
            <h2>Historial de movimientos</h2>
            <p>Consulta el registro de operaciones del inventario.</p>
          </div>
          <span className="contador-movimientos">
            {movimientosFiltrados.length} registros
          </span>
        </div>

        <div className="filtros-movimientos">
          <div className="campo-filtro-movimiento">
            <label htmlFor="buscar-movimiento">Buscar</label>
            <input
              id="buscar-movimiento"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Producto, SKU, motivo o número..."
            />
          </div>

          <div className="campo-filtro-movimiento">
            <label htmlFor="tipo-movimiento-filtro">Tipo</label>
            <select
              id="tipo-movimiento-filtro"
              value={filtroTipo}
              onChange={(evento) => setFiltroTipo(evento.target.value)}
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Entrada">Entradas</option>
              <option value="Salida">Salidas</option>
              <option value="Ajuste">Ajustes</option>
            </select>
          </div>

          <div className="campo-filtro-movimiento">
            <label htmlFor="fecha-movimiento-filtro">Fecha</label>
            <select
              id="fecha-movimiento-filtro"
              value={filtroFecha}
              onChange={(evento) => setFiltroFecha(evento.target.value)}
            >
              <option value="Todas">Todas las fechas</option>
              <option value="Hoy">Hoy</option>
              <option value="Ayer">Ayer</option>
            </select>
          </div>
        </div>

        <div className="tabla-movimientos-contenedor">
          <table className="tabla-movimientos">
            <thead>
              <tr>
                <th>Movimiento</th>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {movimientosFiltrados.map((movimiento) => (
                <tr key={movimiento.id}>
                  <td>#{movimiento.id}</td>
                  <td>{movimiento.fecha}</td>
                  <td>
                    <strong>{movimiento.producto}</strong>
                    <small className="detalle-tabla-movimiento">
                      SKU: {movimiento.sku}
                    </small>
                  </td>
                  <td>
                    <span
                      className={`tipo-movimiento tipo-${movimiento.tipo.toLowerCase()}`}
                    >
                      {movimiento.tipo}
                    </span>
                  </td>
                  <td
                    className={
                      movimiento.tipo === "Entrada"
                        ? "cantidad-entrada"
                        : movimiento.tipo === "Salida"
                          ? "cantidad-salida"
                          : "cantidad-ajuste"
                    }
                  >
                    {movimiento.tipo === "Entrada"
                      ? "+"
                      : movimiento.tipo === "Salida"
                        ? "−"
                        : movimiento.cantidad > 0
                          ? "+"
                          : ""}
                    {formatoCantidad(Math.abs(movimiento.cantidad))}
                  </td>
                  <td className="motivo-tabla-movimiento">
                    {movimiento.motivo}
                  </td>
                  <td>{movimiento.usuario}</td>
                </tr>
              ))}

              {movimientosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="tabla-movimientos-vacia">
                    No se encontraron movimientos con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {mostrarFormulario && (
        <div
          className="fondo-modal-movimientos"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              setMostrarFormulario(false);
              setAdvertenciaStock("");
            }
          }}
        >
          <section
            className="modal-movimientos"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-formulario-movimiento"
          >
            <div className="cabecera-modal-movimientos">
              <div>
                <span className="etiqueta-seccion">INVENTARIO</span>
                <h2 id="titulo-formulario-movimiento">
                  Registrar movimiento
                </h2>
                <p>Registra una operación con su motivo correspondiente.</p>
              </div>
              <button
                className="cerrar-modal-movimientos"
                onClick={() => {
                  setMostrarFormulario(false);
                  setAdvertenciaStock("");
                }}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            <div className="formulario-movimientos">
              <div className="campo-formulario-movimiento campo-completo-movimiento">
                <label htmlFor="tipo-movimiento">Tipo de movimiento *</label>
                <select
                  id="tipo-movimiento"
                  value={tipo}
                  onChange={(evento) => {
                    setTipo(evento.target.value as TipoMovimiento);
                    setAdvertenciaStock("");
                  }}
                >
                  <option value="Entrada">Entrada de mercancía</option>
                  <option value="Salida">Salida de inventario</option>
                  <option value="Ajuste">Ajuste de inventario</option>
                </select>
              </div>

              <div className="campo-formulario-movimiento campo-completo-movimiento">
                <label htmlFor="buscar-producto-movimiento">
                  Buscar producto *
                </label>
                <input
                  id="buscar-producto-movimiento"
                  type="text"
                  value={busquedaProducto}
                  autoComplete="off"
                  placeholder="Nombre o SKU del producto..."
                  onChange={(evento) =>
                    setBusquedaProducto(evento.target.value)
                  }
                />

                {busquedaProducto.trim() && (
                  <div className="resultados-busqueda-movimiento">
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
                          type="button"
                          key={producto.id}
                          className="resultado-producto-movimiento"
                          onClick={() => {
                            setProductoId(String(producto.id));
                            setBusquedaProducto("");
                            setAdvertenciaStock("");
                          }}
                        >
                          <span>
                            <strong>{producto.nombre}</strong>
                            <small>
                              SKU: {producto.sku} · Stock: {producto.stock}
                            </small>
                          </span>
                          <strong>{formatoCantidad(producto.stock)} un.</strong>
                        </button>
                      ))}

                    {productos.filter((producto) => {
                      const termino = busquedaProducto.trim().toLowerCase();
                      return (
                        producto.nombre.toLowerCase().includes(termino) ||
                        producto.sku.toLowerCase().includes(termino)
                      );
                    }).length === 0 && (
                      <p className="sin-resultados-movimiento">
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
                    <div className="producto-seleccionado-movimiento">
                      <span>Producto seleccionado</span>
                      <strong>{producto.nombre}</strong>
                      <small>
                        SKU: {producto.sku} · Stock actual:{" "}
                        {formatoCantidad(producto.stock)} unidades
                      </small>
                    </div>
                  );
                })()}
              </div>

              <div className="campo-formulario-movimiento">
                <label htmlFor="cantidad-movimiento">Cantidad *</label>
                <input
                  id="cantidad-movimiento"
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

              <div className="campo-formulario-movimiento">
                <label htmlFor="fecha-movimiento">Fecha *</label>
                <input
                  id="fecha-movimiento"
                  type="date"
                  value={fecha}
                  onChange={(evento) => setFecha(evento.target.value)}
                  required
                />
              </div>

              {tipo === "Ajuste" && (
                <div className="aviso-ajuste-movimiento campo-completo-movimiento">
                  Para este formulario, un ajuste negativo disminuye las
                  existencias y uno positivo las aumenta. Introduce siempre
                  una cantidad positiva; el tipo de ajuste se define abajo.
                </div>
              )}

              {tipo === "Ajuste" && (
                <div className="campo-formulario-movimiento campo-completo-movimiento">
                  <label htmlFor="direccion-ajuste">
                    Dirección del ajuste *
                  </label>
                  <select
                    id="direccion-ajuste"
                    value={observaciones.startsWith("[AUMENTAR]") ? "aumentar" : "disminuir"}
                    onChange={(evento) => {
                      const resto = observaciones.replace(
                        /^\[(AUMENTAR|DISMINUIR)\]\s*/,
                        ""
                      );
                      setObservaciones(
                        evento.target.value === "aumentar"
                          ? `[AUMENTAR] ${resto}`.trim()
                          : `[DISMINUIR] ${resto}`.trim()
                      );
                      setAdvertenciaStock("");
                    }}
                  >
                    <option value="disminuir">Disminuir stock</option>
                    <option value="aumentar">Aumentar stock</option>
                  </select>
                </div>
              )}

              <div className="campo-formulario-movimiento campo-completo-movimiento">
                <label htmlFor="motivo-movimiento">Motivo *</label>
                <input
                  id="motivo-movimiento"
                  value={motivo}
                  onChange={(evento) => setMotivo(evento.target.value)}
                  placeholder="Ej. Compra de mercancía, daño, diferencia de conteo..."
                  required
                />
              </div>

              <div className="campo-formulario-movimiento campo-completo-movimiento">
                <label htmlFor="observaciones-movimiento">
                  Observaciones (opcional)
                </label>
                <textarea
                  id="observaciones-movimiento"
                  value={observaciones.replace(/^\[(AUMENTAR|DISMINUIR)\]\s*/, "")}
                  onChange={(evento) => {
                    const direccion = observaciones.startsWith("[AUMENTAR]")
                      ? "[AUMENTAR] "
                      : observaciones.startsWith("[DISMINUIR]")
                        ? "[DISMINUIR] "
                        : "";
                    setObservaciones(direccion + evento.target.value);
                  }}
                  placeholder="Información adicional sobre el movimiento..."
                  rows={3}
                />
              </div>

              {advertenciaStock && (
                <div className="advertencia-stock-movimiento campo-completo-movimiento">
                  <strong>Stock insuficiente</strong>
                  <p>{advertenciaStock}</p>
                  <div className="acciones-advertencia-movimiento">
                    <button
                      className="boton-secundario-movimiento"
                      onClick={() => setAdvertenciaStock("")}
                    >
                      Revisar cantidad
                    </button>
                    <button
                      className="boton-confirmar-movimiento"
                      onClick={() => registrarMovimiento(true)}
                    >
                      Confirmar de todas formas
                    </button>
                  </div>
                </div>
              )}

              <div className="acciones-formulario-movimiento">
                <button
                  className="boton-secundario-movimiento"
                  onClick={() => {
                    setMostrarFormulario(false);
                    setAdvertenciaStock("");
                  }}
                >
                  Cancelar
                </button>
                {!advertenciaStock && (
                  <button
                    className="boton-confirmar-movimiento"
                    onClick={() => registrarMovimiento()}
                  >
                    Registrar movimiento
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
