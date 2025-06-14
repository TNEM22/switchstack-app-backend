import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import express, { Request, Response, NextFunction } from 'express';

import AppError from './utils/appError';

import v1Router from './api/v1/routes';

import globalErrorHandler from './utils/errorHandler';

const app = express();

app.use(
  cors({
    origin: [
      'http://localhost:8080',
      'https://switchstack-app-frontend.vercel.app',
    ],
    credentials: true,
  })
);
app.use(cookieParser());
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
