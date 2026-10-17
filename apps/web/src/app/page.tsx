import Link from 'next/link'
import { cookies } from 'next/headers'
import { LogoutButton } from './logout-button'

export const dynamic = 'force-dynamic'

type EstadoSesion = {
  autenticado: boolean
}

async function consultarSesion(): Promise<EstadoSesion> {
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
      headers: {
        cookie: `sesion=${cookieSesion}`,
      },
    })

    if (res.ok) {
      return { autenticado: true }
    }
    return { autenticado: false }
  } catch {
    return { autenticado: false }
  }
}

type EstadoApi = {
  ok: boolean
  mensaje?: string
  error?: string
}

async function consultarApi(): Promise<EstadoApi> {
  try {
    const url = process.env.NEXT_PUBLIC_API_URL
    if (!url) {
      return { ok: false, error: 'NEXT_PUBLIC_API_URL no configurada' }
    }

    const res = await fetch(`${url}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })

    if (!res.ok) {
      return { ok: false, error: `Error ${res.status}` }
    }

    const data = (await res.json()) as { ok?: boolean; mensaje?: string }
    return { ok: data.ok ?? true, mensaje: data.mensaje }
  } catch {
    return { ok: false, error: 'No se pudo conectar con la API' }
  }
}

export default async function Inicio() {
  const [estadoApi, estadoSesion] = await Promise.all([
    consultarApi(),
    consultarSesion(),
  ])

  return (
    <main className="contenedor">
      <h1 className="titulo">Sistema de Inventario — Ferretería Haymar</h1>
      <p className="subtitulo">Estado de conexión</p>
      <div className="estado">
        <span className={estadoApi.ok ? 'punto-ok' : 'punto-error'}></span>
        <span>
          {estadoApi.ok
            ? estadoApi.mensaje ?? 'API conectada correctamente'
            : estadoApi.error ?? 'API no disponible'}
        </span>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {estadoSesion.autenticado ? (
          <section className="sesion-activa">
            <span>Sesión activa</span>
            <LogoutButton />
          </section>
        ) : (
          <Link className="boton-sesion" href="/login">
            Ingresar
          </Link>
        )}
      </div>
    </main>
  )
}
