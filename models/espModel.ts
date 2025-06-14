import mongoose from 'mongoose';

interface Esp extends mongoose.Document {
  _id: string;
  esp_id: string;
  users: mongoose.Schema.Types.ObjectId[];
  owner: mongoose.Schema.Types.ObjectId;
  name: null | string;
  icon: null | string;
  active: boolean;
  noOfSwitches: number;
  switches: mongoose.Schema.Types.ObjectId[];
}

const espSchema = new mongoose.Schema<Esp>(
  {
    esp_id: {
      type: String,
      trim: true,
      unique: true,
      required: [true, 'Device ID must be given.'],
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    icon: {
      type: String,
      trim: true,
      default: null,
    },
    active: {
      type: Boolean,
      default: false,
    },
    noOfSwitches: {
      type: Number,
      required: [true, 'Number of switches must be given.'],
    },
    switches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Switch',
      },
    ],
  },
  { timestamps: true }
);

const Esp = mongoose.model('Esp', espSchema);

export default Esp;
