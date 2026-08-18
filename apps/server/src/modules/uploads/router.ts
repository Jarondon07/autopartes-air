import { Router } from 'express';
import { PERMISSIONS } from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { ok } from '../../lib/respond';
import { badRequest } from '../../middleware/error';
import { upload } from '../../lib/upload';

export const uploadsRouter = Router();

uploadsRouter.use(requireAuth, requirePermission(PERMISSIONS.PRODUCTS_CREATE));

/** POST /uploads (multipart, campo "file") → { url } de la imagen guardada. */
uploadsRouter.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) return next(badRequest(err instanceof Error ? err.message : 'Error al subir'));
    if (!req.file) return next(badRequest('No se recibió ningún archivo'));
    ok(res, { url: `/uploads/${req.file.filename}` });
  });
});
