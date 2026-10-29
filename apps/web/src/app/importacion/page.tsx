
"use client";

import { useRef, useState } from "react";

type EstadoProducto = "valido" | "error" | "duplicado";

type ResultadoImportacion = "guardado" | "fallido";

type ProductoCSV = {
  nombre: string;
  sku: string;
  codigoBarras: string;
  categoria: string;
  precioCompra: string;
  precioVenta: string;
  unidad: string;
  estado: EstadoProducto;
  errores: string[];
  resultadoImportacion?: ResultadoImportacion;
};

type CategoriaAPI = {
  id: string;
  nombre: string;
  activo: boolean;
};

type UnidadAPI = {
  id: string;
  codigo: string;
  nombre: string;
};

type ProductoAPI = {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  nombre: string;
  activo: boolean;
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
    .toLocaleLowerCase("es-CO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function normalizarCodigo(texto: string): string {
  return texto.trim().toLocaleLowerCase("es-CO");
}

function normalizarUnidad(texto: string): string {
  const unidad = normalizar(texto);

  const equivalencias: Record<string, string> = {
    u: "unidad",
    und: "unidad",
    un: "unidad",
    unidad: "unidad",
    unidades: "unidad",

    m: "metro",
    mt: "metro",
    metro: "metro",
    metros: "metro",

    cm: "centimetro",
    centimetro: "centimetro",
    centimetros: "centimetro",

    mm: "milimetro",
    milimetro: "milimetro",
    milimetros: "milimetro",

    kg: "kilogramo",
    kilo: "kilogramo",
    kilos: "kilogramo",
    kilogramo: "kilogramo",
    kilogramos: "kilogramo",

    g: "gramo",
    gr: "gramo",
    gramo: "gramo",
    gramos: "gramo",

    lb: "libra",
    lbs: "libra",
    libra: "libra",
    libras: "libra",

    l: "litro",
    lt: "litro",
    litro: "litro",
    litros: "litro",

    ml: "mililitro",
    mililitro: "mililitro",
    mililitros: "mililitro",

    gal: "galon",
    galon: "galon",
    galones: "galon",

    caja: "caja",
    cajas: "caja",

    paquete: "paquete",
    paquetes: "paquete",

    docena: "docena",
    docenas: "docena",

    par: "par",
    pares: "par",
  };

  return equivalencias[unidad] ?? unidad;
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
      erroresColumnas: [
        "El archivo no contiene productos para revisar.",
      ],
    };
  }

  const separador = [",", ";", "\t"].sort(
    (a, b) =>
      separarCSV(lineas[0], b).length -
      separarCSV(lineas[0], a).length,
  )[0];

  const encabezados = separarCSV(lineas[0], separador).map(normalizar);

  const faltantes = COLUMNAS.filter(
    (columna) => !encabezados.includes(columna),
  );

  if (faltantes.length > 0) {
    return {
      productos: [],
      erroresColumnas: [
        `Faltan estas columnas: ${faltantes.join(", ")}.`,
        `Columnas requeridas: ${COLUMNAS.join(", ")}.`,
      ],
    };
  }

  const indices = Object.fromEntries(
    encabezados.map((encabezado, indice) => [encabezado, indice]),
  );

  const productos = lineas.slice(1).map((linea): ProductoCSV => {
    const valores = separarCSV(linea, separador);

    const obtener = (columna: string) =>
      valores[indices[columna]]?.trim() ?? "";

    const producto: ProductoCSV = {
      nombre: obtener("nombre"),
      sku: obtener("sku"),
      codigoBarras: obtener("codigo_barras"),
      categoria: obtener("categoria"),
      precioCompra: obtener("precio_compra"),
      precioVenta: obtener("precio_venta"),
      unidad: obtener("unidad"),
      estado: "valido",
      errores: [],
    };

    if (!producto.nombre) {
      producto.errores.push("Falta el nombre.");
    }

    if (!producto.sku) {
      producto.errores.push("Falta el SKU.");
    }

    if (!producto.categoria) {
      producto.errores.push("Falta la categoría.");
    }

    if (!producto.unidad) {
      producto.errores.push("Falta la unidad.");
    }

    const compra = Number(producto.precioCompra);
    const venta = Number(producto.precioVenta);

    if (
      producto.precioCompra === "" ||
      !Number.isFinite(compra) ||
      compra < 0
    ) {
      producto.errores.push("Precio de compra inválido.");
    }

    if (
      producto.precioVenta === "" ||
      !Number.isFinite(venta) ||
      venta < 0
    ) {
      producto.errores.push("Precio de venta inválido.");
    }

    if (producto.errores.length > 0) {
      producto.estado = "error";
    }

    return producto;
  });

  const skus = new Set<string>();
  const codigosBarras = new Set<string>();

  productos.forEach((producto) => {
    const sku = normalizarCodigo(producto.sku);
    const barras = normalizarCodigo(producto.codigoBarras);

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
        "SKU o código de barras repetido dentro del archivo.",
      );
    }
  });

  return {
    productos,
    erroresColumnas: [],
  };
}

