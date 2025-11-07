const request = require('supertest');
const mongoose = require('mongoose');
const Room = require('../models/room');
const app = require('../app');
const { setupTestData } = require('./test-utils/test-data');
require('./test-utils/test-setup');


let userToken;
let adminToken;
let testUser;
let testAdmin;
let testRoom;


beforeEach(async () => {
  const data = await setupTestData();
  ({ testUser, testAdmin, testRoom, userToken, adminToken } = data);
});


describe('Room Controller - Enhanced Tests', () => {
  describe('Create Room', () => {
    test('admin should create room with valid data', async () => {
      const roomData = {
        name: 'New Room',
        description: 'A modern meeting room',
        capacity: 15,
        pricePerHour: 150,
        amenities: ['projector', 'whiteboard', 'videoconference'],
        location: {
          building: 'Main Building',
          floor: '3rd Floor'
        }
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(roomData);

      expect(response.status).toBe(201);
      expect(response.body.data.room).toHaveProperty('_id');
      expect(response.body.data.room.name).toBe(roomData.name);
    });

    test('user should not create room', async () => {
      const roomData = {
        name: 'New Room',
        capacity: 15,
        pricePerHour: 150
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', 'Bearer ' + userToken)
        .send(roomData);

      expect(response.status).toBe(403);
    });

    test('should fail with invalid data', async () => {
      const roomData = {
        name: '', // Invalid: empty name
        capacity: -1, // Invalid: negative capacity
        pricePerHour: 0 // Invalid: zero price
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(roomData);

      expect(response.status).toBe(400);
    });

    test('should fail with duplicate room name', async () => {
      const roomData = {
        name: testRoom.name, // Same as testRoom
        description: 'Another test room description',
        capacity: 15,
        pricePerHour: 150,
        amenities: ['projector'],
        location: { building: testRoom.location.building, floor: '2nd Floor' }
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(roomData);

      expect(response.status).toBe(409);
    });

    test('should handle server error on createRoom', async () => {
      jest.spyOn(Room, 'findOne').mockImplementationOnce(() => { throw new Error('fail'); });
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          name: 'Server Error',
          description: 'descdescdesc',
          capacity: 10,
          pricePerHour: 5,
          amenities: [],
          location: { building: 'B', floor: '1' }
        });
      expect(response.status).toBe(500);
    });
  });

  describe('Update Room', () => {
    test('admin should update room', async () => {
      const updateData = {
        name: 'Updated Room',
        capacity: 20,
        pricePerHour: 200
      };

      const response = await request(app)
        .patch('/api/rooms/' + testRoom._id)
        .set('Authorization', 'Bearer ' + adminToken)
        .send(updateData);

      if (response.status !== 200) {
        console.log('Update response body:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.data.room.name).toBe(updateData.name);
    });

    test('should fail with duplicate name on update', async () => {
      // Create another room to duplicate
      const dup = await Room.create({
        name: 'Dup Room',
        description: 'Another',
        capacity: 15,
        pricePerHour: 99,
        amenities: [],
        location: { building: 'Dup Block', floor: '1' },
        createdBy: testAdmin._id
      });

      const response = await request(app)
        .patch('/api/rooms/' + testRoom._id)
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ name: 'Dup Room', location: { building: 'Dup Block' } });

      expect(response.status).toBe(409);
    });

    test('user should not update room', async () => {
      const response = await request(app)
        .patch('/api/rooms/' + testRoom._id)
        .set('Authorization', 'Bearer ' + userToken)
        .send({ name: 'Updated Room' });

      expect(response.status).toBe(403);
    });

    test('should fail with non-existent room id', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .patch('/api/rooms/' + nonExistentId)
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ name: 'Updated Room' });

      expect(response.status).toBe(404);
    });

    test('should fail with invalid data', async () => {
      const response = await request(app)
        .patch('/api/rooms/' + testRoom._id)
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ capacity: -1 }); // Invalid capacity

      expect(response.status).toBe(400);
    });

    test('should handle server error on updateRoom', async () => {
      jest.spyOn(Room, 'findById').mockImplementationOnce(() => { throw new Error('fail'); });
      const response = await request(app)
        .patch('/api/rooms/' + testRoom._id)
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ name: 'Won\'tUpdate' });
      expect(response.status).toBe(500);
    });
  });

  describe('Delete Room', () => {
    test('admin should delete room', async () => {
      const response = await request(app)
        .delete('/api/rooms/' + testRoom._id)
        .set('Authorization', 'Bearer ' + adminToken);

      expect(response.status).toBe(200);

      const deleted = await Room.findById(testRoom._id);
      // soft delete sets isActive to false
      expect(deleted).not.toBeNull();
      expect(deleted.isActive).toBe(false);
    });

    test('user should not delete room', async () => {
      const response = await request(app)
        .delete('/api/rooms/' + testRoom._id)
        .set('Authorization', 'Bearer ' + userToken);

      expect(response.status).toBe(403);
    });

    test('should fail with non-existent room id', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete('/api/rooms/' + nonExistentId)
        .set('Authorization', 'Bearer ' + adminToken);
      expect(response.status).toBe(404);
    });

    test('should handle server error on deleteRoom', async () => {
      jest.spyOn(Room, 'findById').mockImplementationOnce(() => { throw new Error('fail'); });
      const response = await request(app)
        .delete('/api/rooms/' + testRoom._id)
        .set('Authorization', 'Bearer ' + adminToken);
      expect(response.status).toBe(500);
    });
  });

  describe('Get Rooms', () => {
    test('should get all rooms', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .set('Authorization', 'Bearer ' + userToken);

      expect(response.status).toBe(200);
      expect(response.body.data.rooms).toBeInstanceOf(Array);
      expect(response.body.data.rooms.length).toBeGreaterThan(0);
    });

    test('should get room by id', async () => {
      const response = await request(app)
        .get('/api/rooms/' + testRoom._id)
        .set('Authorization', 'Bearer ' + userToken);

      expect(response.status).toBe(200);
      expect(response.body.data.room._id).toBe(testRoom._id.toString());
    });

    test('should fail with 404 for non-existent room', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get('/api/rooms/' + nonExistentId)
        .set('Authorization', 'Bearer ' + userToken);
      expect(response.status).toBe(404);
    });

    test('should handle server error on getRoomById', async () => {
      jest.spyOn(Room, 'findById').mockImplementationOnce(() => { throw new Error('fail'); });
      const response = await request(app)
        .get('/api/rooms/' + testRoom._id)
        .set('Authorization', 'Bearer ' + userToken);
      expect(response.status).toBe(500);
    });

    test('should filter rooms by capacity', async () => {
      await Room.create({
        name: 'Large Room',
        description: 'Large meeting room',
        capacity: 50,
        pricePerHour: 300,
        amenities: ['projector'],
        location: { building: 'Main Building', floor: '5th Floor' },
        createdBy: testAdmin._id
      });

      const response = await request(app)
        .get('/api/rooms')
        .query({ minCapacity: 20 })
        .set('Authorization', 'Bearer ' + userToken);

      expect(response.status).toBe(200);
      expect(response.body.data.rooms).toBeInstanceOf(Array);
      expect(response.body.data.rooms.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.rooms[0].capacity).toBeGreaterThanOrEqual(20);
    });

    test('should filter rooms by price range', async () => {
      await Room.create({
        name: 'Premium Room',
        description: 'Premium meeting room',
        capacity: 20,
        pricePerHour: 500,
        amenities: ['whiteboard'],
        location: { building: 'Annex', floor: '1st Floor' },
        createdBy: testAdmin._id
      });

      const response = await request(app)
        .get('/api/rooms')
        .query({ maxPrice: 200 })
        .set('Authorization', 'Bearer ' + userToken);

      expect(response.status).toBe(200);
      expect(response.body.data.rooms).toBeInstanceOf(Array);
      expect(response.body.data.rooms.every(room => room.pricePerHour <= 200)).toBe(true);
    });

    test('should filter rooms by facilities', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .query({ amenities: 'projector,whiteboard' })
        .set('Authorization', 'Bearer ' + userToken);

      expect(response.status).toBe(200);
      expect(response.body.data.rooms).toBeInstanceOf(Array);
      expect(response.body.data.rooms.every(room =>
        room.amenities.includes('projector') &&
        room.amenities.includes('whiteboard')
      )).toBe(true);
    });
  });

  describe('Get Rooms By Capacity (range route)', () => {
    test('should get rooms in valid capacity range', async () => {
      await Room.create({
        name: 'Huge Room',
        description: 'Huge meeting room with high capacity',
        capacity: 100,
        pricePerHour: 1000,
        amenities: [],
        location: { building: 'Mega', floor: '10' },
        createdBy: testAdmin._id
      });
      const response = await request(app)
        .get('/api/rooms/capacity/50/120')
        .set('Authorization', 'Bearer ' + userToken);
      expect(response.status).toBe(200);
      expect(response.body.data.rooms.some(r => r.capacity >= 50 && r.capacity <= 120)).toBe(true);
    });

    test('should return 400 for invalid capacity range', async () => {
      const response = await request(app)
        .get('/api/rooms/capacity/10/2')
        .set('Authorization', 'Bearer ' + userToken);
      expect(response.status).toBe(400);
    });

    test('should handle server error in getRoomsByCapacity', async () => {
      jest.spyOn(Room, 'findByCapacityRange').mockImplementationOnce(() => { throw new Error('fail'); });
      const response = await request(app)
        .get('/api/rooms/capacity/1/100')
        .set('Authorization', 'Bearer ' + userToken);
      expect(response.status).toBe(500);
    });
    // --- For line 64 (404 on update when room not found) ---
test('should return 404 when updating a room that does not exist', async () => {
  const randomId = new mongoose.Types.ObjectId();
  const response = await request(app)
    .patch('/api/rooms/' + randomId)
    .set('Authorization', 'Bearer ' + adminToken)
    .send({ name: 'Ghost Room' });
  expect(response.status).toBe(404);
});

// --- For line 89 (404 on delete when room not found) ---
test('should return 404 when deleting a room that does not exist', async () => {
  const randomId = new mongoose.Types.ObjectId();
  const response = await request(app)
    .delete('/api/rooms/' + randomId)
    .set('Authorization', 'Bearer ' + adminToken);
  expect(response.status).toBe(404);
});

// --- For line 111 (404 on getRoomById) ---
test('should return 404 when getting a room that does not exist', async () => {
  const randomId = new mongoose.Types.ObjectId();
  const response = await request(app)
    .get('/api/rooms/' + randomId)
    .set('Authorization', 'Bearer ' + userToken);
  expect(response.status).toBe(404);
});

// --- For lines 153-154 (409 on update to duplicate name/building) ---
test('should not update a room to duplicate name/building', async () => {
  // Create another room with duplicate name/building
  await Room.create({
    name: 'DupName',
    description: 'descdescdesc',
    capacity: 12,
    pricePerHour: 100,
    amenities: [],
    location: { building: 'DupBlock', floor: '1' },
    createdBy: testAdmin._id
  });

  const response = await request(app)
    .patch('/api/rooms/' + testRoom._id)
    .set('Authorization', 'Bearer ' + adminToken)
    .send({ name: 'DupName', location: { building: 'DupBlock' } });

  expect(response.status).toBe(409);
});


  });
});
