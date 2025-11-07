const Room = require('../models/room');
const {
  createRoomValidation,
  updateRoomValidation,
  roomQueryValidation
} = require('../utils/validations');

// Create a new room (Admin only)
const createRoom = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createRoomValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    // Check if room with same name already exists
    const existingRoom = await Room.findOne({ 
      name: value.name,
      'location.building': value.location.building 
    });
    
    if (existingRoom) {
      return res.status(409).json({
        status: 'error',
        message: 'Room with this name already exists in the building'
      });
    }

    // Create room with admin user as creator
    const room = await Room.create({
      ...value,
      createdBy: req.user.id
    });

    // Populate creator info
    await room.populate('createdBy', 'name email');

    res.status(201).json({
      status: 'success',
      message: 'Room created successfully',
      data: {
        room
      }
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get all rooms with filtering and pagination
const getAllRooms = async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = roomQueryValidation.validate(req.query);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const {
      page,
      limit,
      search,
      minCapacity,
      maxCapacity,
      minPrice,
      maxPrice,
      building,
      amenities,
      sortBy,
      sortOrder
    } = value;

    // Build filter object
    const filter = { isActive: true };
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Capacity filter
    if (minCapacity || maxCapacity) {
      filter.capacity = {};
      if (minCapacity) filter.capacity.$gte = minCapacity;
      if (maxCapacity) filter.capacity.$lte = maxCapacity;
    }

    // Price filter
    if (minPrice || maxPrice) {
      filter.pricePerHour = {};
      if (minPrice) filter.pricePerHour.$gte = minPrice;
      if (maxPrice) filter.pricePerHour.$lte = maxPrice;
    }

    // Building filter
    if (building) {
      filter['location.building'] = { $regex: building, $options: 'i' };
    }

    // Amenities filter
    if (amenities) {
      const amenitiesArray = amenities.split(',').map(a => a.trim());
      filter.amenities = { $in: amenitiesArray };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const rooms = await Room.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Room.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      status: 'success',
      data: {
        rooms,
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
    console.error('Get all rooms error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get single room by ID
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        room
      }
    });
  } catch (error) {
    console.error('Get room by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Update room (Admin only)
const updateRoom = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateRoomValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    // Check if room exists
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found'
      });
    }

    // Check for duplicate name if name is being updated
    if (value.name && value.name !== room.name) {
      const existingRoom = await Room.findOne({
        name: value.name,
        'location.building': value.location?.building || room.location.building,
        _id: { $ne: req.params.id }
      });
      
      if (existingRoom) {
        return res.status(409).json({
          status: 'error',
          message: 'Room with this name already exists in the building'
        });
      }
    }

    // Update room
    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      status: 'success',
      message: 'Room updated successfully',
      data: {
        room: updatedRoom
      }
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Delete room (Admin only - soft delete)
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found'
      });
    }

    // Soft delete by setting isActive to false
    room.isActive = false;
    await room.save();

    res.json({
      status: 'success',
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get rooms by capacity range
const getRoomsByCapacity = async (req, res) => {
  try {
    const { min, max } = req.params;
    
    const minCapacity = parseInt(min);
    const maxCapacity = parseInt(max);

    if (isNaN(minCapacity) || isNaN(maxCapacity) || minCapacity < 1 || maxCapacity < minCapacity) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid capacity range'
      });
    }

    const rooms = await Room.findByCapacityRange(minCapacity, maxCapacity)
      .populate('createdBy', 'name email');

    res.json({
      status: 'success',
      data: {
        rooms,
        count: rooms.length
      }
    });
  } catch (error) {
    console.error('Get rooms by capacity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  getRoomsByCapacity
};