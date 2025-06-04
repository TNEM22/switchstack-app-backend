import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/appError';

// Specialized error handlers
const handleCastErrorDB = (err: { path: string; value: string }) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400); // Bad Request
};

const handleDuplicateFieldsDB = (err: { errmsg: string }) => {
  const matches = err.errmsg.match(/(["'])(\\?.)*?\1/);
  const value = matches ? matches[0] : '';

  const message = `Duplicate field value: ${value}. Please use another value!`;
  // const message = `Duplicate field value found. Please use another value!`;
  return new AppError(message, 400); // Bad Request
};

const handleValidationErrorDB = (err: { errors: { message: string }[] }) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Inavlid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again', 401);

// Normal Error Handlers
const sendErrorDev = (
  err: { statusCode: number; status: string; message: string; stack: string },
  res: Response
) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (
  err: {
    isOperational: boolean;
    statusCode: number;
    status: string;
    message: string;
  },
  res: Response
) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // Programming or other unknown error: don't leak error details
  else {
    // 1) Log error
    console.error('ERROR!!!:', err);

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

export default (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.log('Error:', err);

  if (process.env.NODE_ENV === 'development') {
    // sendErrorDev(err, res);
    let error = err;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = err;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
