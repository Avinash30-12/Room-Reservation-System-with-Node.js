const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Define the setup functions
async function setupTestDB() {
  try {
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    // Create new server and connect
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
}

async function teardownTestDB() {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error tearing down test database:', error);
    throw error;
  }
}

async function clearTestDB() {
  try {
    const collections = Object.keys(mongoose.connection.collections);
    for (const collectionName of collections) {
      const collection = mongoose.connection.collections[collectionName];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('Error clearing test database:', error);
    throw error;
  }
}

// Connect before all tests
beforeAll(async () => {
  await setupTestDB();
});

// Clear data between tests
afterEach(async () => {
  await clearTestDB();
});

// Disconnect after all tests
afterAll(async () => {
  await teardownTestDB();
});

module.exports = {
  setupTestDB,
  teardownTestDB,
  clearTestDB
};