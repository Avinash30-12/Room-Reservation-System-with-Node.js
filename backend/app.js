const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const reservationRoutes = require('./routes/reservationRoutes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Handle invalid JSON payloads from body-parser
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON payload'
    });
  }
  next(err);
});
// Routes
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);


// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running healthy!',
    timestamp: new Date().toISOString()
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: '🏨 Welcome to Room Reservation API',
    version: '1.0.0',
    environment: config.nodeEnv,
    endpoints: {
      auth: '/api/users',
      rooms: '/api/rooms',
      reservations: '/api/reservations',
      docs: '/api-docs (coming soon)'
    }
  });
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use(/.*/, (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

module.exports = app;