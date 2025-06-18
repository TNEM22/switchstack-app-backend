import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });

import app from './app';
import mongoose from 'mongoose';

import v1WSS from './api/v1/websockets';

const DB: string = (process.env.DATABASE ?? '').replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD ?? ''
);

// Can set maxPoolSize upto 50 only for safe use, max is 100 (!! Don't set it to 100 its teir limit !!)
mongoose
  .connect(DB, { maxPoolSize: 10 })
  .then(() => console.log('DB connected!'));
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected!');
});

const port: number = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}....`);
});

v1WSS(server);
