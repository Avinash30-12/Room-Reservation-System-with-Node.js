const request = require('supertest');
const app = require('../app');
const Room = require('../models/room');
const User = require('../models/user');
const { generateToken } = require('../utils/jwt');

describe('Room Management', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let normalUser;

  beforeAll(async () => {
    // Create test users
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });

    normalUser = await User.create({
      name: 'Normal User',
      email: 'user@test.com',
      password: 'password123',
      role: 'user'
    });

    adminToken = generateToken({ id: adminUser._id, role: 'admin' });
    userToken = generateToken({ id: normalUser._id, role: 'user' });
  });

  beforeEach(async () => {
    await Room.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Room.deleteMany({});
  });

  describe('POST /api/rooms', () => {
    test('should create room as admin', async () => {
      const roomData = {
        name: 'Conference Room A',
        description: 'A large conference room with video conferencing',
        capacity: 20,
        amenities: ['Projector', 'Whiteboard', 'Video Conferencing'],
        pricePerHour: 50,
        location: {
          building: 'Main Building',
          floor: '2nd Floor'
        }
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roomData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.room.name).toBe(roomData.name);
      expect(response.body.data.room.capacity).toBe(roomData.capacity);
    });

    test('should not create room as normal user', async () => {
      const roomData = {
        name: 'Conference Room B',
        description: 'Another room',
        capacity: 10,
        pricePerHour: 30,
        location: {
          building: 'Main Building',
          floor: '1st Floor'
        }
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${userToken}`)
        .send(roomData);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/rooms', () => {
    beforeEach(async () => {
      await Room.create([
        {
          name: 'Small Meeting Room',
          description: 'Small room for 4 people',
          capacity: 4,
          pricePerHour: 25,
          location: { building: 'Main Building', floor: '1st Floor' },
          createdBy: adminUser._id
        },
        {
          name: 'Large Conference Room',
          description: 'Large room for 50 people',
          capacity: 50,
          pricePerHour: 100,
          location: { building: 'Main Building', floor: '3rd Floor' },
          createdBy: adminUser._id
        }
      ]);
    });

    test('should get all rooms without authentication', async () => {
      const response = await request(app).get('/api/rooms');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.rooms).toHaveLength(2);
      expect(response.body.data.pagination).toHaveProperty('totalRecords', 2);
    });

    test('should filter rooms by capacity', async () => {
      // Adjusted to match expected small room capacity
      const response = await request(app)
        .get('/api/rooms?minCapacity=1&maxCapacity=10');

      expect(response.status).toBe(200);
      expect(response.body.data.rooms).toHaveLength(1);
      expect(response.body.data.rooms[0].name).toBe('Small Meeting Room');
    });
  });
});