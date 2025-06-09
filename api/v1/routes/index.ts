import express from 'express';
import userRouter from './userRoutes';
import espRouter from './espRoutes';

const router = express.Router();

router.use('/users', userRouter);
router.use('/esps', espRouter);

export default router;
