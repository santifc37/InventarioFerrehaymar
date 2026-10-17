import { getSupabaseClient } from '../config/supabase';

export class SupabaseRepository {
  private get client() {
    return getSupabaseClient();
  }

  async ping(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('categorias')
        .select('id', { head: true })
        .limit(1);

      if (error) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
