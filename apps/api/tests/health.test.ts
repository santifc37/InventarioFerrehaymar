import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app';

describe('GET /health', () => {
  it('responde 200 con estado ok', async () => {
    const res = await request(crearApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ok');
    expect(res.body.servicio).toBe('ferrehaymar-api');
    expect(Number.isNaN(Date.parse(res.body.fecha))).toBe(false);
  });

  it('no revela la tecnología del servidor', async () => {
    const res = await request(crearApp()).get('/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('responde 404 en JSON si la ruta no existe', async () => {
    const res = await request(crearApp()).get('/no-existe');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Ruta no encontrada');
  });
});
