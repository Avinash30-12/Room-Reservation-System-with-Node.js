require('dotenv').config();

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  
  // Database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/room-reservation'
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d'
  },
  
  // Client
  client: {
    url: process.env.CLIENT_URL || 'http://localhost:3000'
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar] || process.env[envVar].includes('change-this')) {
    console.warn(`⚠️  Warning: ${envVar} is not properly set in environment variables`);
    console.warn(`   Current value: ${process.env[envVar]}`);
    console.warn(`   Please update your .env file with secure values`);
  }
});

// Log configuration in development
if (config.nodeEnv === 'development') {
  console.log('🔧 Configuration loaded:');
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Port: ${config.port}`);
  
}

module.exports = config;