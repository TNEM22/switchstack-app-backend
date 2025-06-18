import mongoose from 'mongoose';

import User from '../../../models/userModel';
import Esp from '../../../models/espModel';
import Switch from '../../../models/switchModel';

export const hasRegisteredDevices = async (
  userId: string
): Promise<boolean> => {
  try {
    const user = await User.findById(userId).select('registeredDevices');
    if (
      !user ||
      !user.registeredDevices ||
      user.registeredDevices.length === 0
    ) {
      return false; // No registered devices
    }
    return true; // User has registered devices
  } catch (error) {
    // console.error('Error checking registered devices:', error);
    return false; // Assume no devices in case of error
  }
};

type SuccessResponse = {
  status: 'success';
  espId: string;
  switchId: string;
  state: boolean;
  users: mongoose.Schema.Types.ObjectId[];
};

type ErrorResponse = {
  status: 'error';
  espId: string;
  switchId: string;
  state: boolean;
  message: string;
};

type Response = SuccessResponse | ErrorResponse;

export const changeState = async (
  userId: string,
  espId: string,
  switchId: string,
  state: boolean
): Promise<Response> => {
  // Step 1: Get the ESP and check if it exists
  const esp = await Esp.findById(espId).select('esp_id users switches');
  if (!esp) {
    return {
      status: 'error',
      espId,
      switchId,
      state: !state,
      message: 'ESP not found',
    };
  }

  // Step 2: Check if the switch exists
  if (!esp.switches.some((s) => s.toString() === switchId)) {
    return {
      status: 'error',
      espId: esp.esp_id,
      switchId,
      state: !state,
      message: 'Switch not found',
    };
  }

  // Step 3: Check if the user is authorized
  if (!esp.users.some((user) => user.toString() === userId)) {
    return {
      status: 'error',
      espId: esp.esp_id,
      switchId,
      state: !state,
      message: 'User not authorized',
    };
  }

  // Step 4: Update the switch state
  const res = await Switch.findByIdAndUpdate(switchId, { state }).select(
    'state'
  );

  if (res) {
    return {
      status: 'success',
      espId: esp.esp_id,
      switchId,
      state,
      users: esp.users,
    };
  } else {
    return {
      status: 'error',
      espId: esp.esp_id,
      switchId,
      state: !state,
      message: 'Failed to update switch state',
    };
  }
};
