import request from 'supertest';
import { app } from '../src/index';

describe('Catalogue', () => {
  it('lists products', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('gets product by id', async () => {
    const { body } = await request(app).get('/products');
    const product = body.items[0];
    const res = await request(app).get(`/products/${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(product.id);
  });
});
