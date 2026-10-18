import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /health', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      SESSION_SECRET: 'test-session-secret-for-vitest-only',
      AUTH_PASSWORD: 'test-password-for-vitest-only',
      NODE_ENV: 'test',
    };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('responde 200 con estado ok y estado de base de datos', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => mockClient),
    }));

    const { crearApp } = await import('../src/app.js');
    const res = await request(crearApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ok');
    expect(res.body.servicio).toBe('ferrehaymar-api');
    expect(Number.isNaN(Date.parse(res.body.fecha))).toBe(false);
    expect(res.body).toHaveProperty('db');
  });

  it('no revela la tecnología del servidor', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => mockClient),
    }));

    const { crearApp } = await import('../src/app.js');
    const res = await request(crearApp()).get('/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('responde 404 en JSON si la ruta no existe', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => mockClient),
    }));

    const { crearApp } = await import('../src/app.js');
    const res = await request(crearApp()).get('/health');
    const res404 = await request(crearApp()).get('/no-existe');

    expect(res.status).toBe(200);
    expect(res404.status).toBe(404);
    expect(res404.body.error).toBe('Ruta no encontrada');
  });
});
