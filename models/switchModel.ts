import mongoose from 'mongoose';

interface Switch extends mongoose.Document {
  _id: string;
  esp: mongoose.Schema.Types.ObjectId;
  name: string;
  state: boolean;
}

const switchSchema = new mongoose.Schema<Switch>({
  esp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Esp',
    required: [true, 'A switch must consist of a Esp.'],
  },
  name: {
    type: String,
    default: 'Switch',
    trim: true,
  },
  state: {
    type: Boolean,
    default: false,
  },
});

const Switch = mongoose.model('Switch', switchSchema);

export default Switch;
