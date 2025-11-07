const express = require('express');
const {
  createReservation,
  getUserReservations,
  getReservationById,
  cancelReservation,
  checkAvailability,
  getUpcomingReservations,
  getAllReservations,
  updateReservationStatus,
  adminCancelReservation,
  getReservationStats,
  getReservationsByRoom
} = require('../controllers/reservationController');
const { auth, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(auth);

// User routes
router.post('/', createReservation);
router.get('/my-reservations', getUserReservations);
router.get('/upcoming', getUpcomingReservations);
router.get('/:id', getReservationById);
router.patch('/:id/cancel', cancelReservation);

// Availability check (public but authenticated)
router.post('/check-availability', checkAvailability);

//admin routes
router.get('/admin/all', authorize('admin'), getAllReservations);
router.get('/admin/stats', authorize('admin'), getReservationStats);
router.get('/admin/room/:roomId', authorize('admin'), getReservationsByRoom);
router.patch('/admin/:id/status', authorize('admin'), updateReservationStatus);
router.patch('/admin/:id/cancel', authorize('admin'), adminCancelReservation);

module.exports = router;