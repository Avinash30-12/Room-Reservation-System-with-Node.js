const User = require('../../models/user');
const Room = require('../../models/room');
const { generateToken } = require('../../utils/jwt');

let testUser;
let testAdmin;
let testRoom;
let userToken;
let adminToken;

async function setupTestData() {
  // Create test admin
  testAdmin = await User.create({
    name: 'Test Admin',
    email: 'testadmin@example.com',
    password: 'password123',
    role: 'admin',
    isActive: true
  });

  // Create test user
  testUser = await User.create({
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'password123',
    role: 'user',
    isActive: true
  });

  // Create test room
  testRoom = await Room.create({
  name: 'Main Boardroom',
  description: 'A large, modern boardroom.',
  capacity: 10,
  amenities: ['WiFi', 'Projector', 'Whiteboard'],
  pricePerHour: 150,
  location: { building: 'HQ', floor: '2' },
  images: [],
  isActive: true,
  createdBy: testAdmin._id   // <------ REQUIRED! Pass a valid user or admin id
});


  // Generate tokens
  userToken = generateToken({
    id: testUser._id,
    role: testUser.role
  });

  adminToken = generateToken({
    id: testAdmin._id,
    role: testAdmin.role
  });

  return {
    testUser,
    testAdmin,
    testRoom,
    userToken,
    adminToken
  };
}

module.exports = {
  setupTestData
};