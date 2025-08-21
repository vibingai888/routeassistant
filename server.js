const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

console.log('Starting Route Assistant Backend Server...');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      connectSrc: ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com", "https://*.googleapis.com", "https://places.googleapis.com", "https://maps.googleapis.com/maps/api/mapsjs/gen_204"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));
app.use(cors());
app.use(express.json());

console.log('Security middleware configured');

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

console.log('Static file serving configured');

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

console.log('Rate limiting configured');

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
  console.error('ERROR: GOOGLE_MAPS_API_KEY environment variable is required');
  process.exit(1);
}

console.log('Google Maps API key loaded successfully');

// Serve the main frontend page
app.get('/', (req, res) => {
  console.log('Frontend page requested');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check endpoint called');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Route Assistant Backend'
  });
});

// Route planning endpoint
app.post('/api/route', async (req, res) => {
  console.log('Route planning request received:', req.body);
  
  try {
    const { origin, destination, mode = 'driving' } = req.body;
    
    // Validate input
    if (!origin || !destination) {
      console.log('Invalid request: Missing origin or destination');
      return res.status(400).json({ 
        error: 'Origin and destination are required' 
      });
    }
    
    console.log(`Planning route from ${origin} to ${destination} using ${mode} mode`);
    
    // Call Google Maps Directions API
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: origin,
        destination: destination,
        mode: mode,
        key: GOOGLE_MAPS_API_KEY
      }
    });
    
    console.log('Google Maps API response received');
    
    const data = response.data;
    
    if (data.status === 'OK') {
      console.log('Route found successfully');
      
      // Extract route information
      const route = data.routes[0];
      const legs = route.legs[0];
      
      const routeInfo = {
        origin: legs.start_address,
        destination: legs.end_address,
        distance: legs.distance.text,
        duration: legs.duration.text,
        durationInSeconds: legs.duration.value,
        distanceInMeters: legs.distance.value,
        mode: mode,
        steps: legs.steps.map(step => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance.text,
          duration: step.duration.text
        })),
        polyline: route.overview_polyline.points,
        bounds: route.bounds
      };
      
      console.log(`Route details: ${routeInfo.distance} in ${routeInfo.duration}`);
      res.json(routeInfo);
      
    } else {
      console.log(`Google Maps API error: ${data.status}`);
      res.status(400).json({ 
        error: `Route not found: ${data.status}`,
        details: data.error_message || 'Unknown error'
      });
    }
    
  } catch (error) {
    console.error('Error in route planning:', error.message);
    
    if (error.response) {
      console.error('Google Maps API error response:', error.response.data);
      res.status(error.response.status).json({
        error: 'Google Maps API error',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// Alternative route endpoint with waypoints
app.post('/api/route/waypoints', async (req, res) => {
  console.log('Route with waypoints request received:', req.body);
  
  try {
    const { origin, destination, waypoints = [], mode = 'driving' } = req.body;
    
    if (!origin || !destination) {
      console.log('Invalid request: Missing origin or destination');
      return res.status(400).json({ 
        error: 'Origin and destination are required' 
      });
    }
    
    console.log(`Planning route with ${waypoints.length} waypoints from ${origin} to ${destination}`);
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: origin,
        destination: destination,
        waypoints: waypoints.join('|'),
        mode: mode,
        key: GOOGLE_MAPS_API_KEY
      }
    });
    
    console.log('Google Maps API response received for waypoints route');
    
    const data = response.data;
    
    if (data.status === 'OK') {
      console.log('Route with waypoints found successfully');
      
      const route = data.routes[0];
      const legs = route.legs;
      
      const routeInfo = {
        origin: legs[0].start_address,
        destination: legs[legs.length - 1].end_address,
        waypoints: waypoints,
        totalDistance: legs.reduce((sum, leg) => sum + leg.distance.value, 0),
        totalDuration: legs.reduce((sum, leg) => sum + leg.duration.value, 0),
        mode: mode,
        legs: legs.map(leg => ({
          start: leg.start_address,
          end: leg.end_address,
          distance: leg.distance.text,
          duration: leg.duration.text
        })),
        polyline: route.overview_polyline.points
      };
      
      console.log(`Multi-leg route: ${(routeInfo.totalDistance / 1000).toFixed(1)}km in ${Math.round(routeInfo.totalDuration / 60)}min`);
      res.json(routeInfo);
      
    } else {
      console.log(`Google Maps API error for waypoints: ${data.status}`);
      res.status(400).json({ 
        error: `Route not found: ${data.status}`,
        details: data.error_message || 'Unknown error'
      });
    }
    
  } catch (error) {
    console.error('Error in waypoints route planning:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Google Maps API error',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// Search places along route endpoint
app.post('/api/places/search', async (req, res) => {
  console.log('Places search along route request received:', req.body);
  
  try {
    const { 
      textQuery, 
      encodedPolyline, 
      origin = null, 
      maxResultCount = 20, 
      openNow = false,
      includedType = null 
    } = req.body;
    
    // Validate input
    if (!textQuery || !encodedPolyline) {
      console.log('Invalid request: Missing textQuery or encodedPolyline');
      return res.status(400).json({ 
        error: 'Text query and encoded polyline are required' 
      });
    }
    
    console.log(`Searching for "${textQuery}" along route with ${maxResultCount} max results`);
    
    // Prepare the request payload for Google Places API Text Search (New)
    const searchPayload = {
      textQuery: textQuery,
      searchAlongRouteParameters: {
        polyline: {
          encodedPolyline: encodedPolyline
        }
      },
      maxResultCount: maxResultCount,
      openNow: openNow
    };
    
    // Add optional parameters if provided
    if (origin && origin.latitude && origin.longitude) {
      searchPayload.routingParameters = {
        origin: {
          latitude: origin.latitude,
          longitude: origin.longitude
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE_OPTIMAL"
      };
    }
    
    if (includedType) {
      searchPayload.includedType = includedType;
    }
    
    console.log('Calling Google Places API Text Search (New)...');
    
    // Call Google Places API Text Search (New)
    const response = await axios.post('https://places.googleapis.com/v1/places:searchText', searchPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.rating,places.userRatingCount,places.currentOpeningHours,places.priceLevel,routingSummary'
      }
    });
    
    console.log('Google Places API response received');
    
    const data = response.data;
    
    if (data.places && data.places.length > 0) {
      console.log(`Found ${data.places.length} places along the route`);
      
      // Process and format the places data
      const places = data.places.map(place => ({
        id: place.id,
        name: place.displayName?.text || 'Unknown',
        address: place.formattedAddress || 'Address not available',
        location: place.location,
        type: place.primaryType || 'Unknown',
        rating: place.rating || null,
        userRatingCount: place.userRatingCount || 0,
        isOpen: place.currentOpeningHours?.openNow || false,
        priceLevel: place.priceLevel || null,
        routingSummary: place.routingSummary
      }));
      
      res.json({
        query: textQuery,
        totalResults: places.length,
        places: places
      });
      
    } else {
      console.log('No places found along the route');
      res.json({
        query: textQuery,
        totalResults: 0,
        places: []
      });
    }
    
  } catch (error) {
    console.error('Error in places search:', error.message);
    
    if (error.response) {
      console.error('Google Places API error response:', error.response.data);
      res.status(error.response.status).json({
        error: 'Google Places API error',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`Route not found: ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found' });
});

// Start server only if not in test mode
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`🚀 Route Assistant Backend Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🗺️  Route planning: http://localhost:${PORT}/api/route`);
    console.log(`🔄 Route with waypoints: http://localhost:${PORT}/api/route/waypoints`);
    console.log(`⛽ Places search along route: http://localhost:${PORT}/api/places/search`);
  });
}

module.exports = { app, server };
