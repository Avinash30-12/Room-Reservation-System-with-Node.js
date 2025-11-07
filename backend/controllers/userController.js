const User = require('../models/user');
const {
  registerValidation,
  loginValidation,
  updateUserValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../utils/validations');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const crypto = require('crypto');

// Register new user
const register = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = registerValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: value.email });
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create(value);

    // Generate tokens
    const token = generateToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = loginValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: value.email }).select('+password');
    
    if (!user || !(await user.comparePassword(value.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated'
      });
    }

    // Generate tokens
    const token = generateToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { error, value } = updateUserValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    // Prevent email change to existing email
    if (value.email && value.email !== req.user.email) {
      const existingUser = await User.findOne({ email: value.email });
      if (existingUser) {
        return res.status(409).json({
          status: 'error',
          message: 'Email already exists'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      value,
      { new: true, runValidators: true }
    );

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { error, value } = changePasswordValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(value.currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = value.newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Forgot password (simplified - in production, you'd send email)
const forgotPassword = async (req, res) => {
  try {
    const { error, value } = forgotPasswordValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const user = await User.findOne({ email: value.email });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        status: 'success',
        message: 'If the email exists, a reset token will be sent'
      });
    }

    // Generate reset token (simplified - in production, send via email)
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    await user.save();

    // In production: Send email with reset token
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    res.json({
      status: 'success',
      message: 'If the email exists, a reset token will be sent',
      data: {
        resetToken // Remove this in production - only for testing
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { error, value } = resetPasswordValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const user = await User.findOne({
      passwordResetToken: value.token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    user.password = value.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// ==================== ADMIN USER MANAGEMENT ====================

// Admin: Get all users
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          limit: parseInt(limit),
          totalRecords: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Admin: Get user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Admin: Update user role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be "user" or "admin"'
      });
    }

    // Prevent admin from modifying their own role
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot modify your own role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'User role updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Admin: Delete user
const deleteUser = async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Admin: Deactivate/Activate user
const toggleUserStatus = async (req, res) => {
  try {
    // Prevent admin from deactivating themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot modify your own account status'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      status: 'success',
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Admin: Get user statistics
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin', isActive: true });
    const regularUsers = await User.countDocuments({ role: 'user', isActive: true });

    // Get recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          adminUsers,
          regularUsers,
          recentUsers
        }
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  // Admin functions
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  toggleUserStatus,
  getUserStats
};