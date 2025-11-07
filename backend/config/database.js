const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

const connectDB = async () => {
  try {
    // If already connected, return existing connection instead of trying to reconnect
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }
    const conn = await mongoose.connect(
      process.env.MONGODB_URI,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log(`🗄️ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    // Throw error instead of exiting so tests can handle rejects
    throw error;
  }
};

const closeDB = async () => {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

module.exports = {
  connectDB,
  closeDB
};