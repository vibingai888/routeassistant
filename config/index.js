require('dotenv').config();

console.log('Loading configuration...');

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    modularPort: process.env.MODULAR_PORT || 3001, // Separate port for modular server
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  
  // Google Maps API configuration
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    routesApiUrl: 'https://routes.googleapis.com/directions/v2:computeRoutes',
    placesApiUrl: 'https://places.googleapis.com/v1/places:searchText'
  },
  
  // Gemini API configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // Security configuration
  security: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://maps.googleapis.com", "https://maps.gstatic.com"],
        connectSrc: ["'self'", "https://maps.googleapis.com", "https://*.googleapis.com", "https://places.googleapis.com", "https://maps.googleapis.com/maps/api/mapsjs/gen_204"],
        fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    }
  }
};

// Validate required configuration
if (!config.googleMaps.apiKey) {
  console.error('ERROR: GOOGLE_MAPS_API_KEY environment variable is required');
  process.exit(1);
}

if (!config.gemini.apiKey) {
  console.log('⚠️  GEMINI_API_KEY not found - intelligent stop selection will be disabled');
} else {
  console.log('Gemini API key loaded successfully');
}

console.log('Google Maps API key loaded successfully (will be used for Routes API)');
console.log('Configuration loaded successfully');

module.exports = config;
