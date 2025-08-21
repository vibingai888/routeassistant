const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Route Assistant Backend Server
// Uses Google Maps Routes API for route computation and Google Places API for location search
// Routes API provides more accurate traffic-aware routing compared to the legacy Directions API

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

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.log('⚠️  GEMINI_API_KEY not found - intelligent stop selection will be disabled');
} else {
  console.log('Gemini API key loaded successfully');
}

console.log('Google Maps API key loaded successfully (will be used for Routes API)');

// Helper function to convert seconds to approximate minutes
function convertSecondsToMinutes(seconds) {
  if (!seconds) return null;
  
  // Remove 's' suffix if present and convert to number
  const secondsNum = typeof seconds === 'string' ? parseFloat(seconds.replace('s', '')) : seconds;
  
  if (isNaN(secondsNum)) return null;
  
  // Convert to minutes with 1 decimal place
  const minutes = (secondsNum / 60).toFixed(1);
  return parseFloat(minutes);
}

// Function to call Gemini API for intelligent stop selection
async function getIntelligentStops(places, origin, query) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not available');
  }
  
  // Prepare the prompt for Gemini
  const prompt = `You are a travel assistant that helps drivers select the best places to stop along a route.  

You will be given:
- Start and end location, total route distance/time.
- A list of candidate places (gas stations, restaurants, charging stations, rest areas, etc.), each with metadata such as:
  - name, address, rating, userRatingCount, isOpen, detourTime (seconds), detourDistance (meters), directionsUri, location (latitude/longitude).

Your task:
1. Analyze the route and create a comprehensive stops plan:
   - Break the route into logical segments based on travel time
   - For each segment, recommend 1-2 optimal places
   - Ensure recommendations are distributed across the entire route, not clustered in one area

2. Ranking Criteria (order of importance):
   a. Place must be open.  
   b. Lowest detour time/distance.  
   c. Higher rating.  
   d. More user ratings (reliability).  
   e. (Optional) Price level if provided.  

3. Segment Strategy:
   - Create segments of 30-45 minutes each
   - Distribute recommendations evenly across segments
   - Avoid clustering all recommendations in early segments
   - Consider the full route length for proper distribution

4. Provide a **structured JSON response** in this format:

{
  "stopsPlan": [
    {
      "segment": "0–45 min",
      "recommendedPlaces": [
        {
          "name": "...",
          "address": "...",
          "rating": 4.2,
          "userRatingCount": 150,
          "detourTimeMinutes": 6.5,
          "detourDistanceKm": 2.3,
          "directionsUri": "...",
          "location": {
            "latitude": 37.1234,
            "longitude": -122.5678
          },
          "reasoning": "Shortest detour with good rating and many reviews."
        }
      ]
    },
    {
      "segment": "45–90 min",
      "recommendedPlaces": [...]
    }
  ]
}

5. Only output valid JSON. No extra text.

origin location: ${origin.latitude}, ${origin.longitude}
stops list: ${JSON.stringify(places, null, 2)}`;

  try {
    console.log('Sending request to Gemini API...');
    
    const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      }
    });
    
    console.log('Gemini API response received');
    
    if (response.data && response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content) {
      const geminiResponse = response.data.candidates[0].content.parts[0].text;
      console.log('Gemini response text:', geminiResponse);
      
      // Try to extract JSON from the response
      const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonResponse = JSON.parse(jsonMatch[0]);
        console.log('Successfully parsed Gemini JSON response');
        
        // Enhance the response by adding missing location data from original places
        if (jsonResponse.stopsPlan) {
          jsonResponse.stopsPlan.forEach(segment => {
            if (segment.recommendedPlaces) {
              segment.recommendedPlaces.forEach(recommendedPlace => {
                // Find the original place data to get location and other details
                const originalPlace = places.find(place => 
                  place.name === recommendedPlace.name && 
                  place.address === recommendedPlace.address
                );
                
                if (originalPlace) {
                  // Add missing data from the original place
                  recommendedPlace.location = originalPlace.location;
                  recommendedPlace.id = originalPlace.id;
                  recommendedPlace.type = originalPlace.type;
                  recommendedPlace.isOpen = originalPlace.isOpen;
                  recommendedPlace.priceLevel = originalPlace.priceLevel;
                  
                  // Ensure detourTimeMinutes is a number
                  if (recommendedPlace.detourTimeMinutes && typeof recommendedPlace.detourTimeMinutes === 'string') {
                    recommendedPlace.detourTimeMinutes = parseFloat(recommendedPlace.detourTimeMinutes);
                  }
                  
                  // Ensure detourDistanceKm is a number
                  if (recommendedPlace.detourDistanceKm && typeof recommendedPlace.detourDistanceKm === 'string') {
                    recommendedPlace.detourDistanceKm = parseFloat(recommendedPlace.detourDistanceKm);
                  }
                }
              });
            }
          });
        }
        
        return jsonResponse;
      } else {
        console.log('No valid JSON found in Gemini response');
        return null;
      }
    } else {
      console.log('Invalid Gemini API response structure');
      return null;
    }
    
  } catch (error) {
    console.error('Error calling Gemini API:', error.message);
    throw error;
  }
}

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
    const { origin, destination, mode = 'DRIVE' } = req.body;
    
    // Validate input
    if (!origin || !destination) {
      console.log('Invalid request: Missing origin or destination');
      return res.status(400).json({ 
        error: 'Origin and destination are required' 
      });
    }
    
    console.log(`Planning route from ${origin} to ${destination} using ${mode} mode`);
    
    // Convert mode to Routes API format
    const travelMode = mode === 'driving' ? 'DRIVE' : 
                      mode === 'walking' ? 'WALK' : 
                      mode === 'bicycling' ? 'BICYCLE' : 
                      mode === 'transit' ? 'TRANSIT' : 'DRIVE';
    
    // Prepare request payload for Routes API
    const requestPayload = {
      origin: {
        location: {
          latLng: {
            latitude: parseFloat(origin.split(',')[0]),
            longitude: parseFloat(origin.split(',')[1])
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: parseFloat(destination.split(',')[0]),
            longitude: parseFloat(destination.split(',')[1])
          }
        }
      },
      travelMode: travelMode,
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      polylineQuality: "OVERVIEW"
    };
    
    console.log('Calling Google Routes API with payload:', JSON.stringify(requestPayload, null, 2));
    
    // Call Google Routes API
    const response = await axios.post('https://routes.googleapis.com/directions/v2:computeRoutes', requestPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.bounds,routes.viewport,routes.travelAdvisory'
      }
    });
    
    console.log('Google Routes API response received');
    
    const data = response.data;
    
    if (data.routes && data.routes.length > 0) {
      console.log('Route found successfully');
      console.log('Route data structure:', JSON.stringify(route, null, 2));
      
      // Extract route information from Routes API response
      const route = data.routes[0];
      const leg = route.legs[0];
      console.log('Leg data structure:', JSON.stringify(leg, null, 2));
      
      const routeInfo = {
        origin: `${leg.startLocation.latLng.latitude},${leg.startLocation.latLng.longitude}`,
        destination: `${leg.endLocation.latLng.latitude},${leg.endLocation.latLng.longitude}`,
        distance: `${(route.distanceMeters / 1000).toFixed(1)} km`,
        duration: `${Math.round(route.duration.replace('s', '') / 60)} mins`,
        durationInSeconds: parseInt(route.duration.replace('s', '')),
        distanceInMeters: route.distanceMeters,
        mode: travelMode.toLowerCase(),
        steps: leg.steps ? leg.steps.map(step => ({
          instruction: step.navigationInstruction?.instructions || 'Continue',
          distance: `${(step.staticDuration / 1000).toFixed(1)} km`,
          duration: `${Math.round(step.staticDuration / 60)} mins`
        })) : [],
        polyline: route.polyline.encodedPolyline,
        bounds: route.bounds,
        viewport: route.viewport
      };
      
      console.log(`Route details: ${routeInfo.distance} in ${routeInfo.duration}`);
      res.json(routeInfo);
      
    } else {
      console.log('No routes found in Routes API response');
      res.status(400).json({ 
        error: 'Route not found',
        details: 'No routes returned from Google Routes API'
      });
    }
    
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
});

