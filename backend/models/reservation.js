const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reservation must belong to a user']
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Reservation must be for a room']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  purpose: {
    type: String,
    required: [true, 'Meeting purpose is required'],
    trim: true,
    maxlength: [200, 'Purpose cannot be more than 200 characters']
  },
  attendees: {
    type: Number,
    required: [true, 'Number of attendees is required'],
    min: [1, 'There must be at least 1 attendee'],
    validate: {
      validator: function(attendees) {
        // This will be populated when checking room capacity
        return this.room ? true : attendees >= 1;
      },
      message: 'Number of attendees exceeds room capacity'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  },
  specialRequirements: {
    type: String,
    trim: true,
    maxlength: [500, 'Special requirements cannot be more than 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
reservationSchema.index({ user: 1 });
reservationSchema.index({ room: 1 });
reservationSchema.index({ startTime: 1, endTime: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ user: 1, startTime: 1 });

// Compound index for checking availability
reservationSchema.index({ 
  room: 1, 
  startTime: 1, 
  endTime: 1, 
  status: 1 
});

// Virtual for duration in hours
reservationSchema.virtual('durationHours').get(function() {
  return (this.endTime - this.startTime) / (1000 * 60 * 60);
});

// Virtual for total cost
reservationSchema.virtual('totalCost').get(function() {
  if (this.populated('room')) {
    return this.durationHours * this.room.pricePerHour;
  }
  return 0;
});

// Check if reservation is active (not cancelled or completed)
reservationSchema.virtual('isActive').get(function() {
  return ['pending', 'confirmed'].includes(this.status);
});

// Middleware to update updatedAt timestamp
reservationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to check room availability
reservationSchema.statics.checkAvailability = async function(roomId, startTime, endTime, excludeReservationId = null) {
  const conflictConditions = {
    room: roomId,
    status: { $in: ['pending', 'confirmed'] }, // Only check active reservations
    $or: [
      // Existing reservation starts during new reservation
      { startTime: { $gte: startTime, $lt: endTime } },
      // Existing reservation ends during new reservation  
      { endTime: { $gt: startTime, $lte: endTime } },
      // New reservation is within existing reservation
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
    ]
  };

  // Exclude current reservation when updating
  if (excludeReservationId) {
    conflictConditions._id = { $ne: excludeReservationId };
  }

  const conflictingReservation = await this.findOne(conflictConditions);
  return !conflictingReservation;
};

// Static method to find user's upcoming reservations
reservationSchema.statics.findUpcomingByUser = function(userId, limit = 10) {
  return this.find({
    user: userId,
    startTime: { $gte: new Date() },
    status: { $in: ['pending', 'confirmed'] }
  })
  .populate('room', 'name capacity pricePerHour location amenities')
  .sort({ startTime: 1 })
  .limit(limit);
};

// Instance method to check if reservation can be cancelled
reservationSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const hoursUntilStart = (this.startTime - now) / (1000 * 60 * 60);
  return this.status === 'confirmed' && hoursUntilStart > 2; // Can cancel up to 2 hours before
};

// Instance method to check if reservation is in progress
reservationSchema.methods.isInProgress = function() {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime;
};

// Remove __v and add virtuals to JSON output
reservationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Reservation', reservationSchema);