async function leerRespuesta(respuesta: Response) {
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(
      datos?.error ||
        (respuesta.status === 401
          ? "Tu sesión ha expirado. Inicia sesión nuevamente."
          : `Error del servidor (${respuesta.status}).`),
    );
  }

  return datos;
}

export default function ImportacionPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [productos, setProductos] = useState<ProductoCSV[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [erroresColumnas, setErroresColumnas] = useState<string[]>([]);
  const [errorArchivo, setErrorArchivo] = useState("");
  const [errorImportacion, setErrorImportacion] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [importando, setImportando] = useState(false);
  const [revisado, setRevisado] = useState(false);

  async function cargarArchivo(archivo?: File) {
    if (!archivo) return;

    setErrorArchivo("");
    setErrorImportacion("");
    setErroresColumnas([]);
    setProductos([]);
    setNombreArchivo("");
    setRevisado(false);
    setFiltro("todos");

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
      setErrorArchivo(
        "No fue posible leer el archivo seleccionado.",
      );
    }
  }

  const validos = productos.filter(
    (p) => p.estado === "valido",
  ).length;

  const conErrores = productos.filter(
    (p) => p.estado === "error",
  ).length;

  const duplicados = productos.filter(
    (p) => p.estado === "duplicado",
  ).length;

  const guardados = productos.filter(
    (p) => p.resultadoImportacion === "guardado",
  ).length;

  const fallidos = productos.filter(
    (p) => p.resultadoImportacion === "fallido",
  ).length;

  const productosFiltrados = productos.filter((producto) => {
    if (filtro === "todos") return true;
    return producto.estado === filtro;
  });

  function descargarPlantilla() {
    const contenido =
      "nombre,sku,codigo_barras,categoria,precio_compra,precio_venta,unidad\n" +
      "Tornillo 1/4,TOR-001,7700000000011,Fijaciones,100,180,unidad\n" +
      "Cable eléctrico,CAB-001,7700000000012,Electricidad,2500,3500,metro\n";

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
    if (importando) return;

    setProductos([]);
    setNombreArchivo("");
    setErroresColumnas([]);
    setErrorArchivo("");
    setErrorImportacion("");
    setFiltro("todos");
    setRevisado(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function confirmarImportacion() {
    if (importando || revisado || validos === 0) return;

    setImportando(true);
    setErrorImportacion("");

    try {
      // Consultar los datos existentes en la API.
      const [respuestaCategorias, respuestaUnidades, respuestaProductos] =
        await Promise.all([
          fetch("/api/categorias", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/unidades", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/productos", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
        ]);

      const [datosCategorias, datosUnidades, datosProductos] =
        await Promise.all([
          leerRespuesta(respuestaCategorias),
          leerRespuesta(respuestaUnidades),
          leerRespuesta(respuestaProductos),
        ]);

      const categoriasAPI: CategoriaAPI[] = Array.isArray(datosCategorias)
        ? datosCategorias
        : datosCategorias?.categorias ?? [];

      const unidadesAPI: UnidadAPI[] = Array.isArray(datosUnidades)
        ? datosUnidades
        : datosUnidades?.datos ?? [];

      const productosAPI: ProductoAPI[] = Array.isArray(datosProductos)
        ? datosProductos
        : [];

      // Solo permitir asociar categorías activas.
      const mapaCategorias = new Map<string, CategoriaAPI>();

      categoriasAPI
        .filter((categoria) => categoria.activo)
        .forEach((categoria) => {
          mapaCategorias.set(normalizar(categoria.nombre), categoria);
        });

      // Buscar unidades tanto por código como por nombre.
      const mapaUnidades = new Map<string, UnidadAPI>();

      unidadesAPI.forEach((unidad) => {
        mapaUnidades.set(normalizar(unidad.nombre), unidad);
        mapaUnidades.set(normalizar(unidad.codigo), unidad);

        mapaUnidades.set(normalizarUnidad(unidad.nombre), unidad);
        mapaUnidades.set(normalizarUnidad(unidad.codigo), unidad);
      });

      // Registrar códigos que ya existen para evitar duplicados.
      const codigosExistentes = new Set(
        productosAPI.map((producto) =>
          normalizarCodigo(producto.codigo),
        ),
      );

      const barrasExistentes = new Set(
        productosAPI
          .map((producto) =>
            normalizarCodigo(producto.codigo_barras ?? ""),
          )
          .filter(Boolean),
      );

      // Trabajar sobre una copia para mostrar los resultados al finalizar.
      const actualizados = productos.map((producto) => ({
        ...producto,
        errores: [...producto.errores],
      }));

      for (let i = 0; i < actualizados.length; i++) {
        const producto = actualizados[i];

        // No intentar guardar filas inválidas ni duplicadas del CSV.
        if (producto.estado !== "valido") continue;

        const categoria = mapaCategorias.get(
          normalizar(producto.categoria),
        );

        const unidad =
          mapaUnidades.get(normalizar(producto.unidad)) ??
          mapaUnidades.get(normalizarUnidad(producto.unidad));

        if (!categoria) {
          producto.estado = "error";
          producto.resultadoImportacion = "fallido";
          producto.errores.push(
            `No existe una categoría activa llamada "${producto.categoria}".`,
          );
          continue;
        }

        if (!unidad) {
          producto.estado = "error";
          producto.resultadoImportacion = "fallido";
          producto.errores.push(
            `No se encontró la unidad "${producto.unidad}" en la base de datos.`,
          );
          continue;
        }

        const codigo = normalizarCodigo(producto.sku);
        const barras = normalizarCodigo(producto.codigoBarras);

        if (codigosExistentes.has(codigo)) {
          producto.estado = "duplicado";
          producto.resultadoImportacion = "fallido";
          producto.errores.push(
            "Este SKU ya existe en la base de datos.",
          );
          continue;
        }

        if (barras && barrasExistentes.has(barras)) {
          producto.estado = "duplicado";
          producto.resultadoImportacion = "fallido";
          producto.errores.push(
            "Este código de barras ya existe en la base de datos.",
          );
          continue;
        }

        try {
          const respuesta = await fetch("/api/productos", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              codigo: producto.sku.trim(),
              codigo_barras: producto.codigoBarras.trim() || null,
              nombre: producto.nombre.trim(),
              categoria_id: categoria.id,
              unidad_base_id: unidad.id,
              precio_compra: Number(producto.precioCompra),
              precio_venta: Number(producto.precioVenta),
              stock_minimo: 0,
            }),
          });

          await leerRespuesta(respuesta);

          producto.resultadoImportacion = "guardado";

          // Evitar duplicados entre filas de esta misma importación.
          codigosExistentes.add(codigo);

          if (barras) {
            barrasExistentes.add(barras);
          }
        } catch (error) {
          producto.estado = "error";
          producto.resultadoImportacion = "fallido";
          producto.errores.push(
            error instanceof Error
              ? error.message
              : "No fue posible guardar el producto.",
          );
        }
      }

      setProductos(actualizados);
      setRevisado(true);
    } catch (error) {
      setErrorImportacion(
        error instanceof Error
          ? error.message
          : "No fue posible consultar la API para importar los productos.",
      );
    } finally {
      setImportando(false);
    }
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
          type="button"
          className="importacion-btn-secundario"
          onClick={descargarPlantilla}
        >
          Descargar plantilla CSV
        </button>
      </div>

      <section
        className={`importacion-dropzone ${
          arrastrando ? "is-dragging" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          void cargarArchivo(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          disabled={importando}
          onChange={(e) => void cargarArchivo(e.target.files?.[0])}
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
          type="button"
          className="importacion-btn-principal"
          disabled={importando}
          onClick={() => inputRef.current?.click()}
        >
          Seleccionar archivo
        </button>

        {nombreArchivo && (
          <div className="importacion-archivo">
            <span>Archivo seleccionado</span>
            <strong>{nombreArchivo}</strong>
            <button
              type="button"
              onClick={limpiar}
              disabled={importando}
              aria-label="Quitar archivo"
            >
              Quitar
            </button>
          </div>
        )}

        {errorArchivo && (
          <p role="alert" className="importacion-error-general">
            {errorArchivo}
          </p>
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
          separador. Los nombres de categoría y unidad deben coincidir
          con los existentes en la base de datos. El stock inicial se
          registra después mediante un movimiento de entrada.
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

      {errorImportacion && (
        <section className="importacion-alerta" role="alert">
          <strong>No se pudo completar la importación</strong>
          <p>{errorImportacion}</p>
          <p>
            Los productos que ya se hayan guardado permanecen en la base
            de datos. Puedes volver a intentar la importación; los SKU
            existentes serán detectados como duplicados.
          </p>
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

            {revisado && (
              <>
                <div className="importacion-resumen-card">
                  <span>Productos guardados</span>
                  <strong className="texto-valido">{guardados}</strong>
                </div>

                <div className="importacion-resumen-card">
                  <span>No guardados al importar</span>
                  <strong className="texto-error">{fallidos}</strong>
                </div>
              </>
            )}
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
                      <td>{producto.precioCompra || "0"}</td>
                      <td>{producto.precioVenta || "0"}</td>
                      <td>{producto.unidad || "—"}</td>

                      <td>
                        <span
                          className={`importacion-estado estado-${producto.estado}`}
                        >
                          {producto.resultadoImportacion === "guardado"
                            ? "Guardado"
                            : producto.estado === "valido"
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
                type="button"
                className="importacion-btn-secundario"
                onClick={limpiar}
                disabled={importando}
              >
                Descartar archivo
              </button>

              <button
                type="button"
                className="importacion-btn-principal"
                disabled={validos === 0 || revisado || importando}
                onClick={() => void confirmarImportacion()}
              >
                {importando
                  ? "Importando productos..."
                  : revisado
                    ? "Importación completada"
                    : "Confirmar e importar"}
              </button>
            </div>

            {revisado && (
              <div className="importacion-alerta" role="status">
                <strong>Proceso de importación finalizado</strong>
                <p>
                  Se guardaron {guardados} productos. {fallidos} registros
                  no se pudieron guardar durante el proceso.
                </p>
                <p>
                  Los registros inválidos o duplicados del archivo no se
                  enviaron a la API. Revisa los detalles que aparecen en
                  cada fila.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
