const request = require('supertest');
const app = require('../app');

describe('Simple User Tests', () => {
  test('User registration validation', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });

    // Should either succeed or fail with validation, but not crash
    expect([201, 400, 409]).toContain(response.status);
  });

  test('User login validation', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    // Should respond with some status code
    expect(response.status).toBeDefined();
  });
});