import morgan from 'morgan';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';

import AppError from './utils/appError';

import espRouter from './routes/espRoutes';
import userRouter from './routes/userRoutes';

import globalErrorHandler from './controllers/errorController';

const app = express();

app.use(
  cors({
    origin: ['http://localhost:8080'],
  })
);
app.use(morgan('dev'));
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'active', message: 'Server is running' });
});

app.use('/api/v1/esp', espRouter);
app.use('/api/v1/users', userRouter);

app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
