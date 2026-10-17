import { SupabaseRepository } from '../repositories/supabase.repository';

export class HealthService {
  private readonly supabaseRepository = new SupabaseRepository();

  async check(): Promise<{
    db: 'ok' | 'error';
    mensajeDb?: string;
  }> {
    try {
      const dbOk = await this.supabaseRepository.ping();

      if (!dbOk) {
        return {
          db: 'error',
          mensajeDb: 'No se pudo conectar con la base de datos',
        };
      }

      return { db: 'ok' };
    } catch (error) {
      return {
        db: 'error',
        mensajeDb: error instanceof Error ? error.message : 'Error desconocido al conectar con la base de datos',
      };
    }
  }
}
