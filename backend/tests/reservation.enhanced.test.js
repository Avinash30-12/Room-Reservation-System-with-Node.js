const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Reservation = require('../models/reservation');
const Room = require('../models/room');
const { setupTestData } = require('./test-utils/test-data');
require('./test-utils/test-setup');

let userToken;
let adminToken;
let testUser;
let testAdmin;
let testRoom;
let testReservation;

beforeEach(async () => {
  const data = await setupTestData();
  ({ testUser, testAdmin, testRoom, userToken, adminToken } = data);

  
  testReservation = await Reservation.create({
    user: testUser._id,
    room: testRoom._id,
    startTime: new Date('2025-12-01T10:00:00Z'),
    endTime: new Date('2025-12-01T12:00:00Z'),
    attendees: 2,
    purpose: 'Team meeting',
  });
});



describe('Reservation Controller - Enhanced Tests', () => {
  describe('Create Reservation', () => {
    test('should create reservation with valid data', async () => {
      const reservationData = {
        room: testRoom._id,
        startTime: '2025-12-02T10:00:00Z',
        endTime: '2025-12-02T12:00:00Z',
        attendees: 2,
        purpose: 'Team meeting'
      };
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData);
      expect(response.status).toBe(201);
      expect(response.body.data.reservation).toHaveProperty('_id');
    });

    test('should fail with invalid room id', async () => {
      const reservationData = {
        room: new mongoose.Types.ObjectId(),
        startTime: '2025-12-02T10:00:00Z',
        endTime: '2025-12-02T12:00:00Z',
        attendees: 2,
        purpose: 'Team meeting'
      };
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData);
      expect(response.status).toBe(404);
    });

    test('should fail with overlapping reservation', async () => {
      const reservationData = {
        room: testRoom._id,
        startTime: '2025-12-01T11:00:00Z',
        endTime: '2025-12-01T13:00:00Z',
        attendees: 2,
        purpose: 'Team meeting'
      };
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData);
      expect(response.status).toBe(409);
    });

    test('should fail with invalid date format', async () => {
      const reservationData = {
        room: testRoom._id,
        startTime: 'invalid-date',
        endTime: '2025-12-02T12:00:00Z',
        attendees: 2,
        purpose: 'Team meeting'
      };
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData);
      expect(response.status).toBe(400);
    });
  });

  describe('Update Reservation', () => {
    test('should cancel own reservation (user)', async () => {
      const response = await request(app)
        .patch(`/api/reservations/${testReservation._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.reservation.status).toBe('cancelled');
    });

    test("admin should cancel another user's reservation", async () => {
      const response = await request(app)
        .patch(`/api/reservations/${testReservation._id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.reservation.status).toBe('cancelled');
    });
  });

  describe('Delete Reservation', () => {
    test('should cancel own reservation (via user cancel route)', async () => {
      const response = await request(app)
        .patch(`/api/reservations/${testReservation._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(response.status).toBe(200);
      const updated = await Reservation.findById(testReservation._id);
      expect(updated.status).toBe('cancelled');
    });

    test('admin should cancel any reservation (admin route)', async () => {
      const response = await request(app)
        .patch(`/api/reservations/admin/${testReservation._id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
    });

    test('should fail with non-existent reservation id', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .patch(`/api/reservations/${nonExistentId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);
      expect([404, 400]).toContain(response.status);
    });
  });

  describe('Get Reservations', () => {
    test('user should get own reservations', async () => {
      const response = await request(app)
        .get('/api/reservations/my-reservations')
        .set('Authorization', `Bearer ${userToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.reservations).toBeInstanceOf(Array);
      expect(response.body.data.reservations.length).toBeGreaterThan(0);
    });

    test('admin should get all reservations', async () => {
      const response = await request(app)
        .get('/api/reservations/admin/all')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.reservations).toBeInstanceOf(Array);
    });

    test('should get reservation by id', async () => {
      const response = await request(app)
        .get(`/api/reservations/${testReservation._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data.reservation._id).toBe(testReservation._id.toString());
    });
  });

  // ----------- EXTRA COVERAGE/ERROR BRANCH TESTS -----------
  describe('Controller Error/Edge Cases', () => {
    afterEach(() => {
      jest.restoreAllMocks && jest.restoreAllMocks();
    });

    test('should handle server error on getReservationById', async () => {
      jest.spyOn(Reservation, 'findById').mockImplementationOnce(() => { throw new Error('DB fail'); });
      const response = await request(app)
        .get(`/api/reservations/${testReservation._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
    });

    test('should handle server error on createReservation', async () => {
      jest.spyOn(Reservation, 'create').mockImplementationOnce(() => { throw new Error('fail'); });
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          room: testRoom._id,
          startTime: '2025-12-08T10:00:00Z',
          endTime: '2025-12-08T11:00:00Z',
          attendees: 2,
          purpose: 'Force error'
        });
      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
    });

    test('should fail getAllReservations if validation fails', async () => {
      const response = await request(app)
        .get('/api/reservations/admin/all?limit=wrong')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(400);
    });

    test('should fail updateReservationStatus with invalid status', async () => {
      const response = await request(app)
        .patch(`/api/reservations/admin/${testReservation._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'notalegitstatus' });
      expect(response.status).toBe(400);
    });

    test('should fail updateReservationStatus if reservation not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .patch(`/api/reservations/admin/${fakeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });
      expect(response.status).toBe(404);
    });

    test('should get reservation stats (admin)', async () => {
      const response = await request(app)
        .get('/api/reservations/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.stats).toBeDefined();
    });

    test('should get reservations by room (admin)', async () => {
      const response = await request(app)
        .get(`/api/reservations/admin/room/${testRoom._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.reservations)).toBe(true);
    });

    test('should handle error in getReservationsByRoom', async () => {
      jest.spyOn(Reservation, 'find').mockImplementationOnce(() => { throw new Error('fail'); });
      const response = await request(app)
        .get(`/api/reservations/admin/room/${testRoom._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(500);
    });

    // ---- FULL controller error tests for >80% coverage ----
    test('should handle internal error in getUserReservations', async () => {
      jest.spyOn(Reservation, 'find').mockImplementationOnce(() => { throw new Error(); });
      const response = await request(app)
        .get('/api/reservations/my-reservations')
        .set('Authorization', `Bearer ${userToken}`);
      expect(response.status).toBe(500);
    });

    test('should handle validation error in checkAvailability', async () => {
  const response = await request(app)
    .post('/api/reservations/check')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      room: testRoom._id,
      startTime: '',
      endTime: ''
    });
  expect([400, 404]).toContain(response.status);
});

    test('should handle server error in checkAvailability', async () => {
  jest.spyOn(Room, 'findById').mockImplementationOnce(() => { throw new Error(); });
  const response = await request(app)
    .post('/api/reservations/check')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      room: testRoom._id,
      startTime: '2025-12-10T10:00:00Z',
      endTime: '2025-12-10T11:00:00Z'
    });
  expect([500, 404]).toContain(response.status);
});

    test('should fail getReservationById if not found', async () => {
      const id = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/reservations/${id}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(response.status).toBe(404);
    });

    test('should give forbidden for another user', async () => {
  const otherUser = await mongoose.model('User').create({
    name: 'x', email: `x${Math.random()}@t.com`, password: 'pass123'
  });
  const reservation = await Reservation.create({
    user: otherUser._id,
    room: testRoom._id,
    startTime: new Date('2025-12-20T10:00:00Z'),
    endTime: new Date('2025-12-20T12:00:00Z'),
    attendees: 2,
    purpose: 'not allowed'
  });
  const response = await request(app)
    .get(`/api/reservations/${reservation._id}`)
    .set('Authorization', `Bearer ${userToken}`);
  expect([403, 404]).toContain(response.status);
});


    test('should fail cancelReservation if not found', async () => {
      const id = new mongoose.Types.ObjectId();
      const response = await request(app)
        .patch(`/api/reservations/${id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);
      expect([404, 400]).toContain(response.status);
    });

    test('should give forbidden for cancelReservation as another user', async () => {
  const otherUser = await mongoose.model('User').create({
    name: 'y', email: `yy${Math.random()}@t.com`, password: 'pass123'
  });
  const reservation = await Reservation.create({
    user: otherUser._id,
    room: testRoom._id,
    startTime: new Date('2025-12-20T10:00:00Z'),
    endTime: new Date('2025-12-20T12:00:00Z'),
    attendees: 2,
    purpose: 'no cancel'
  });
  const response = await request(app)
    .patch(`/api/reservations/${reservation._id}/cancel`)
    .set('Authorization', `Bearer ${userToken}`);
  expect([403, 404]).toContain(response.status);
});

    test('should fail cancelReservation if too late', async () => {
      const soon = new Date(Date.now() + 15 * 60 * 1000);
      const reservation = await Reservation.create({
        user: testUser._id,
        room: testRoom._id,
        startTime: soon,
        endTime: new Date(soon.getTime() + 60 * 60 * 1000),
        attendees: 2,
        purpose: 'too late'
      });
      const response = await request(app)
        .patch(`/api/reservations/${reservation._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);
      expect([400, 403]).toContain(response.status);
    });

    test('should handle server error in getUpcomingReservations', async () => {
      jest.spyOn(Reservation, 'findUpcomingByUser').mockImplementationOnce(() => { throw new Error(); });
      const response = await request(app)
        .get('/api/reservations/upcoming')
        .set('Authorization', `Bearer ${userToken}`);
      expect(response.status).toBe(500);
    });

describe('Reservation Controller - Additional Edge Coverage', () => {
  test('admin: getAllReservations with date filtering and sorting', async () => {
    const now = new Date();
   const anotherRoom = await Room.create({
  name: 'Another room',
  description: 'Spacious meeting room for teams',            // required string (min 10)
  capacity: 8,
  amenities: ['Projector', 'Whiteboard'],
  pricePerHour: 120,
  location: { building: 'Main Block', floor: '3' },         // both required, floor as string   
  isActive: true,
  createdBy: testAdmin._id                                  // if your schema includes it, add here
});
    await Reservation.create({
      user: testUser._id,
      room: anotherRoom._id,
      startTime: new Date(now.getTime() + 86400000),
      endTime: new Date(now.getTime() + 2 * 86400000),
      attendees: 2,
      purpose: 'next day'
    });

    const response = await request(app)
      .get(
        `/api/reservations/admin/all?from=${now.toISOString()}&status=pending&page=1&limit=2&sortBy=startTime&sortOrder=desc`
      )
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.reservations)).toBe(true);
    expect(response.body.data.pagination).toBeDefined();
  });

  test('getUpcomingReservations for user returns own', async () => {
    const response = await request(app)
      .get('/api/reservations/upcoming')
      .set('Authorization', `Bearer ${userToken}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.reservations)).toBe(true);
  });

  test('checkAvailability - inactive room returns 404', async () => {

const inactiveRoom = await Room.create({
  name: 'Inactive',
  description: 'Unavailable/closed room for maintenance',    // required string (min 10)
  capacity: 5,
  amenities: ['TV'],
  pricePerHour: 80,
  location: { building: 'Annex', floor: '2' },
  images: [],
  isActive: false,
  createdBy: testAdmin._id
});

    const response = await request(app)
      .post('/api/reservations/check')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        room: inactiveRoom._id,
        startTime: '2025-12-10T14:00:00Z',
        endTime: '2025-12-10T15:00:00Z'
      });
    expect(response.status).toBe(404);
  });

 test('checkAvailability returns true when slot available', async () => {
  const response = await request(app)
    .post('/api/reservations/check-availability')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      room: testRoom._id.toString(), // always use .toString()
      startTime: '2025-12-07T10:00:00Z',
      endTime: '2025-12-07T11:00:00Z'
    });
  expect(response.status).toBe(200);
  expect(response.body.data.available).toBe(true);
});



  test('admin: cancelReservation on already cancelled returns 200', async () => {
    testReservation.status = 'cancelled';
    await testReservation.save();
    const response = await request(app)
      .patch(`/api/reservations/admin/${testReservation._id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 400]).toContain(response.status);
  });

  test('admin: updateReservationStatus to completed', async () => {
    const response = await request(app)
      .patch(`/api/reservations/admin/${testReservation._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed' });
    expect(response.status).toBe(200);
    expect(response.body.data.reservation.status).toBe('completed');
  });

  test('admin: getReservationsByRoom with status and date', async () => {
    const now = new Date();
    const response = await request(app)
      .get(
        `/api/reservations/admin/room/${testRoom._id}?from=${now.toISOString()}&status=pending`
      )
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.reservations)).toBe(true);
  });

  test('should fail createReservation with too short duration', async () => {
    const reservationData = {
      room: testRoom._id,
      startTime: '2025-12-10T10:00:00Z',
      endTime: '2025-12-10T10:15:00Z',
      attendees: 2,
      purpose: 'short meeting'
    };
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send(reservationData);
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Minimum booking duration/);
  });

  test('should fail createReservation with too long duration', async () => {
    const reservationData = {
      room: testRoom._id,
      startTime: '2025-12-10T10:00:00Z',
      endTime: '2025-12-10T20:30:00Z',
      attendees: 2,
      purpose: 'long meeting'
    };
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send(reservationData);
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Maximum booking duration/);
  });

  test('should fail createReservation if attendees > capacity', async () => {
    const reservationData = {
      room: testRoom._id,
      startTime: '2025-12-10T10:00:00Z',
      endTime: '2025-12-10T12:00:00Z',
      attendees: testRoom.capacity + 5,
      purpose: 'over capacity'
    };
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send(reservationData);
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/capacity/);
  });
});

  });
});
