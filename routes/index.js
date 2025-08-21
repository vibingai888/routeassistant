const express = require('express');
const path = require('path');
const { 
  planRoute, 
  planRouteWithWaypoints, 
  searchPlacesAlongRoute, 
  healthCheck 
} = require('./routeHandlers');

console.log('Setting up API routes...');

const router = express.Router();

// Serve static files from public directory
router.use(express.static(path.join(__dirname, '../public')));

// Serve the main frontend page
router.get('/', (req, res) => {
  console.log('Frontend page requested');
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Health check endpoint
router.get('/health', healthCheck);

// Route planning endpoint
router.post('/api/route', planRoute);

// Alternative route endpoint with waypoints
router.post('/api/route/waypoints', planRouteWithWaypoints);

// Search places along route endpoint
router.post('/api/places/search', searchPlacesAlongRoute);

// 404 handler for API routes
router.use('/api/*', (req, res) => {
  console.log(`API route not found: ${req.originalUrl}`);
  res.status(404).json({ error: 'API route not found' });
});

// 404 handler for all other routes
router.use('*', (req, res) => {
  console.log(`Route not found: ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found' });
});

console.log('API routes configured successfully');

module.exports = router;
