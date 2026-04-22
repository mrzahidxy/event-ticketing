import { Router } from 'express';

import authRoutes from './auth.routes';
import bookingRoutes from './booking.routes';
import userRoutes from './user.routes';
import paymentRoutes from './payment.routes';
import rbacRoutes from './rbac.routes';
import organizerRoutes from './organizer.routes';
import analyticsRoutes from './analytics.routes';
import adminRoutes from './admin.routes';
import publicRoutes from './public.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/organizers', organizerRoutes);
router.use('/users', userRoutes);
router.use('/payments', paymentRoutes);
router.use('/rbac', rbacRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/public', publicRoutes);

export default router;
