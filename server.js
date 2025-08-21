const express = require('express');
const config = require('./config');
const securityMiddleware = require('./middleware/security');
const rateLimitMiddleware = require('./middleware/rateLimit');
const routes = require('./routes');

console.log('Starting Route Assistant Backend Server...');

const app = express();
const PORT = config.server.port;

// Apply middleware
app.use(express.json());
securityMiddleware(app);
app.use(rateLimitMiddleware);

console.log('Middleware configured successfully');

// Apply routes
app.use('/', routes);

console.log('Routes configured successfully');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: config.server.nodeEnv === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server only if not in test mode
let server;
if (config.server.nodeEnv !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`🚀 Route Assistant Backend Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🗺️  Route planning (Routes API): http://localhost:${PORT}/api/route`);
    console.log(`🔄 Route with waypoints (Routes API): http://localhost:${PORT}/api/route/waypoints`);
    console.log(`⛽ Places search along route: http://localhost:${PORT}/api/places/search`);
    console.log(`🔧 Environment: ${config.server.nodeEnv}`);
    console.log(`📊 Rate limiting: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 60000} minutes`);
  });
}

module.exports = { app, server };
