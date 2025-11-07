const express = require('express');
const {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  getRoomsByCapacity
} = require('../controllers/roomController');
const { auth, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getAllRooms);
router.get('/capacity/:min/:max', getRoomsByCapacity);
router.get('/:id', getRoomById);

// Admin only routes
router.use(auth, authorize('admin')); // All routes below require admin role

router.post('/', createRoom);
router.patch('/:id', updateRoom);
router.delete('/:id', deleteRoom);

module.exports = router;