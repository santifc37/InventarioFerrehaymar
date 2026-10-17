'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  const [saliendo, setSaliendo] = useState(false)

  async function cerrarSesion() {
    setSaliendo(true)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch {
      // Ignorar errores al cerrar sesión
    } finally {
      setSaliendo(false)
      router.push('/')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      className="boton-sesion"
      onClick={cerrarSesion}
      disabled={saliendo}
    >
      {saliendo ? 'Saliendo…' : 'Cerrar sesión'}
    </button>
  )
}
