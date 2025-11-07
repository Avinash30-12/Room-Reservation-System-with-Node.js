// Delegate setup to the centralized test-utils/db-setup to avoid starting multiple
// in-memory servers when Jest runs setup files and setupFilesAfterEnv.
const { connect, closeDatabase, clearDatabase } = require('./test-utils/db-setup');

module.exports = {
  connect,
  close: closeDatabase,
  clear: clearDatabase
};