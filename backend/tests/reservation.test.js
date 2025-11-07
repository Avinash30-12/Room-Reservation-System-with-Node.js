const request = require('supertest');
const app = require('../app');
const Reservation = require('../models/reservation');
const Room = require('../models/room');
const User = require('../models/user');
const { generateToken } = require('../utils/jwt');

describe('Reservation System', () => {
  let userToken, adminToken, room, user;

  beforeAll(async () => {
    // Create test user
    user = await User.create({
      name: 'Test User',
      email: 'reservationuser@test.com',
      password: 'password123'
    });

    // Create test room
    room = await Room.create({
      name: 'Test Room',
      description: 'Test room for reservations',
      capacity: 10,
      pricePerHour: 50,
      location: { building: 'Test Building', floor: '1st Floor' },
      createdBy: user._id
    });

    userToken = generateToken({ id: user._id, role: 'user' });
    adminToken = generateToken({ id: user._id, role: 'admin' });
  });

  beforeEach(async () => {
    await Reservation.deleteMany({});
  });

  afterAll(async () => {
    await Reservation.deleteMany({});
    await Room.deleteMany({});
    await User.deleteMany({});
  });

  describe('POST /api/reservations', () => {
    test('should create reservation with valid data', async () => {
      // Use dynamic future times so tests remain valid regardless of current date
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000); // +1 day
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      const reservationData = {
        room: room._id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        purpose: 'Team Meeting',
        attendees: 5
      };

      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.reservation.purpose).toBe('Team Meeting');
    });

    test('should prevent double booking', async () => {
      // Create first reservation
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000); // +1 day
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      await Reservation.create({
        user: user._id,
        room: room._id,
        startTime: start,
        endTime: end,
        purpose: 'First Meeting',
        attendees: 5
      });

      // Try to create overlapping reservation (starts 1 hour into existing)
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          room: room._id,
          startTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(), // Overlaps
          endTime: new Date(end.getTime() + 60 * 60 * 1000).toISOString(),
          purpose: 'Second Meeting',
          attendees: 5
        });

      expect(response.status).toBe(409);
      expect(response.body.status).toBe('error');
    });

    test('should validate room capacity', async () => {
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000); // +1 day
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          room: room._id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          purpose: 'Large Meeting',
          attendees: 15 // Exceeds room capacity of 10
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('capacity');
    });
  });

  describe('GET /api/reservations/my-reservations', () => {
    test('should get user reservations', async () => {
      // Create test reservation with dynamic times
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      await Reservation.create({
        user: user._id,
        room: room._id,
        startTime: start,
        endTime: end,
        purpose: 'Test Meeting',
        attendees: 5
      });

      const response = await request(app)
        .get('/api/reservations/my-reservations')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.reservations).toHaveLength(1);
    });
  });
});