# Room Reservation API

A robust REST API backend for managing room reservations, built with Node.js, Express, and MongoDB.

## Features

- User Authentication and Authorization
- Room Management
- Reservation System
- Role-based Access Control (Admin/User)
- Comprehensive Test Suite
- Input Validation
- JWT Token Authentication

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   PORT=8000
   MONGODB_URI=mongodb://localhost:27017/room-reservation
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Running Tests
```bash
npm test
```

For test coverage:
```bash
npm run test:coverage
```

## Project Structure

```
backend/
├── app.js              # Express app configuration
├── server.js           # Server entry point
├── config/             # Configuration files
├── controllers/        # Route controllers
├── middlewares/        # Custom middlewares
├── models/            # Database models
├── routes/            # API routes
├── scripts/           # Utility scripts
├── tests/            # Test suites
└── utils/            # Utility functions
```

## API Endpoints

### Authentication
- POST /api/users/register - Register new user
- POST /api/users/login - User login

### Rooms
- GET /api/rooms - Get all rooms
- POST /api/rooms - Create new room (Admin only)
- GET /api/rooms/:id - Get room by ID
- PUT /api/rooms/:id - Update room (Admin only)
- DELETE /api/rooms/:id - Delete room (Admin only)

### Reservations
- GET /api/reservations - Get all reservations
- POST /api/reservations - Create new reservation
- GET /api/reservations/:id - Get reservation by ID
- PUT /api/reservations/:id - Update reservation
- DELETE /api/reservations/:id - Delete reservation

## Testing

The application includes a comprehensive test suite using Jest. Tests cover:
- User Authentication
- Room Management
- Reservation System
- Error Handling
- Input Validation

Tests use an in-memory MongoDB server for isolation and reliability.

## Error Handling

The API implements consistent error handling with appropriate HTTP status codes and error messages.

## Security Features

- JWT based authentication
- Password hashing
- Role-based access control
- Input validation and sanitization
- Security headers

## Development

### Code Style
- ESLint configuration for consistent code style
- Prettier for code formatting

### Documentation
- Postman collection available in `docs/room-reservation-api.postman_collection.json`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
