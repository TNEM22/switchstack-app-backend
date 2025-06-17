import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import express, { Request, Response, NextFunction } from 'express';

import AppError from './utils/appError';

import v1Router from './api/v1/routes';

import globalErrorHandler from './utils/errorHandler';

const app = express();

app.use(cookieParser());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://switchstack-app-frontend.vercel.app'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'active', message: 'Server is running' });
});

app.use('/api/v1', v1Router);

app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
