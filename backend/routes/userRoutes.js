const express = require('express');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getAllUsers,           
  getUserById,             
  updateUserRole,        
  deleteUser,            
  toggleUserStatus,
  getUserStats
} = require('../controllers/userController');
const { auth , authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.use(auth); // All routes below this require authentication

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.patch('/change-password', changePassword);

// Admin only routes
router.get('/admin/users', authorize('admin'), getAllUsers);
router.get('/admin/users/:id', authorize('admin'), getUserById);
router.get('/admin/users/stats', authorize('admin'), getUserStats);
router.patch('/admin/users/:id/role', authorize('admin'), updateUserRole);
router.patch('/admin/users/:id/status', authorize('admin'), toggleUserStatus);
router.delete('/admin/users/:id', authorize('admin'), deleteUser);

module.exports = router;