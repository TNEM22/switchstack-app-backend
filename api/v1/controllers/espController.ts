import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';

import Esp from '../../../models/espModel';
import Switch from '../../../models/switchModel';

import AppError from '../../../utils/appError';
import catchAsync from '../../../utils/catchAsync';

interface RequestWithUser extends Request {
  user?: any;
}

const getAllEsp = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const esps = await Esp.find({
      users: req.user._id,
    })
      .select('_id esp_id switches')
      .populate('switches');

    res.status(200).json({
      status: 'success',
      results: esps.length,
      data: {
        esps,
      },
    });
  }
);

const getAllSwitch = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    let esp = await Esp.find({ user: req.user._id });
    const switches = esp[0].switches;
    let states: boolean[] = [];

    // states.push(+(await Switch.findById(switches[0])).state);
    // states.push(+(await Switch.findById(switches[1])).state);
    // states.push(+(await Switch.findById(switches[2])).state);
    // states.push(+(await Switch.findById(switches[3])).state);
    for (let i = 0; i < switches.length; i += 1) {
      const aSwitch = await Switch.findById(switches[i]);
      if (aSwitch) {
        states.push(aSwitch.state);
      }
    }

    // switches.forEach(async (sw) => {
    //   let aSwitch = await Switch.findById(sw);
    //   states.push(aSwitch.state);
    // });

    res.status(200).json({
      status: 'success',
      results: switches.length,
      data: {
        switches,
      },
      states: {
        states,
      },
    });
  }
);

const createEsp = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;

    if (!body.esp_id || !body.noOfSwitches)
      return next(
        new AppError('Esp ID and number of switches are required', 400)
      );

    // Check if the esp_id already exists
    const existingEsp = await Esp.findOne({ esp_id: body.esp_id });

    if (existingEsp) {
      return next(new AppError('Device already exists', 400));
    }

    // Create a new device
    const newEsp = await Esp.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        esp: newEsp,
      },
    });
  }
);

// Register the Device for the user
const registerDevice = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const esp_id = req.body.device_id;
    // Check if device is already registered
    const esp = await Esp.findOne({
      esp_id,
    }).select('owner noOfSwitches');

    // If the device is not found, return an error
    if (!esp) {
      return next(new AppError(`Device not found with ${esp_id} ID`, 404));
    }

    // console.log(existingEsp?.owner);
    if (esp?.owner) {
      return next(new AppError(`Device is already registered`, 409));
    }

    // Register device by the user
    let users: string[] | mongoose.Schema.Types.ObjectId[] = esp?.users ?? [];
    users.push(req.user._id);
    await Esp.findByIdAndUpdate(esp._id, {
      owner: req.user._id,
      users: users,
    });

    // Create switches
    let switchesObj: { esp: string }[] = [];

    for (let i = 0; i < esp.noOfSwitches; i += 1) {
      switchesObj.push({ esp: esp._id });
    }

    const newSwitches = await Switch.insertMany(switchesObj);
    let switches: string[] = [];
    newSwitches.forEach((sw) => {
      //   switches.push({ esp: sw._id });
      switches.push(sw._id);
    });

    // Add switches to esp device
    await Esp.findByIdAndUpdate(esp._id, {
      switches: switches,
    });

    res.status(201).json({
      status: 'success',
      data: {
        message: 'Device Registered Successfully!',
      },
    });
  }
);

const updateEsp = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const esp = await Esp.findByIdAndUpdate(req.params.id, req.body);

    if (!esp) {
      return next(new AppError(`No esp found with ${req.params.id} ID`, 404));
    }

    res.status(200).json({
      status: 'success',
      // data: {
      //   esp: esp,
      // },
    });
  }
);

const updateSwitch = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const aSwitch = await Switch.findByIdAndUpdate(req.params.id, req.body);

    if (!aSwitch) {
      return next(
        new AppError(`No switch found with ${req.params.id} ID`, 404)
      );
    }

    res.status(200).json({
      status: 'success',
      // data: {
      //   switch: aSwitch,
      // },
    });
  }
);

export default {
  getAllEsp,
  getAllSwitch,
  createEsp,
  registerDevice,
  updateEsp,
  updateSwitch,
};
