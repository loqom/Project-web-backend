const mongoose = require('mongoose');

const connectDB = async () => {
  // Ensure connection listeners are registered once
  if (!mongoose.connection.listenerCount('connected')) {
    mongoose.connection.on('connected', () => {
      console.log('[MongoDB] Connection established successfully');
    });
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error event:', err.message || err);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Connection disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Connection reconnected');
    });
  }

  const options = {
    maxPoolSize: 10,
    minPoolSize: 1,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 10000,
    family: 4, // Force IPv4
    autoIndex: false, // Avoid background index contention causing socket resets
  };

  await mongoose.connect(process.env.MONGO_URI, options);
};

module.exports = connectDB;