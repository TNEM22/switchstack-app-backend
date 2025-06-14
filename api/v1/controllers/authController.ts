import { promisify } from 'util';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

import User from '../../../models/userModel';

import catchAsync from '../../../utils/catchAsync';
import AppError from '../../../utils/appError';

interface RequestWithUser extends Request {
  user?: any;
}

const signToken = (id: string) => {
  const payload = {
    id: id,
  };
  const secretKey = process.env.JWT_SECRET ?? '';

  const jwtExpiry = process.env.JWT_EXPIRES_IN ?? '1d';
  const options: SignOptions = {
    expiresIn: jwtExpiry as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, secretKey, options);
};

const createSendToken = (user: User, statusCode: number, res: Response) => {
  const token = signToken(user._id);

  // Calculate expiration time in milliseconds
  const expiryDays = Number(process.env.JWT_COOKIE_EXPIRES_IN) || 90;
  const expiryMs = expiryDays * 24 * 60 * 60 * 1000;

  const cookieOptions = {
    expires: new Date(Date.now() + expiryMs),
    secure: false,
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('token', token, cookieOptions);

  // Remove password from output
  //   user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    data: {
      // token: token,
      user: {
        name: user.name,
        email: user.email,
      },
    },
  });
};

const signup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // const newUser = await User.create(req.body); // User.save
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    createSendToken(newUser, 201, res);
  }
);

const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body; // req.body.email

    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }
    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email: email }).select('+password'); // Or { email }

    if (!user || !(await user.checkPassword(password))) {
      // Check if the user exists or the password in incorrect
      return next(new AppError('Incorrect email or password', 401)); // Unauthorized - 401
    }

    // 3) If everything ok, send token to client
    createSendToken(user, 200, res);
  }
);

const protect = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    // 1) Getting token and check of it's there
    // let token: string | undefined;
    // console.log(req.headers);
    // if (
    //   req.headers.authorization &&
    //   req.headers.authorization.startsWith('Bearer')
    // ) {
    //   token = req.headers.authorization.split(' ')[1];
    // } else if (req.cookies.token) {
    //   token = req.cookies.token;
    // }
    // console.log('Cookies:', req.cookies);
    const token: string = req.cookies.token;

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Verification Token
    const decoded = (await promisify<string, string | object>(
      (token: string, cb: any) =>
        jwt.verify(token, process.env.JWT_SECRET ?? '1d', cb)
    )(token)) as { id: string };
    // console.log(decoded);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exists.',
          401
        )
      );
    }

    // 4) Check if user changed password after the token was issued
    // if (currentUser.changePasswordAfter(decoded.iat)) {
    //   return next(new AppError('Password changed! Please log in again.', 401));
    // }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  }
);

const restrictTo =
  (...roles: string[]) =>
  (req: RequestWithUser, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };

export default { signup, login, protect, restrictTo };
