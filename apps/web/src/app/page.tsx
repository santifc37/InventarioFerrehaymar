// La consulta a la API se hace en el servidor en cada visita (no en el navegador),
// así no hace falta configurar CORS todavía.
export const dynamic = 'force-dynamic';

type EstadoApi = { conectada: boolean; detalle: string };

async function consultarApi(): Promise<EstadoApi> {
  const url = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  try {
    const res = await fetch(`${url}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return { conectada: false, detalle: `La API respondió con el código ${res.status}.` };
    }
    return { conectada: true, detalle: 'La API respondió correctamente.' };
  } catch {
    return { conectada: false, detalle: 'No se pudo conectar con la API. ¿Está en ejecución?' };
  }
}

export default async function Inicio() {
  const api = await consultarApi();

  return (
    <main className="contenedor">
      <h1>Inventario Ferrehaymar</h1>
      <p className="subtitulo">Inventario y ventas de la ferretería</p>

      <section className="estado" aria-live="polite">
        <span className={api.conectada ? 'punto punto-ok' : 'punto punto-error'} aria-hidden="true" />
        <div>
          <strong>{api.conectada ? 'API conectada' : 'API no disponible'}</strong>
          <p>{api.detalle}</p>
        </div>
      </section>
    </main>
  );
}
