import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import validate from '../../core/middleware/validate.js';
import { loginSchema, registerSchema } from './auth.validation.js';
import { authLimiter } from '../../core/middleware/rateLimiter.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';

const router = Router();

// Stricter rate limit for auth endpoints (skip in test)
if (process.env.NODE_ENV !== 'test') {
  router.use(authLimiter);
}

// Public: list seeded user emails for the login page quick-select
router.get('/public-users', asyncWrapper(authController.publicUsers));

router.post('/register', validate(registerSchema), asyncWrapper(authController.register));
router.post('/login', validate(loginSchema), asyncWrapper(authController.login));
router.post('/refresh', asyncWrapper(authController.refresh));
router.post('/logout', authenticate, asyncWrapper(authController.logout));
router.get('/me', authenticate, asyncWrapper(authController.me));

export default router;
