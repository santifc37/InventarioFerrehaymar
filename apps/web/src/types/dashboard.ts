
export interface IndicadoresDashboard {
  ventasHoy: number
  cantidadVentasHoy: number
  productosActivos: number
  productosStockBajo: number
  productosAgotados: number
  gananciaEstimada: number
}

export interface VentaPorDia {
  fecha: string
  total: number
}

export interface ProductoMasVendido {
  productoId: string
  nombre: string
  sku: string
  unidadesVendidas: number
  valorVendido: number
}

export interface AlertaInventario {
  productoId: string
  nombre: string
  sku: string
  stockActual: number
  stockMinimo: number
  unidad: string
  estado: 'stock_bajo' | 'agotado'
}

export interface ActividadInventario {
  id: string
  tipo: 'venta' | 'entrada' | 'ajuste'
  descripcion: string
  fechaOperacion: string
  fechaRegistro: string
  referencia: string
}

export interface DashboardData {
  indicadores: IndicadoresDashboard
  ventasPorDia: VentaPorDia[]
  productosMasVendidos: ProductoMasVendido[]
  alertasInventario: AlertaInventario[]
  actividadReciente: ActividadInventario[]
  periodo: {
    desde: string
    hasta: string
  }
}
