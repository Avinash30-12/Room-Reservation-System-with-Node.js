const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    maxlength: [100, 'Room name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Room description is required'],
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  capacity: {
    type: Number,
    required: [true, 'Room capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [1000, 'Capacity cannot exceed 1000']
  },
  amenities: [{
    type: String,
    trim: true
  }],
  pricePerHour: {
    type: Number,
    required: [true, 'Price per hour is required'],
    min: [0, 'Price cannot be negative']
  },
  location: {
    building: {
      type: String,
      required: [true, 'Building name is required'],
      trim: true
    },
    floor: {
      type: String,
      required: [true, 'Floor number is required'],
      trim: true
    }
  },
  images: [{
    type: String, // URLs to room images
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
roomSchema.index({ name: 1 });
roomSchema.index({ 'location.building': 1 });
roomSchema.index({ capacity: 1 });
roomSchema.index({ pricePerHour: 1 });
roomSchema.index({ isActive: 1 });

// Virtual for checking if room is available (we'll use this later)
roomSchema.virtual('isAvailable').get(function() {
  // This will be implemented when we add reservations
  return this.isActive;
});

// Instance method to check if room can accommodate people
roomSchema.methods.canAccommodate = function(peopleCount) {
  return peopleCount <= this.capacity;
};

// Static method to find rooms by capacity range
roomSchema.statics.findByCapacityRange = function(minCapacity, maxCapacity) {
  return this.find({
    capacity: { $gte: minCapacity, $lte: maxCapacity },
    isActive: true
  });
};

// Remove __v and add virtuals to JSON output
roomSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Room', roomSchema);