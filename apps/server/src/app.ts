import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './infra/env';
import { uploadsDir } from './lib/upload';
import { errorHandler } from './middleware/error';
import { authRouter } from './modules/auth/router';
import { brandsRouter } from './modules/brands/router';
import { carBrandsRouter } from './modules/car-brands/router';
import { carModelsRouter } from './modules/car-models/router';
import { categoriesRouter } from './modules/categories/router';
import { uploadsRouter } from './modules/uploads/router';
import { clientsRouter } from './modules/clients/router';
import { exchangeRatesRouter } from './modules/exchange-rates/router';
import { inventoryRouter } from './modules/inventory/router';
import { productsRouter } from './modules/products/router';
import { purchasesRouter } from './modules/purchases/router';
import { rolesRouter } from './modules/roles/router';
import { salesRouter } from './modules/sales/router';
import { taxesRouter } from './modules/taxes/router';
import { warehousesRouter } from './modules/warehouses/router';
import { usersRouter } from './modules/users/router';
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
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/purchases', purchasesRouter);
  app.use('/api/v1/sales', salesRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/roles', rolesRouter);
  app.use('/api/v1/uploads', uploadsRouter);
  app.use('/api/v1/car-brands', carBrandsRouter);
  app.use('/api/v1/car-models', carModelsRouter);
  app.use('/api/v1/taxes', taxesRouter);
  app.use('/api/v1/warehouses', warehousesRouter);

  // Archivos subidos (logos, imágenes), servidos de forma estática.
  app.use('/uploads', express.static(uploadsDir));

  // Próximos módulos (Fase 4): reports, dashboard

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' },
    });
  });

  app.use(errorHandler);
  return app;
}
