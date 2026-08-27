import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectMongoDB = async (uri) => {
  const mongoUri = uri || process.env.MONGODB_URI;
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB error: ${err.message}`);
});

export const disconnectMongoDB = async () => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully');
};

export default connectMongoDB;
