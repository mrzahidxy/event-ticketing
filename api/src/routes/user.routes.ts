import { Role } from '@prisma/client';
import { Router } from 'express';

import { userController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserSchema,
  userIdParamSchema,
} from '../schemas/user.schema';

const router = Router();

router.get(
  '/',
  requireAuth([Role.ADMIN]),
  validateRequest(listUsersQuerySchema, 'query'),
  userController.list
);

router.get(
  '/:id',
  requireAuth(),
  validateRequest(userIdParamSchema, 'params'),
  userController.getById
);

router.post(
  '/',
  requireAuth([Role.ADMIN]),
  validateRequest(createUserSchema),
  userController.create
);

router.patch(
  '/:id',
  requireAuth(),
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(updateUserSchema),
  userController.update
);

router.patch(
  '/:id/role',
  requireAuth([Role.ADMIN]),
  validateRequest(userIdParamSchema, 'params'),
  validateRequest(updateUserRoleSchema),
  userController.updateRole
);

router.delete(
  '/:id',
  requireAuth([Role.ADMIN]),
  validateRequest(userIdParamSchema, 'params'),
  userController.remove
);

export default router;
