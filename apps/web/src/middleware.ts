import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RUTAS_PROTEGIDAS = ['/dashboard', '/productos', '/ventas', '/clientes', '/proveedores']

export function middleware(req: NextRequest) {
  const sesion = req.cookies.get('sesion')?.value
  const { pathname } = req.nextUrl

  const esRutaProtegida = RUTAS_PROTEGIDAS.some((ruta) => pathname.startsWith(ruta))

  if (esRutaProtegida && !sesion) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/login') && sesion) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/productos/:path*',
    '/ventas/:path*',
    '/clientes/:path*',
    '/proveedores/:path*',
    '/login',
  ],
}
