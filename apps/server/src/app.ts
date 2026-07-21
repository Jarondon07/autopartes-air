import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './infra/env';
import { errorHandler } from './middleware/error';
import { authRouter } from './modules/auth/router';
import { brandsRouter } from './modules/brands/router';
import { categoriesRouter } from './modules/categories/router';
import { clientsRouter } from './modules/clients/router';
import { exchangeRatesRouter } from './modules/exchange-rates/router';
import { productsRouter } from './modules/products/router';
import { suppliersRouter } from './modules/suppliers/router';
import { vehiclesRouter } from './modules/vehicles/router';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/v1/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/v1/auth', authRouter);

  // Fase 2 — CRUD Core
  app.use('/api/v1/products', productsRouter);
  app.use('/api/v1/categories', categoriesRouter);
  app.use('/api/v1/brands', brandsRouter);
  app.use('/api/v1/vehicles', vehiclesRouter);
  app.use('/api/v1/clients', clientsRouter);
  app.use('/api/v1/suppliers', suppliersRouter);
  app.use('/api/v1/exchange-rates', exchangeRatesRouter);

  // Próximos módulos (Fase 3+): inventory, purchases, sales, reports, users

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' },
    });
  });

  app.use(errorHandler);
  return app;
}
