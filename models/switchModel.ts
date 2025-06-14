import mongoose from 'mongoose';

interface Switch extends mongoose.Document {
  _id: string;
  esp: mongoose.Schema.Types.ObjectId;
  name: null | string;
  state: boolean;
  icon: null | string;
}

const switchSchema = new mongoose.Schema<Switch>({
  esp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Esp',
    required: [true, 'A switch must consist of a Esp.'],
  },
  name: {
    type: String,
    trim: true,
    default: null,
  },
  state: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: String,
    trim: true,
    default: null,
  },
});

const Switch = mongoose.model('Switch', switchSchema);

export default Switch;
