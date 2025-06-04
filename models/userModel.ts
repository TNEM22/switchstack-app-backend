import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import validator from 'validator';

// name, email, photo, password, passwordConfirm
interface User extends mongoose.Document {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  password: string;
  passwordConfirm: string | undefined;
  active?: boolean;
  checkPassword: (candidatePassword: string) => Promise<boolean>;
}

const userSchema = new mongoose.Schema<User>(
  {
    name: {
      type: String,
      required: [true, 'A user must have a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'A user must have a email'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    password: {
      type: String,
      required: [true, 'A user must have a password'],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'A user must have a password'],
      minlength: 8,
      validate: {
        // This only works on CREATE and SAVE!!!
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!!',
      },
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 10);
  // Delete passwordConfirm field
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre(/^find/, function (this: mongoose.Query<any, User>, next) {
  // this points to currrent query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.checkPassword = async function (
  this: User,
  candidatePassword: string
) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
