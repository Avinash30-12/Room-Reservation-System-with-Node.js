const request = require('supertest');
const app = require('../app');

describe('Error Handling', () => {
  test('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/api/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body.status).toBe('error');
  });

  test('should handle invalid JSON', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .set('Content-Type', 'application/json')
      .send('invalid json');

    expect(response.status).toBe(400);
  });

  test('should handle validation errors', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({
        name: 'A', // Too short
        email: 'invalid-email', // Invalid email
        password: '123' // Too short
      });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('error');
  });
});