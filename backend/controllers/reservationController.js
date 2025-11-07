const Reservation = require('../models/reservation');
const Room = require('../models/room');
const {
  createReservationValidation,
  updateReservationValidation,
  reservationQueryValidation,
  checkAvailabilityValidation
} = require('../utils/validations');

// Create a new reservation
const createReservation = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createReservationValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const { room: roomId, startTime, endTime, attendees, purpose, specialRequirements } = value;

    // Check if room exists and is active
    const room = await Room.findById(roomId);
    if (!room || !room.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found or not available'
      });
    }

    // Check if room can accommodate attendees
    if (attendees > room.capacity) {
      return res.status(400).json({
        status: 'error',
        message: `Room capacity exceeded. Maximum capacity: ${room.capacity}`
      });
    }

    // Check room availability
    const isAvailable = await Reservation.checkAvailability(roomId, startTime, endTime);
    if (!isAvailable) {
      return res.status(409).json({
        status: 'error',
        message: 'Room is not available for the selected time slot'
      });
    }

    // Ensure minimum booking duration (30 minutes)
    const durationMs = new Date(endTime) - new Date(startTime);
    const durationMinutes = durationMs / (1000 * 60);
    if (durationMinutes < 30) {
      return res.status(400).json({
        status: 'error',
        message: 'Minimum booking duration is 30 minutes'
      });
    }

    // Ensure maximum booking duration (8 hours)
    if (durationMinutes > 8 * 60) {
      return res.status(400).json({
        status: 'error',
        message: 'Maximum booking duration is 8 hours'
      });
    }

    // Create reservation
    const reservation = await Reservation.create({
      user: req.user.id,
      room: roomId,
      startTime,
      endTime,
      attendees,
      purpose,
      specialRequirements
    });

    // Populate room details
    await reservation.populate('room', 'name capacity pricePerHour location amenities');
    await reservation.populate('user', 'name email');

    res.status(201).json({
      status: 'success',
      message: 'Reservation created successfully',
      data: {
        reservation
      }
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get user's reservations
const getUserReservations = async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = reservationQueryValidation.validate(req.query);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const { page, limit, status, from, to, sortBy, sortOrder } = value;

    // Build filter object
    const filter = { user: req.user.id };

    if (status) {
      filter.status = status;
    }

    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) filter.startTime.$lte = new Date(to);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const reservations = await Reservation.find(filter)
      .populate('room', 'name capacity pricePerHour location amenities')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Reservation.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      status: 'success',
      data: {
        reservations,
        pagination: {
          current: page,
          total: totalPages,
          limit,
          totalRecords: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get user reservations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get single reservation by ID
const getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('room', 'name capacity pricePerHour location amenities')
      .populate('user', 'name email');

    if (!reservation) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservation not found'
      });
    }

    // Users can only see their own reservations, admins can see all
    if (req.user.role !== 'admin' && reservation.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only view your own reservations.'
      });
    }

    res.json({
      status: 'success',
      data: {
        reservation
      }
    });
  } catch (error) {
    console.error('Get reservation by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Cancel reservation
const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('room');

    if (!reservation) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservation not found'
      });
    }

    // Users can only cancel their own reservations
    if (req.user.role !== 'admin' && reservation.user.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only cancel your own reservations.'
      });
    }

    // Check if reservation can be cancelled
    if (req.user.role !== 'admin' && !reservation.canBeCancelled()) {
      return res.status(400).json({
        status: 'error',
        message: 'Reservation cannot be cancelled. Must be cancelled at least 2 hours before start time.'
      });
    }

    // Update reservation status
    reservation.status = 'cancelled';
    await reservation.save();

    res.json({
      status: 'success',
      message: 'Reservation cancelled successfully',
      data: {
        reservation
      }
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Check room availability
const checkAvailability = async (req, res) => {
  try {
    const { error, value } = checkAvailabilityValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const { room: roomId, startTime, endTime, excludeReservation } = value;

    // Check if room exists and is active
    const room = await Room.findById(roomId);
    if (!room || !room.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found or not available'
      });
    }

    // Check availability
    const isAvailable = await Reservation.checkAvailability(
      roomId, 
      startTime, 
      endTime, 
      excludeReservation
    );

    res.json({
      status: 'success',
      data: {
        available: isAvailable,
        room: {
          id: room._id,
          name: room.name,
          capacity: room.capacity,
          pricePerHour: room.pricePerHour
        },
        timeSlot: {
          startTime,
          endTime
        }
      }
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get upcoming reservations (for dashboard)
const getUpcomingReservations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    let reservations;
    if (req.user.role === 'admin') {
      // Admin can see all upcoming reservations
      reservations = await Reservation.find({
        startTime: { $gte: new Date() },
        status: { $in: ['pending', 'confirmed'] }
      })
      .populate('room', 'name location')
      .populate('user', 'name email')
      .sort({ startTime: 1 })
      .limit(limit);
    } else {
      // Users can only see their own upcoming reservations
      reservations = await Reservation.findUpcomingByUser(req.user.id, limit);
    }

    res.json({
      status: 'success',
      data: {
        reservations,
        count: reservations.length
      }
    });
  } catch (error) {
    console.error('Get upcoming reservations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// ==================== ADMIN RESERVATION MANAGEMENT ====================

// Admin: Get all reservations
const getAllReservations = async (req, res) => {
  try {
    const { error, value } = reservationQueryValidation.validate(req.query);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const { page, limit, status, from, to, sortBy, sortOrder } = value;

    // Build filter object
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) filter.startTime.$lte = new Date(to);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const reservations = await Reservation.find(filter)
      .populate('room', 'name capacity pricePerHour location amenities')
      .populate('user', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Reservation.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      status: 'success',
      data: {
        reservations,
        pagination: {
          current: page,
          total: totalPages,
          limit,
          totalRecords: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all reservations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Admin: Update reservation status
const updateReservationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status'
      });
    }

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
    .populate('room', 'name capacity pricePerHour location amenities')
    .populate('user', 'name email');

    if (!reservation) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservation not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Reservation status updated successfully',
      data: {
        reservation
      }
    });
  } catch (error) {
    console.error('Update reservation status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Admin: Cancel any reservation
const adminCancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('room')
      .populate('user', 'name email');

    if (!reservation) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservation not found'
      });
    }

    // Admin can cancel any reservation regardless of time
    reservation.status = 'cancelled';
    await reservation.save();

    res.json({
      status: 'success',
      message: 'Reservation cancelled by admin',
      data: {
        reservation
      }
    });
  } catch (error) {
    console.error('Admin cancel reservation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Admin: Get reservation statistics
const getReservationStats = async (req, res) => {
  try {
    const totalReservations = await Reservation.countDocuments();
    const confirmedReservations = await Reservation.countDocuments({ status: 'confirmed' });
    const pendingReservations = await Reservation.countDocuments({ status: 'pending' });
    const cancelledReservations = await Reservation.countDocuments({ status: 'cancelled' });
    const completedReservations = await Reservation.countDocuments({ status: 'completed' });

    // Get today's reservations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysReservations = await Reservation.countDocuments({
      startTime: { $gte: today, $lt: tomorrow },
      status: { $in: ['pending', 'confirmed'] }
    });

    // Get this week's reservations
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weeklyReservations = await Reservation.countDocuments({
      startTime: { $gte: weekStart, $lt: weekEnd }
    });

    res.json({
      status: 'success',
      data: {
        stats: {
          totalReservations,
          confirmedReservations,
          pendingReservations,
          cancelledReservations,
          completedReservations,
          todaysReservations,
          weeklyReservations,
          activeReservations: confirmedReservations + pendingReservations
        }
      }
    });
  } catch (error) {
    console.error('Get reservation stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Admin: Get reservations by room
const getReservationsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { from, to, status } = req.query;

    // Build filter
    const filter = { room: roomId };

    if (status) {
      filter.status = status;
    }

    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) filter.startTime.$lte = new Date(to);
    }

    const reservations = await Reservation.find(filter)
      .populate('user', 'name email')
      .populate('room', 'name location')
      .sort({ startTime: 1 });

    res.json({
      status: 'success',
      data: {
        reservations,
        count: reservations.length
      }
    });
  } catch (error) {
    console.error('Get reservations by room error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createReservation,
  getUserReservations,
  getReservationById,
  cancelReservation,
  checkAvailability,
  getUpcomingReservations,
  // Admin functions
  getAllReservations,
  updateReservationStatus,
  adminCancelReservation,
  getReservationStats,
  getReservationsByRoom
};