// Alternative route endpoint with waypoints
app.post('/api/route/waypoints', async (req, res) => {
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
    
    // Convert mode to Routes API format
    const travelMode = mode === 'driving' ? 'DRIVE' : 
                      mode === 'walking' ? 'WALK' : 
                      mode === 'bicycling' ? 'BICYCLE' : 
                      mode === 'transit' ? 'TRANSIT' : 'DRIVE';
    
    // Prepare request payload for Routes API with waypoints
    const requestPayload = {
      origin: {
        location: {
          latLng: {
            latitude: parseFloat(origin.split(',')[0]),
            longitude: parseFloat(origin.split(',')[1])
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: parseFloat(destination.split(',')[0]),
            longitude: parseFloat(destination.split(',')[1])
          }
        }
      },
      travelMode: travelMode,
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      polylineQuality: "OVERVIEW"
    };
    
    // Add intermediate waypoints if provided
    if (waypoints.length > 0) {
      requestPayload.intermediates = waypoints.map(waypoint => ({
        location: {
          latLng: {
            latitude: parseFloat(waypoint.split(',')[0]),
            longitude: parseFloat(waypoint.split(',')[1])
          }
        }
      }));
    }
    
    console.log('Calling Google Routes API with waypoints payload:', JSON.stringify(requestPayload, null, 2));
    
    // Call Google Routes API
    const response = await axios.post('https://routes.googleapis.com/directions/v2:computeRoutes', requestPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.bounds,routes.viewport,routes.travelAdvisory'
      }
    });
    
    console.log('Google Routes API response received for waypoints route');
    
    const data = response.data;
    
    if (data.routes && data.routes.length > 0) {
      console.log('Route with waypoints found successfully');
      
      const route = data.routes[0];
      const legs = route.legs;
      
      const routeInfo = {
        origin: `${legs[0].startLocation.latLng.latitude},${legs[0].startLocation.latLng.longitude}`,
        destination: `${legs[legs.length - 1].endLocation.latLng.latitude},${legs[legs.length - 1].endLocation.latLng.longitude}`,
        waypoints: waypoints,
        totalDistance: route.distanceMeters,
        totalDuration: parseInt(route.duration.replace('s', '')),
        mode: travelMode.toLowerCase(),
        legs: legs.map(leg => ({
          start: `${leg.startLocation.latLng.latitude},${leg.startLocation.latLng.longitude}`,
          end: `${leg.endLocation.latLng.latitude},${leg.endLocation.latLng.longitude}`,
          distance: `${(leg.staticDuration / 1000).toFixed(1)} km`,
          duration: `${Math.round(leg.staticDuration / 60)} mins`
        })),
        polyline: route.polyline.encodedPolyline
      };
      
      console.log(`Multi-leg route: ${(routeInfo.totalDistance / 1000).toFixed(1)}km in ${Math.round(routeInfo.totalDuration / 60)}min`);
      res.json(routeInfo);
      
    } else {
      console.log('No routes found in Routes API response for waypoints');
      res.status(400).json({ 
        error: 'Route not found',
        details: 'No routes returned from Google Routes API'
      });
    }
    
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
});

