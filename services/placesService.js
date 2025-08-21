const axios = require('axios');
const config = require('../config');
const { convertSecondsToMinutes } = require('../utils/timeUtils');

console.log('Loading Places API service...');

class PlacesService {
  constructor() {
    this.apiKey = config.googleMaps.apiKey;
    this.apiUrl = config.googleMaps.placesApiUrl;
  }

  /**
   * Search for places along a route
   * @param {Object} searchParams - Search parameters
   * @returns {Object} - Search results with places and routing information
   */
  async searchPlacesAlongRoute(searchParams) {
    const { 
      textQuery, 
      encodedPolyline, 
      maxResultCount = 20, 
      openNow = false, 
      includedType = null,
      segment = null,
      segmentInfo = null,
      origin
    } = searchParams;
    
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
    
    // Add routing parameters for detour time calculations
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Routing origin:', origin);
      console.log('Full search payload:', JSON.stringify(searchPayload, null, 2));
    }
    
    try {
      // Call Google Places API Text Search (New) with routingSummaries in field mask
      const response = await axios.post(this.apiUrl, searchPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.rating,places.userRatingCount,places.currentOpeningHours,places.priceLevel,routingSummaries'
        }
      });
      
      console.log('Google Places API response received with routing summaries');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response data keys:', Object.keys(response.data));
      }
      
      return this.processPlacesResponse(response.data, origin, textQuery, segment, segmentInfo);
      
    } catch (error) {
      console.error('Error calling Places API:', error.message);
      throw error;
    }
  }

  /**
   * Process places response from Places API
   * @param {Object} data - API response data
   * @param {Object} origin - Origin coordinates
   * @param {string} textQuery - Search query
   * @param {number} segment - Segment number
   * @param {Object} segmentInfo - Segment information
   * @returns {Object} - Processed places data
   */
  processPlacesResponse(data, origin, textQuery, segment, segmentInfo) {
    if (!data.places || data.places.length === 0) {
      console.log('No places found along the route');
      return {
        query: textQuery,
        totalResults: 0,
        origin: origin,
        places: [],
        intelligentStops: null,
        segment: segment,
        segmentInfo: segmentInfo
      };
    }
    
    console.log(`Found ${data.places.length} places along the route`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Places data structure:', JSON.stringify(data.places[0], null, 2));
    }
    
    if (data.routingSummaries) {
      console.log(`Routing summaries found: ${data.routingSummaries.length} entries`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('First routing summary:', JSON.stringify(data.routingSummaries[0], null, 2));
      }
    } else {
      console.log('No routing summaries in response - this might indicate an API issue');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Available fields in response:', Object.keys(data));
      }
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
    
    return {
      query: textQuery,
      totalResults: places.length,
      origin: origin,
      places: places,
      intelligentStops: null, // Will be populated by Gemini service if available
      segment: segment,
      segmentInfo: segmentInfo
    };
  }
}

console.log('Places API service loaded successfully');

module.exports = PlacesService;
