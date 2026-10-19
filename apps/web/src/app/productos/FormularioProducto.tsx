
'use client'

import { useState } from 'react'

interface FormularioProductoProps {
  onCerrar: () => void
}

interface DatosFormulario {
  nombre: string
  sku: string
  codigoBarras: string
  categoria: string
  descripcion: string
  precioCompra: string
  precioVenta: string
  unidad: string
  stockMinimo: string
}

const formularioInicial: DatosFormulario = {
  nombre: '',
  sku: '',
  codigoBarras: '',
  categoria: '',
  descripcion: '',
  precioCompra: '',
  precioVenta: '',
  unidad: 'unidad',
  stockMinimo: '0',
}

export default function FormularioProducto({
  onCerrar,
}: FormularioProductoProps) {
  const [datos, setDatos] = useState<DatosFormulario>(formularioInicial)
  const [error, setError] = useState('')

  function actualizar(
    campo: keyof DatosFormulario,
    valor: string,
  ) {
    setDatos((actuales) => ({ ...actuales, [campo]: valor }))
    setError('')
  }

  function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    if (!datos.nombre.trim() || !datos.sku.trim() || !datos.categoria) {
      setError('Completa el nombre, el SKU y la categoría.')
      return
    }

    const compra = Number(datos.precioCompra)
    const venta = Number(datos.precioVenta)
    const minimo = Number(datos.stockMinimo)

    if (
      datos.precioCompra === '' ||
      datos.precioVenta === '' ||
      !Number.isFinite(compra) ||
      !Number.isFinite(venta) ||
      compra < 0 ||
      venta < 0
    ) {
      setError('Ingresa precios válidos. No pueden ser negativos.')
      return
    }

    if (
      datos.stockMinimo === '' ||
      !Number.isFinite(minimo) ||
      minimo < 0
    ) {
      setError('Ingresa un stock mínimo válido.')
      return
    }

    window.alert(
      'Formulario validado correctamente. El guardado real se implementará al conectar el backend.',
    )
    onCerrar()
  }

  return (
    <div
      className="producto-modal-fondo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar()
      }}
    >
      <section
        className="producto-formulario-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="producto-formulario-titulo"
      >
        <header className="producto-formulario-cabecera">
          <div>
            <span className="productos-migaja">Inventario / Productos</span>
            <h2 id="producto-formulario-titulo">Nuevo producto</h2>
            <p>Completa la información del producto que deseas registrar.</p>
          </div>

          <button
            type="button"
            className="producto-modal-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar formulario"
          >
            ×
          </button>
        </header>

        <form onSubmit={manejarEnvio}>
          <div className="producto-formulario-contenido">
            <section className="producto-formulario-seccion">
              <h3>Información básica</h3>
              <p>Identifica el producto dentro del inventario.</p>

              <div className="producto-formulario-grid">
                <label className="producto-campo producto-campo-completo">
                  Nombre del producto *
                  <input
                    autoFocus
                    value={datos.nombre}
                    onChange={(e) => actualizar('nombre', e.target.value)}
                    placeholder="Ej. Cemento gris de 50 kg"
                    maxLength={150}
                    required
                  />
                </label>

                <label className="producto-campo">
                  SKU / Código interno *
                  <input
                    value={datos.sku}
                    onChange={(e) => actualizar('sku', e.target.value)}
                    placeholder="Ej. CEM-001"
                    maxLength={60}
                    required
                  />
                </label>

                <label className="producto-campo">
                  Código de barras
                  <input
                    value={datos.codigoBarras}
                    onChange={(e) => actualizar('codigoBarras', e.target.value)}
                    placeholder="Código de barras"
                    maxLength={100}
                  />
                </label>

                <label className="producto-campo producto-campo-completo">
                  Descripción
                  <textarea
                    value={datos.descripcion}
                    onChange={(e) => actualizar('descripcion', e.target.value)}
                    placeholder="Características u observaciones del producto"
                    rows={3}
                    maxLength={1000}
                  />
                </label>
              </div>
            </section>

            <section className="producto-formulario-seccion">
              <h3>Clasificación</h3>
              <p>Organiza el producto para facilitar su búsqueda.</p>

              <div className="producto-formulario-grid">
                <label className="producto-campo producto-campo-completo">
                  Categoría *
                  <select
                    value={datos.categoria}
                    onChange={(e) => actualizar('categoria', e.target.value)}
                    required
                  >
                    <option value="">Selecciona una categoría</option>
                    <option value="Construcción">Construcción</option>
                    <option value="Tornillería">Tornillería</option>
                    <option value="Pinturas">Pinturas</option>
                    <option value="Electricidad">Electricidad</option>
                    <option value="Herramientas">Herramientas</option>
                    <option value="Plomería">Plomería</option>
                    <option value="Otra">Otra</option>
                  </select>
                  <small>Estas opciones son temporales; luego vendrán de Categorías.</small>
                </label>
              </div>
            </section>

            <section className="producto-formulario-seccion">
              <h3>Precios y unidad de medida</h3>
              <p>Define los valores y cómo se contabiliza el producto.</p>

              <div className="producto-formulario-grid">
                <label className="producto-campo">
                  Precio de compra (COP) *
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={datos.precioCompra}
                    onChange={(e) => actualizar('precioCompra', e.target.value)}
                    placeholder="0"
                    required
                  />
                </label>

                <label className="producto-campo">
                  Precio de venta (COP) *
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={datos.precioVenta}
                    onChange={(e) => actualizar('precioVenta', e.target.value)}
                    placeholder="0"
                    required
                  />
                </label>

                <label className="producto-campo">
                  Unidad de medida *
                  <select
                    value={datos.unidad}
                    onChange={(e) => actualizar('unidad', e.target.value)}
                    required
                  >
                    <option value="unidad">Unidad</option>
                    <option value="metro">Metro</option>
                    <option value="centimetro">Centímetro</option>
                    <option value="kilogramo">Kilogramo</option>
                    <option value="gramo">Gramo</option>
                    <option value="litro">Litro</option>
                    <option value="mililitro">Mililitro</option>
                    <option value="bulto">Bulto</option>
                    <option value="galon">Galón</option>
                    <option value="rollo">Rollo</option>
                    <option value="caja">Caja</option>
                  </select>
                </label>

                <label className="producto-campo">
                  Stock mínimo *
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={datos.stockMinimo}
                    onChange={(e) => actualizar('stockMinimo', e.target.value)}
                    required
                  />
                  <small>Se usará para alertar cuando haya pocas existencias.</small>
                </label>
              </div>
            </section>

            <div className="producto-nota-stock">
              <span aria-hidden="true">ⓘ</span>
              <p>
                <strong>Existencias iniciales:</strong> no se ingresan aquí.
                Se registrarán mediante una entrada de inventario para conservar
                la trazabilidad de los movimientos.
              </p>
            </div>

            {error && (
              <div className="producto-formulario-error" role="alert">
                {error}
              </div>
            )}
          </div>

          <footer className="producto-formulario-pie">
            <span>Los campos con * son obligatorios.</span>
            <div>
              <button
                type="button"
                className="productos-btn productos-btn-secundario"
                onClick={onCerrar}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="productos-btn productos-btn-primario"
              >
                Validar producto
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  )
}