// Search places along route endpoint
app.post('/api/places/search', async (req, res) => {
  console.log('Places search along route request received:', req.body);
  
  try {
    const { 
      textQuery, 
      encodedPolyline, 
      maxResultCount = 20, 
      openNow = false, 
      includedType = null,
      segment = null,
      segmentInfo = null
    } = req.body;
    
    // Validate input
    if (!textQuery || !encodedPolyline) {
      console.log('Invalid request: Missing textQuery or encodedPolyline');
      return res.status(400).json({ 
        error: 'Text query and encoded polyline are required' 
      });
    }
    
    console.log(`Searching for "${textQuery}" along route with ${maxResultCount} max results`);
    
    // Build search payload for Google Places API Text Search (New)
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
    
    // Always include routingParameters.origin for routing summaries
    // If origin is provided in request, use it; otherwise, extract from polyline start
    let routingOrigin = req.body.origin;
    
    if (!routingOrigin || !routingOrigin.latitude || !routingOrigin.longitude) {
      console.log('No origin provided, extracting start point from polyline for routing calculations');
      // For now, we'll require origin to be provided since extracting from polyline is complex
      // Users should provide origin coordinates for accurate routing summaries
      return res.status(400).json({
        error: 'Origin coordinates (latitude and longitude) are required for routing summaries'
      });
    }
    
    // Add routing parameters for detour time calculations
    searchPayload.routingParameters = {
      origin: {
        latitude: routingOrigin.latitude,
        longitude: routingOrigin.longitude
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL"
    };
    
    if (includedType) {
      searchPayload.includedType = includedType;
    }
    
    // If this is a segment-based search, adjust parameters for better diversity
    if (segment !== null && segmentInfo) {
        console.log(`Segment-based search for segment ${segment}: ${segmentInfo.startTimeFormatted}`);
        
        // Adjust max results for segments to ensure variety
        searchPayload.maxResultCount = Math.max(maxResultCount, 20);
        
        // Add segment context to help with diversity
        searchPayload.textQuery = `${textQuery} ${segmentInfo.startTimeFormatted} segment`;
        
        // Add location bias to focus on different areas for different segments
        if (segmentInfo.startTime && segmentInfo.endTime) {
            // Calculate a rough location along the route for this segment
            const segmentProgress = (segmentInfo.startTime + segmentInfo.endTime) / 2;
            const totalDuration = 14138; // This should be passed from frontend or calculated
            
            // Add location bias to focus on different areas
            searchPayload.locationBias = {
                circle: {
                    center: {
                        latitude: 37.4219 + (segmentProgress / totalDuration) * 0.5, // Rough approximation
                        longitude: -122.0841 + (segmentProgress / totalDuration) * 0.3
                    },
                    radius: 50000.0 // 50km radius
                }
            };
        }
    } else {
        // For non-segment searches, request more results to get better variety
        searchPayload.maxResultCount = Math.max(maxResultCount, 30);
    }
    
    console.log('Calling Google Places API Text Search (New) with routing parameters...');
    console.log('Routing origin:', routingOrigin);
    console.log('Full search payload:', JSON.stringify(searchPayload, null, 2));
    
    // Call Google Places API Text Search (New) with routingSummaries in field mask
    const response = await axios.post('https://places.googleapis.com/v1/places:searchText', searchPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.rating,places.userRatingCount,places.currentOpeningHours,places.priceLevel,routingSummaries'
      }
    });
    
    console.log('Google Places API response received with routing summaries');
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Response data keys:', Object.keys(response.data));
    
    const data = response.data;
    
    if (data.places && data.places.length > 0) {
      console.log(`Found ${data.places.length} places along the route`);
      console.log('Places data structure:', JSON.stringify(data.places[0], null, 2));
      
      if (data.routingSummaries) {
        console.log(`Routing summaries found: ${data.routingSummaries.length} entries`);
        console.log('First routing summary:', JSON.stringify(data.routingSummaries[0], null, 2));
      } else {
        console.log('No routing summaries in response - this might indicate an API issue');
        console.log('Available fields in response:', Object.keys(data));
      }
      
      // Process and format the places data with routing summaries
      const places = data.places.map((place, index) => {
        const routingSummary = data.routingSummaries && data.routingSummaries[index];
        
        // Extract detour time and distance information
        let detourTime = null;
        let detourDistance = null;
        let directionsUri = null;
        let detourTimeMinutes = null;
        
        if (routingSummary && routingSummary.legs && routingSummary.legs.length > 0) {
          const leg = routingSummary.legs[0];
          detourTime = leg.duration || null;
          detourDistance = leg.distanceMeters || null;
          directionsUri = routingSummary.directionsUri || null;
          
          // Convert detour time to minutes
          detourTimeMinutes = convertSecondsToMinutes(detourTime);
          
          console.log(`Place ${index + 1}: ${place.displayName?.text || 'Unknown'} - Detour: ${detourTime} (${detourDistance}m) - ${detourTimeMinutes} minutes`);
        }
        
        return {
          id: place.id,
          name: place.displayName?.text || 'Unknown',
          address: place.formattedAddress || 'Address not available',
          location: place.location,
          type: place.primaryType || 'Unknown',
          rating: place.rating || null,
          userRatingCount: place.userRatingCount || 0,
          isOpen: place.currentOpeningHours?.openNow || false,
          priceLevel: place.priceLevel || null,
          // Add routing information
          detourTime: detourTime,
          detourDistance: detourDistance,
          detourDistanceFormatted: detourDistance ? `${(detourDistance / 1000).toFixed(1)} km` : null,
          detourTimeMinutes: detourTimeMinutes,
          directionsUri: directionsUri
        };
      });
      
      console.log(`Processed ${places.length} places with routing summaries`);
      
      // If Gemini API is available, use it for intelligent stop selection
      let intelligentStops = null;
      if (GEMINI_API_KEY) {
        try {
          console.log('Calling Gemini API for intelligent stop selection...');
          intelligentStops = await getIntelligentStops(places, routingOrigin, textQuery);
          console.log('Gemini API response received for intelligent stop selection');
        } catch (error) {
          console.error('Error calling Gemini API:', error.message);
          console.log('Falling back to showing all places');
        }
      }
      
      res.json({
        query: textQuery,
        totalResults: places.length,
        origin: routingOrigin,
        places: places,
        intelligentStops: intelligentStops,
        segment: segment,
        segmentInfo: segmentInfo
      });
      
    } else {
      console.log('No places found along the route');
      res.json({
        query: textQuery,
        totalResults: 0,
        origin: routingOrigin,
        places: [],
        intelligentStops: null,
        segment: segment,
        segmentInfo: segmentInfo
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
    console.log(`🗺️  Route planning (Routes API): http://localhost:${PORT}/api/route`);
    console.log(`🔄 Route with waypoints (Routes API): http://localhost:${PORT}/api/route/waypoints`);
    console.log(`⛽ Places search along route: http://localhost:${PORT}/api/places/search`);
  });
}

module.exports = { app, server };
