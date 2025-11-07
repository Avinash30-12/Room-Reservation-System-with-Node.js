const mongoose = require('mongoose');
const { connectDB, closeDB } = require('../config/database');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Database Connection', () => {
  test('should connect successfully to the database', async () => {
    const connection = await connectDB();
    expect(connection).toBeDefined();
    expect(mongoose.connection.readyState).toBe(1); // Connected
  });

  test('should handle connection errors', async () => {
    // Disconnect any existing connection so connectDB will attempt to use the env URI
    await mongoose.disconnect();

  // Use an immediately-refused address with a short serverSelectionTimeoutMS
  // so the driver fails fast instead of waiting on long DNS/timeouts.
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/test?serverSelectionTimeoutMS=1000';
    await expect(connectDB()).rejects.toThrow();

    // Restore a valid URI for subsequent tests and reconnect
    process.env.MONGODB_URI = mongoServer.getUri();
    await connectDB();
  });

  test('should close database connection', async () => {
    await connectDB();
    await closeDB();
    expect(mongoose.connection.readyState).toBe(0); // Disconnected
  });

  test('should handle multiple connection attempts', async () => {
    const connection1 = await connectDB();
    const connection2 = await connectDB();
    expect(connection1).toBeDefined();
    expect(connection2).toBeDefined();
    expect(mongoose.connection.readyState).toBe(1);
  });

  test('should reconnect after connection loss', async () => {
    await connectDB();
    await mongoose.disconnect();
    expect(mongoose.connection.readyState).toBe(0);
    
    const reconnection = await connectDB();
    expect(reconnection).toBeDefined();
    expect(mongoose.connection.readyState).toBe(1);
  });
});