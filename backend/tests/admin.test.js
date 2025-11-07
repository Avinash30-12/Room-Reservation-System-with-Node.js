const request = require('supertest');
const app = require('../app');
const User = require('../models/user');
const Room = require('../models/room');
const Reservation = require('../models/reservation');
const { generateToken } = require('../utils/jwt');

describe('Admin Management', () => {
  let adminToken, userToken, adminUser, normalUser, testRoom;

  beforeAll(async () => {
    // Create admin user
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });

    // Create normal user
    normalUser = await User.create({
      name: 'Normal User',
      email: 'user@test.com',
      password: 'password123',
      role: 'user'
    });

    // Create test room
    testRoom = await Room.create({
      name: 'Admin Test Room',
      description: 'Room for admin testing',
      capacity: 15,
      pricePerHour: 75,
      location: { building: 'Admin Building', floor: '3rd Floor' },
      createdBy: adminUser._id
    });

    adminToken = generateToken({ id: adminUser._id, role: 'admin' });
    userToken = generateToken({ id: normalUser._id, role: 'user' });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Room.deleteMany({});
    await Reservation.deleteMany({});
  });

  describe('User Management - Admin', () => {
    test('should get all users as admin', async () => {
      const response = await request(app)
        .get('/api/users/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.users).toBeInstanceOf(Array);
    });

    test('should not allow user to access admin routes', async () => {
      const response = await request(app)
        .get('/api/users/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied');
    });

    test('should update user role as admin', async () => {
      const response = await request(app)
        .patch(`/api/users/admin/users/${normalUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('Room Management - Admin', () => {
    test('should create room as admin', async () => {
      const roomData = {
        name: 'New Conference Room',
        description: 'Brand new room',
        capacity: 20,
        pricePerHour: 100,
        location: {
          building: 'Main Building',
          floor: '4th Floor'
        }
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roomData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
    });

    test('should not allow user to create room', async () => {
      // Create a fresh normal user for this test to avoid role changes from earlier tests
      const tempUser = await User.create({
        name: 'Temp User',
        email: `temp-${Date.now()}@test.com`,
        password: 'password123',
        role: 'user'
      });
      const tempToken = generateToken({ id: tempUser._id, role: 'user' });

      const roomData = {
        name: 'User Created Room',
        description: 'Should fail',
        capacity: 5,
        pricePerHour: 25,
        location: {
          building: 'User Building',
          floor: '1st Floor'
        }
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${tempToken}`)
        .send(roomData);

      expect(response.status).toBe(403);
    });
  });
});