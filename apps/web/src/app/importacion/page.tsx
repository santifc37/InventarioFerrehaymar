
"use client";

import { useRef, useState } from "react";

type ProductoCSV = {
  nombre: string;
  sku: string;
  codigoBarras: string;
  categoria: string;
  precioCompra: string;
  precioVenta: string;
  unidad: string;
  estado: "valido" | "error" | "duplicado";
  errores: string[];
};

const COLUMNAS = [
  "nombre",
  "sku",
  "codigo_barras",
  "categoria",
  "precio_compra",
  "precio_venta",
  "unidad",
];

function separarCSV(linea: string, separador: string): string[] {
  const resultado: string[] = [];
  let valor = "";
  let entreComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const caracter = linea[i];

    if (caracter === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        valor += '"';
        i++;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (caracter === separador && !entreComillas) {
      resultado.push(valor.trim());
      valor = "";
    } else {
      valor += caracter;
    }
  }

  resultado.push(valor.trim());
  return resultado;
}

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function analizarCSV(contenido: string): {
  productos: ProductoCSV[];
  erroresColumnas: string[];
} {
  const lineas = contenido
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((linea) => linea.trim() !== "");

  if (lineas.length < 2) {
    return {
      productos: [],
      erroresColumnas: ["El archivo no contiene productos para revisar."],
    };
  }

  const separador = [",", ";", "\t"].sort(
    (a, b) =>
      separarCSV(lineas[0], b).length -
      separarCSV(lineas[0], a).length
  )[0];

  const encabezados = separarCSV(lineas[0], separador).map(normalizar);
  const faltantes = COLUMNAS.filter(
    (columna) => !encabezados.includes(columna)
  );

  if (faltantes.length > 0) {
    return {
      productos: [],
      erroresColumnas: [
        `Faltan estas columnas: ${faltantes.join(", ")}.`,
        "Columnas requeridas: nombre, sku, codigo_barras, categoria, precio_compra, precio_venta, unidad.",
      ],
    };
  }

  const indices = Object.fromEntries(
    encabezados.map((encabezado, indice) => [encabezado, indice])
  );

  const productos = lineas.slice(1).map((linea): ProductoCSV => {
    const valores = separarCSV(linea, separador);
    const obtener = (columna: string) =>
      valores[indices[columna]]?.trim() ?? "";

    const producto = {
      nombre: obtener("nombre"),
      sku: obtener("sku"),
      codigoBarras: obtener("codigo_barras"),
      categoria: obtener("categoria"),
      precioCompra: obtener("precio_compra"),
      precioVenta: obtener("precio_venta"),
      unidad: obtener("unidad"),
      estado: "valido" as ProductoCSV["estado"],
      errores: [] as string[],
    };

    if (!producto.nombre) producto.errores.push("Falta el nombre.");
    if (!producto.sku) producto.errores.push("Falta el SKU.");
    if (!producto.categoria) producto.errores.push("Falta la categoría.");
    if (!producto.unidad) producto.errores.push("Falta la unidad.");

    const compra = Number(producto.precioCompra);
    const venta = Number(producto.precioVenta);

    if (
      !producto.precioCompra ||
      !Number.isFinite(compra) ||
      compra < 0
    ) {
      producto.errores.push("Precio de compra inválido.");
    }

    if (
      !producto.precioVenta ||
      !Number.isFinite(venta) ||
      venta < 0
    ) {
      producto.errores.push("Precio de venta inválido.");
    }

    if (producto.errores.length > 0) producto.estado = "error";

    return producto;
  });

  const skus = new Set<string>();
  const codigosBarras = new Set<string>();

  productos.forEach((producto) => {
    const sku = producto.sku.toLowerCase();
    const barras = producto.codigoBarras;

    const skuRepetido = sku !== "" && skus.has(sku);
    const barrasRepetidas =
      barras !== "" && codigosBarras.has(barras);

    if (sku) skus.add(sku);
    if (barras) codigosBarras.add(barras);

    if (
      producto.estado !== "error" &&
      (skuRepetido || barrasRepetidas)
    ) {
      producto.estado = "duplicado";
      producto.errores.push(
        "SKU o código de barras repetido dentro del archivo."
      );
    }
  });

  return { productos, erroresColumnas: [] };
}

