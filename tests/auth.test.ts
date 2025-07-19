// Jest test file
import request from 'supertest';
import { app } from '../src/index';

describe('Auth', () => {
  it('register → login → refresh', async () => {
    const email = `test${Date.now()}@mail.com`;

    const reg = await request(app).post('/auth/register').send({ email, password: 'secret123' });
    expect(reg.status).toBe(201);

    const log = await request(app).post('/auth/login').send({ email, password: 'secret123' });
    expect(log.body.accessToken).toBeDefined();

    const ref = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: log.body.refreshToken });
    expect(ref.status).toBe(200);
  });
});
