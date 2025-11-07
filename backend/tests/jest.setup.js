const { connect, closeDatabase, clearDatabase } = require('./test-utils/db-setup');

// Increase default timeout for potentially slow CI machines
jest.setTimeout(20000);

beforeAll(async () => {
  await connect();
});

// Clear database once before each test file so tests can use beforeAll to seed shared fixtures
beforeAll(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});
