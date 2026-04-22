import { Role } from '@prisma/client';
import { Router } from 'express';

import { rbacController } from '../controllers/rbac.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/definitions', requireAuth([Role.ADMIN, Role.OWNER]), rbacController.definitions);

export default router;
