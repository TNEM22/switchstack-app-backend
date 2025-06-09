import { Request, Response, NextFunction } from 'express';

import User from '../../../models/userModel';

import catchAsync from '../../../utils/catchAsync';

interface RequestWithUser extends Request {
  user?: any;
}

const getAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const users = await User.find();

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users,
      },
    });
  }
);

const createUser = (req: Request, res: Response) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined!',
  });
};

const deleteMe = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    // await User.findByIdAndUpdate(req.user.id, { active: false });
    // await User.findByIdAndRemove(req.user.id);
    await User.findByIdAndDelete(req.user.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  }
);

export default {
  getAllUsers,
  createUser,
  deleteMe,
};
