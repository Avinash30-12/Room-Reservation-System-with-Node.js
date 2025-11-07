const Joi = require('joi');

// User validation schemas
const registerValidation = Joi.object({
  name: Joi.string().min(2).max(50).required().trim(),
  email: Joi.string().email().required().trim().lowercase(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('user', 'admin').default('user')
});

const loginValidation = Joi.object({
  email: Joi.string().email().required().trim().lowercase(),
  password: Joi.string().required()
});

const updateUserValidation = Joi.object({
  name: Joi.string().min(2).max(50).trim(),
  email: Joi.string().email().trim().lowercase()
});

const changePasswordValidation = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

const forgotPasswordValidation = Joi.object({
  email: Joi.string().email().required().trim().lowercase()
});

const resetPasswordValidation = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required()
});

// Room validation schemas
const createRoomValidation = Joi.object({
  name: Joi.string().min(2).max(100).required().trim(),
  description: Joi.string().min(10).max(500).required().trim(),
  capacity: Joi.number().integer().min(1).max(1000).required(),
  amenities: Joi.array().items(Joi.string().trim()),
  pricePerHour: Joi.number().min(0).required(),
  location: Joi.object({
    building: Joi.string().required().trim(),
    floor: Joi.string().required().trim()
  }).required(),
  images: Joi.array().items(Joi.string().uri().trim()),
  isActive: Joi.boolean().default(true)
});

const updateRoomValidation = Joi.object({
  name: Joi.string().min(2).max(100).trim(),
  description: Joi.string().min(10).max(500).trim(),
  capacity: Joi.number().integer().min(1).max(1000),
  amenities: Joi.array().items(Joi.string().trim()),
  pricePerHour: Joi.number().min(0),
  location: Joi.object({
    building: Joi.string().trim(),
    floor: Joi.string().trim()
  }),
  images: Joi.array().items(Joi.string().uri().trim()),
  isActive: Joi.boolean()
});

const roomQueryValidation = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(100),
  minCapacity: Joi.number().integer().min(1),
  maxCapacity: Joi.number().integer().min(1),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  building: Joi.string().trim(),
  amenities: Joi.string().trim(), // comma-separated
  sortBy: Joi.string().valid('name', 'capacity', 'pricePerHour', 'createdAt').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

// Reservation validation schemas
const createReservationValidation = Joi.object({
  room: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Room ID must be a valid MongoDB ID',
    'string.length': 'Room ID must be 24 characters long'
  }),
  startTime: Joi.date().iso().greater('now').required().messages({
    'date.greater': 'Start time must be in the future'
  }),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required().messages({
    'date.greater': 'End time must be after start time'
  }),
  purpose: Joi.string().min(5).max(200).required().trim(),
  attendees: Joi.number().integer().min(1).required(),
  specialRequirements: Joi.string().max(500).trim().allow('')
});

const updateReservationValidation = Joi.object({
  startTime: Joi.date().iso().greater('now'),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')),
  purpose: Joi.string().min(5).max(200).trim(),
  attendees: Joi.number().integer().min(1),
  specialRequirements: Joi.string().max(500).trim().allow(''),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled')
});

const reservationQueryValidation = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed'),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  sortBy: Joi.string().valid('startTime', 'createdAt', 'updatedAt').default('startTime'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

const checkAvailabilityValidation = Joi.object({
  room: Joi.string().hex().length(24).required(),
  startTime: Joi.date().iso().greater('now').required(),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
  excludeReservation: Joi.string().hex().length(24) // For updating existing reservations
});

module.exports = {
  registerValidation,
  loginValidation,
  updateUserValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  createRoomValidation,
  updateRoomValidation,
  roomQueryValidation,
   createReservationValidation,
  updateReservationValidation,
  reservationQueryValidation,
  checkAvailabilityValidation
};