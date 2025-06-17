import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });

import app from './app';
import mongoose from 'mongoose';

import v1WSS from './api/v1/websockets';

const DB: string = (process.env.DATABASE ?? '').replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD ?? ''
);

mongoose.connect(DB).then(() => console.log('DB connected!'));
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
