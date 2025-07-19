import { Router } from 'express';
import * as prod from '../controllers/product.controller';
import * as store from '../controllers/store.controller';

const r = Router();

r.get('/products', prod.getProducts);
r.get('/products/:id', prod.getProductById);
r.get('/stores', store.getStores);
r.get('/stores/:slug', store.getStore);
r.get('/stores/:slug/products', store.getStoreProducts);

export default r;