export default function ImportacionPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [productos, setProductos] = useState<ProductoCSV[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [erroresColumnas, setErroresColumnas] = useState<string[]>([]);
  const [errorArchivo, setErrorArchivo] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [revisado, setRevisado] = useState(false);

  async function cargarArchivo(archivo?: File) {
    if (!archivo) return;

    setErrorArchivo("");
    setErroresColumnas([]);
    setProductos([]);
    setRevisado(false);

    if (!archivo.name.toLowerCase().endsWith(".csv")) {
      setErrorArchivo("Selecciona un archivo con formato .csv.");
      return;
    }

    try {
      const contenido = await archivo.text();
      const resultado = analizarCSV(contenido);

      setNombreArchivo(archivo.name);
      setProductos(resultado.productos);
      setErroresColumnas(resultado.erroresColumnas);
    } catch {
      setErrorArchivo("No fue posible leer el archivo seleccionado.");
    }
  }

  const validos = productos.filter((p) => p.estado === "valido").length;
  const conErrores = productos.filter((p) => p.estado === "error").length;
  const duplicados = productos.filter((p) => p.estado === "duplicado").length;

  const productosFiltrados = productos.filter((producto) => {
    if (filtro === "todos") return true;
    return producto.estado === filtro;
  });

  function descargarPlantilla() {
    const contenido =
      "nombre,sku,codigo_barras,categoria,precio_compra,precio_venta,unidad\n" +
      'Tornillo 1/4,TOR-001,7700000000011,Fijaciones,100,180,unidad\n' +
      'Cable eléctrico,CAB-001,7700000000012,Electricidad,2500,3500,metro\n';

    const archivo = new Blob(["\uFEFF" + contenido], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "plantilla_productos.csv";
    enlace.click();
    URL.revokeObjectURL(url);
  }

  function limpiar() {
    setProductos([]);
    setNombreArchivo("");
    setErroresColumnas([]);
    setErrorArchivo("");
    setFiltro("todos");
    setRevisado(false);

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="importacion-page">
      <div className="importacion-header">
        <div>
          <p className="importacion-eyebrow">INVENTARIO</p>
          <h1>Importación de datos</h1>
          <p className="importacion-subtitle">
            Carga productos desde un archivo CSV y revisa los datos antes
            de incorporarlos al inventario.
          </p>
        </div>

        <button
          className="importacion-btn-secundario"
          onClick={descargarPlantilla}
        >
          Descargar plantilla CSV
        </button>
      </div>

      <section
        className={`importacion-dropzone ${arrastrando ? "is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          cargarArchivo(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => cargarArchivo(e.target.files?.[0])}
        />

        <div className="importacion-upload-icon">↑</div>
        <h2>Selecciona tu archivo CSV</h2>
        <p>
          Arrastra el archivo aquí o selecciónalo desde tu computador.
        </p>
        <p className="importacion-hint">
          Se revisarán las columnas, los precios y los posibles duplicados.
        </p>

        <button
          className="importacion-btn-principal"
          onClick={() => inputRef.current?.click()}
        >
          Seleccionar archivo
        </button>

        {nombreArchivo && (
          <div className="importacion-archivo">
            <span>Archivo seleccionado</span>
            <strong>{nombreArchivo}</strong>
            <button onClick={limpiar} aria-label="Quitar archivo">
              Quitar
            </button>
          </div>
        )}

        {errorArchivo && (
          <p className="importacion-error-general">{errorArchivo}</p>
        )}
      </section>

      <section className="importacion-requisitos">
        <h3>Formato del archivo</h3>
        <p>
          El CSV debe incluir estas columnas en la primera fila. Puedes
          descargarlas como plantilla para evitar errores.
        </p>
        <div className="importacion-columnas">
          {COLUMNAS.map((columna) => (
            <span key={columna}>{columna}</span>
          ))}
        </div>
        <p className="importacion-nota">
          El archivo puede usar coma, punto y coma o tabulaciones como
          separador. El stock inicial se registrará después mediante un
          movimiento de entrada; no se importa desde esta plantilla.
        </p>
      </section>

      {erroresColumnas.length > 0 && (
        <section className="importacion-alerta">
          <strong>No se pudo validar el archivo</strong>
          {erroresColumnas.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </section>
      )}

      {productos.length > 0 && (
        <>
          <section className="importacion-resumen">
            <div className="importacion-resumen-card">
              <span>Registros encontrados</span>
              <strong>{productos.length}</strong>
            </div>
            <div className="importacion-resumen-card">
              <span>Válidos</span>
              <strong className="texto-valido">{validos}</strong>
            </div>
            <div className="importacion-resumen-card">
              <span>Con errores</span>
              <strong className="texto-error">{conErrores}</strong>
            </div>
            <div className="importacion-resumen-card">
              <span>Posibles duplicados</span>
              <strong className="texto-duplicado">{duplicados}</strong>
            </div>
          </section>

          <section className="importacion-preview">
            <div className="importacion-preview-header">
              <div>
                <h2>Vista previa</h2>
                <p>Revisa los registros antes de continuar.</p>
              </div>

              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                aria-label="Filtrar registros"
              >
                <option value="todos">Todos los registros</option>
                <option value="valido">Válidos</option>
                <option value="error">Con errores</option>
                <option value="duplicado">Posibles duplicados</option>
              </select>
            </div>

            <div className="importacion-tabla-contenedor">
              <table className="importacion-tabla">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Código de barras</th>
                    <th>Categoría</th>
                    <th>Compra</th>
                    <th>Venta</th>
                    <th>Unidad</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((producto, indice) => (
                    <tr key={`${producto.sku}-${indice}`}>
                      <td>
                        <strong>{producto.nombre || "Sin nombre"}</strong>
                        {producto.errores.length > 0 && (
                          <small className="importacion-detalle-error">
                            {producto.errores.join(" ")}
                          </small>
                        )}
                      </td>
                      <td>{producto.sku || "—"}</td>
                      <td>{producto.codigoBarras || "—"}</td>
                      <td>{producto.categoria || "—"}</td>
                      <td>{producto.precioCompra || "—"}</td>
                      <td>{producto.precioVenta || "—"}</td>
                      <td>{producto.unidad || "—"}</td>
                      <td>
                        <span className={`importacion-estado estado-${producto.estado}`}>
                          {producto.estado === "valido"
                            ? "Válido"
                            : producto.estado === "error"
                              ? "Con errores"
                              : "Duplicado"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {productosFiltrados.length === 0 && (
                <p className="importacion-vacio">
                  No hay registros en esta categoría.
                </p>
              )}
            </div>

            <div className="importacion-preview-footer">
              <span>
                {productosFiltrados.length} de {productos.length} registros
                mostrados
              </span>
              <button
                className="importacion-btn-secundario"
                onClick={limpiar}
              >
                Descartar archivo
              </button>
              <button
                className="importacion-btn-principal"
                disabled={validos === 0 || revisado}
                onClick={() => setRevisado(true)}
              >
                {revisado ? "Revisión completada" : "Confirmar revisión"}
              </button>
            </div>

            {revisado && (
              <div className="importacion-alerta">
                <strong>Revisión completada</strong>
                <p>
                  Hay {validos} registros válidos, {conErrores} con errores
                  y {duplicados} posibles duplicados. Esta pantalla es una
                  demostración: todavía no se guardan productos en la base
                  de datos.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
