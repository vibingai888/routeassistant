const RoutesService = require('../services/routesService');
const PlacesService = require('../services/placesService');
const GeminiService = require('../services/geminiService');

console.log('Loading route handlers...');

// Initialize services
const routesService = new RoutesService();
const placesService = new PlacesService();
const geminiService = new GeminiService();

/**
 * Route planning endpoint
 */
async function planRoute(req, res) {
  console.log('Route planning request received:', req.body);
  
  try {
    const { origin, destination, mode = 'DRIVE' } = req.body;
    
    // Validate input
    if (!origin || !destination) {
      console.log('Invalid request: Missing origin or destination');
      return res.status(400).json({ 
        error: 'Origin and destination are required' 
      });
    }
    
    console.log(`Planning route from ${origin} to ${destination} using ${mode} mode`);
    
    // Call Routes service
    const routeInfo = await routesService.computeRoute(origin, destination, mode);
    
    console.log(`Route details: ${routeInfo.distance} in ${routeInfo.duration}`);
    res.json(routeInfo);
    
  } catch (error) {
    console.error('Error in route planning:', error.message);
    
    if (error.response) {
      console.error('Google Routes API error response:', error.response.data);
      res.status(error.response.status).json({
        error: 'Google Routes API error',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
}

/**
 * Route with waypoints endpoint
 */
async function planRouteWithWaypoints(req, res) {
  console.log('Route with waypoints request received:', req.body);
  
  try {
    const { origin, destination, waypoints = [], mode = 'DRIVE' } = req.body;
    
    if (!origin || !destination) {
      console.log('Invalid request: Missing origin or destination');
      return res.status(400).json({ 
        error: 'Origin and destination are required' 
      });
    }
    
    console.log(`Planning route with ${waypoints.length} waypoints from ${origin} to ${destination}`);
    
    // Call Routes service with waypoints
    const routeInfo = await routesService.computeRouteWithWaypoints(origin, destination, waypoints, mode);
    
    console.log(`Multi-leg route: ${(routeInfo.totalDistance / 1000).toFixed(1)}km in ${Math.round(routeInfo.totalDuration / 60)}min`);
    res.json(routeInfo);
    
  } catch (error) {
    console.error('Error in waypoints route planning:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Google Routes API error',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
}

/**
 * Search places along route endpoint
 */
async function searchPlacesAlongRoute(req, res) {
  console.log('Places search along route request received:', req.body);
  
  try {
    const { 
      textQuery, 
      encodedPolyline, 
      maxResultCount = 20, 
      openNow = false, 
      includedType = null,
      segment = null,
      segmentInfo = null,
      origin
    } = req.body;
    
    // Validate input
    if (!textQuery || !encodedPolyline) {
      console.log('Invalid request: Missing textQuery or encodedPolyline');
      return res.status(400).json({ 
        error: 'Text query and encoded polyline are required' 
      });
    }
    
    if (!origin || !origin.latitude || !origin.longitude) {
      console.log('No origin provided, extracting start point from polyline for routing calculations');
      return res.status(400).json({
        error: 'Origin coordinates (latitude and longitude) are required for routing summaries'
      });
    }
    
    console.log(`Searching for "${textQuery}" along route with ${maxResultCount} max results`);
    
    // Call Places service
    const searchParams = {
      textQuery,
      encodedPolyline,
      maxResultCount,
      openNow,
      includedType,
      segment,
      segmentInfo,
      origin
    };
    
    const placesResult = await placesService.searchPlacesAlongRoute(searchParams);
    
    // If Gemini API is available, use it for intelligent stop selection
    let intelligentStops = null;
    if (geminiService.isAvailable()) {
      try {
        console.log('Calling Gemini API for intelligent stop selection...');
        intelligentStops = await geminiService.getIntelligentStops(placesResult.places, origin, textQuery);
        console.log('Gemini API response received for intelligent stop selection');
        
        // Add intelligent stops to the result
        placesResult.intelligentStops = intelligentStops;
        
      } catch (error) {
        console.error('Error calling Gemini API:', error.message);
        console.log('Falling back to showing all places');
      }
    }
    
    res.json(placesResult);
    
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
}

/**
 * Health check endpoint
 */
function healthCheck(req, res) {
  console.log('Health check endpoint called');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Route Assistant Backend',
    version: '2.0.0',
    apis: {
      routes: 'Google Maps Routes API',
      places: 'Google Places API',
      gemini: geminiService.isAvailable() ? 'Gemini AI API' : 'Not Available'
    }
  });
}

console.log('Route handlers loaded successfully');

module.exports = {
  planRoute,
  planRouteWithWaypoints,
  searchPlacesAlongRoute,
  healthCheck
};
