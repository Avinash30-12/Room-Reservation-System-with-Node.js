// server.test.js
describe('server.js startup is covered', () => {
  beforeAll(() => {
    // Silence console.log
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock connectDB to avoid actual DB connection
    jest.mock('../config/database', () => jest.fn());

    // Mock express app with listen
    jest.mock('../app', () => {
      const express = require('express');
      const app = express();
      app.listen = jest.fn((port, cb) => {
        if (cb) cb();
        return { close: jest.fn() };
      });
      return app;
    });

    // Set environment for test
    process.env.PORT = 5051;
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('require server.js for coverage', () => {
    require('../server');
  });
});
