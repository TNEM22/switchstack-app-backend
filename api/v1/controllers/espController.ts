import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';

import Esp from '../../../models/espModel';
import Switch from '../../../models/switchModel';

import AppError from '../../../utils/appError';
import catchAsync from '../../../utils/catchAsync';

interface RequestWithUser extends Request {
  user?: any;
}

// Get all esps of user
const getAllEsp = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const esps = await Esp.find({
      users: req.user._id,
    })
      .select('_id esp_id name icon switches')
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
    const { esp_id, name, icon } = req.body;
    // const esp_id = device_id;

    // Check if device is already registered
    let esp = await Esp.findOne({
      esp_id,
    }).select('owner noOfSwitches switches');

    // If the device is not found, return an error
    if (!esp) {
      return next(new AppError(`Device not found with ${esp_id} ID`, 404));
    }

    // console.log(existingEsp?.owner);
    // Check if device is registered to a owner
    if (esp?.owner) {
      return next(new AppError(`Device is already registered`, 409));
    }

    // Register device by the user and update name and icon
    let users: string[] | mongoose.Schema.Types.ObjectId[] = esp?.users ?? [];
    users.push(req.user._id);
    esp = await Esp.findByIdAndUpdate(
      esp._id,
      {
        owner: req.user._id,
        users: users,
        name: name,
        icon: icon,
      },
      { new: true }
    ).populate('switches');

    // Check if the switches are already created for the esp/device
    if (esp && esp.switches.length < esp.noOfSwitches) {
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
      // const room = await Esp.findByIdAndUpdate(
      esp = await Esp.findByIdAndUpdate(
        esp._id,
        { switches: switches },
        { new: true }
      ).populate('switches');
    }

    res.status(201).json({
      status: 'success',
      data: {
        message: 'Device Registered Successfully!',
        room: esp,
      },
    });
  }
);

// Adds new authorized user for Esp/Device either during registration or later

// Update Esp/Device name and icon
const updateEsp = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { espId } = req.params;
    const { name, icon } = req.body;

    // Step 1: Check first if all fields are present
    if (!name || !icon) {
      return next(new AppError('Missing Fields', 400));
    }

    // Step 2: Check if esp/device exists
    const esp = await Esp.findOne({ esp_id: espId });
    if (!esp) {
      return next(new AppError('Device not found!', 404));
      //   return next(new AppError(`No esp found with ${req.params.id} ID`, 404));
    }

    // Step 3: Check if the user is authorized to update the esp/device
    if (
      !esp.users
        .map((user) => user.toString())
        .includes(req.user._id.toString())
    )
      return next(new AppError('You are not authorized!', 401));

    // Step 4: Update the esp/device name and icon
    await Esp.findByIdAndUpdate(esp._id, {
      name: name,
      icon: icon,
    });

    res.status(200).json({
      status: 'success',
      // data: {
      //   esp: esp,
      // },
    });
  }
);

// Update switch name and icon
const updateSwitch = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { espId, switchId } = req.params;
    const { name, icon } = req.body;

    // Check first if all fields are present
    if (!name || !icon) return next(new AppError('Missing Fields', 400));

    // Check for following user if the user has authority for esp
    // Step 1: Get the esp
    const esp = await Esp.findOne({ esp_id: espId });

    // Check if esp/device exists
    if (!esp) return next(new AppError('Device not found!', 404));

    // Step 2: Check user in esp users list if present allow to edit access
    if (
      !esp.users
        .map((user) => user.toString())
        .includes(req.user._id.toString())
    )
      return next(new AppError('You are not authorized!', 401));

    // Step 3: Check if the switch exists in the esp/device
    if (!esp.switches.map((sw) => sw.toString()).includes(switchId.toString()))
      return next(new AppError('Invalid Device Found!', 401));

    // Finally user is authorized and esp/device is present in db then update the name and icon fields
    const aSwitch = await Switch.findByIdAndUpdate(switchId, {
      name: name,
      icon: icon,
    });

    if (!aSwitch) {
      return next(new AppError(`Switch not found!`, 404));
    }
    // if (!aSwitch) {
    //   return next(new AppError(`No switch found with ${switchId} ID`, 404));
    // }

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
