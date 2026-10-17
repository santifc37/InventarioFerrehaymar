import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function obtenerSesion() {
  const cookieStore = await cookies()
  const cookieSesion = cookieStore.get('sesion')?.value

  if (!cookieSesion) {
    return { autenticado: false }
  }

  try {
    const url = process.env.NEXT_PUBLIC_API_URL
    if (!url) {
      return { autenticado: false }
    }

    const res = await fetch(`${url}/auth/me`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
      headers: { cookie: `sesion=${cookieSesion}` },
    })

    if (res.ok) {
      return { autenticado: true }
    }
    return { autenticado: false }
  } catch {
    return { autenticado: false }
  }
}

export default async function DashboardPage() {
  const sesion = await obtenerSesion()

  if (!sesion.autenticado) {
    redirect('/login')
  }

  return (
    <main className="contenedor">
      <h1 className="titulo">Dashboard</h1>
      <p className="subtitulo">Ruta protegida</p>
    </main>
  )
}
