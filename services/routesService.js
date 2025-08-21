const axios = require('axios');
const config = require('../config');
const { formatDistance, formatDuration } = require('../utils/timeUtils');

console.log('Loading Routes API service...');

class RoutesService {
  constructor() {
    this.apiKey = config.googleMaps.apiKey;
    this.apiUrl = config.googleMaps.routesApiUrl;
  }

  /**
   * Convert travel mode to Routes API format
   * @param {string} mode - Travel mode from request
   * @returns {string} - Routes API travel mode
   */
  convertTravelMode(mode) {
    const modeMap = {
      'driving': 'DRIVE',
      'walking': 'WALK',
      'bicycling': 'BICYCLE',
      'transit': 'TRANSIT'
    };
    return modeMap[mode] || 'DRIVE';
  }

  /**
   * Check if a string is a coordinate pair
   * @param {string} input - Input string to check
   * @returns {boolean} - True if it's a coordinate pair
   */
  isCoordinatePair(input) {
    // Check if input matches pattern like "37.1234,-122.5678"
    const coordPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
    return coordPattern.test(input);
  }

  /**
   * Parse coordinate string to latLng object
   * @param {string} coordString - Coordinate string in "lat,lng" format
   * @returns {Object} - Parsed coordinates
   */
  parseCoordinates(coordString) {
    const [lat, lng] = coordString.split(',').map(coord => parseFloat(coord.trim()));
    return { latitude: lat, longitude: lng };
  }

  /**
   * Geocode an address to get coordinates
   * @param {string} address - Address to geocode
   * @returns {Promise<Object>} - Promise resolving to coordinates
   */
  async geocodeAddress(address) {
    console.log(`Geocoding address: ${address}`);
    
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: address,
          key: this.apiKey
        }
      });
      
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        console.log(`Geocoded to: ${location.lat}, ${location.lng}`);
        return { latitude: location.lat, longitude: location.lng };
      } else if (response.data.status === 'REQUEST_DENIED') {
        console.log('Geocoding API not enabled, trying Places API fallback...');
        return await this.geocodeWithPlacesAPI(address);
      } else {
        console.error('Geocoding failed with status:', response.data.status);
        throw new Error(`Geocoding failed: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error.message);
      
      // Try Places API as fallback
      console.log('Trying Places API fallback due to geocoding error...');
      try {
        return await this.geocodeWithPlacesAPI(address);
      } catch (placesError) {
        throw new Error(`Failed to geocode address: ${address} - Both Geocoding API and Places API failed`);
      }
    }
  }

  /**
   * Geocode an address using Places API as fallback
   * @param {string} address - Address to geocode
   * @returns {Promise<Object>} - Promise resolving to coordinates
   */
  async geocodeWithPlacesAPI(address) {
    console.log(`Geocoding with Places API: ${address}`);
    
    try {
      const response = await axios.post('https://places.googleapis.com/v1/places:searchText', {
        textQuery: address,
        maxResultCount: 1
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.location'
        }
      });
      
      if (response.data.places && response.data.places.length > 0) {
        const location = response.data.places[0].location;
        console.log(`Places API geocoded to: ${location.latitude}, ${location.longitude}`);
        return { latitude: location.latitude, longitude: location.longitude };
      } else {
        throw new Error('No results from Places API');
      }
    } catch (error) {
      console.error('Places API geocoding error:', error.message);
      throw error;
    }
  }

  /**
   * Create waypoint object for Routes API
   * @param {string} input - Input string (coordinates or address)
   * @returns {Promise<Object>} - Promise resolving to waypoint object
   */
  async createWaypoint(input) {
    let coordinates;
    
    if (this.isCoordinatePair(input)) {
      // Input is already coordinates
      coordinates = this.parseCoordinates(input);
    } else {
      // Input is an address, need to geocode it
      coordinates = await this.geocodeAddress(input);
    }
    
    return {
      location: {
        latLng: coordinates
      }
    };
  }

  /**
   * Compute route between origin and destination
   * @param {string} origin - Origin coordinates or address
   * @param {string} destination - Destination coordinates or address
   * @param {string} mode - Travel mode
   * @returns {Object} - Route information
   */
  async computeRoute(origin, destination, mode = 'DRIVE') {
    console.log(`Computing route from ${origin} to ${destination} using ${mode} mode`);
    
    const travelMode = this.convertTravelMode(mode);
    
    try {
      // Create waypoints (this will handle both coordinates and addresses)
      const [originWaypoint, destinationWaypoint] = await Promise.all([
        this.createWaypoint(origin),
        this.createWaypoint(destination)
      ]);
      
      const requestPayload = {
        origin: originWaypoint,
        destination: destinationWaypoint,
        travelMode: travelMode,
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        polylineQuality: "OVERVIEW"
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Calling Google Routes API with payload:', JSON.stringify(requestPayload, null, 2));
      }
      
      const response = await axios.post(this.apiUrl, requestPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs'
        }
      });
      
      console.log('Google Routes API response received');
      return this.processRouteResponse(response.data, travelMode);
      
    } catch (error) {
      console.error('Error calling Routes API:', error.message);
      throw error;
    }
  }

  /**
   * Compute route with waypoints
   * @param {string} origin - Origin coordinates or address
   * @param {string} destination - Destination coordinates or address
   * @param {Array} waypoints - Array of waypoint coordinates or addresses
   * @param {string} mode - Travel mode
   * @returns {Object} - Route information with waypoints
   */
  async computeRouteWithWaypoints(origin, destination, waypoints = [], mode = 'DRIVE') {
    console.log(`Computing route with ${waypoints.length} waypoints from ${origin} to ${destination}`);
    
    const travelMode = this.convertTravelMode(mode);
    
    try {
      // Create all waypoints (this will handle both coordinates and addresses)
      const [originWaypoint, destinationWaypoint, ...intermediateWaypoints] = await Promise.all([
        this.createWaypoint(origin),
        this.createWaypoint(destination),
        ...waypoints.map(waypoint => this.createWaypoint(waypoint))
      ]);
      
      const requestPayload = {
        origin: originWaypoint,
        destination: destinationWaypoint,
        travelMode: travelMode,
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        polylineQuality: "OVERVIEW"
      };
      
      // Add intermediate waypoints if provided
      if (intermediateWaypoints.length > 0) {
        requestPayload.intermediates = intermediateWaypoints;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Calling Google Routes API with waypoints payload:', JSON.stringify(requestPayload, null, 2));
      }
      
      const response = await axios.post(this.apiUrl, requestPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs'
        }
      });
      
      console.log('Google Routes API response received for waypoints route');
      return this.processWaypointsRouteResponse(response.data, waypoints, travelMode);
      
    } catch (error) {
      console.error('Error calling Routes API with waypoints:', error.message);
      throw error;
    }
  }

  /**
   * Process route response from Routes API
   * @param {Object} data - API response data
   * @param {string} travelMode - Travel mode used
   * @returns {Object} - Processed route information
   */
  processRouteResponse(data, travelMode) {
    try {
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found in Routes API response');
      }
      
      console.log('Route found successfully');
      
      const route = data.routes[0];
      const leg = route.legs[0];
      
      // Debug steps structure only in development
      if (process.env.NODE_ENV === 'development' && leg.steps) {
        console.log('Steps found:', leg.steps.length);
        console.log('First step structure:', JSON.stringify(leg.steps[0], null, 2));
      }
      
      return {
        origin: `${leg.startLocation.latLng.latitude},${leg.startLocation.latLng.longitude}`,
        destination: `${leg.endLocation.latLng.latitude},${leg.endLocation.latLng.longitude}`,
        distance: formatDistance(route.distanceMeters),
        duration: formatDuration(route.duration),
        durationInSeconds: parseInt(route.duration.replace('s', '')),
        distanceInMeters: route.distanceMeters,
        mode: travelMode.toLowerCase(),
        steps: leg.steps ? leg.steps.map(step => ({
          instruction: step.navigationInstruction?.instructions || 'Continue',
          distance: step.distanceMeters ? formatDistance(step.distanceMeters) : 'Unknown',
          duration: step.duration ? formatDuration(step.duration) : 'Unknown'
        })) : [],
        polyline: route.polyline.encodedPolyline,
        bounds: route.bounds || null,
        viewport: route.viewport || null
      };
    } catch (error) {
      console.error('Error processing route response:', error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error('Response data:', JSON.stringify(data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Process waypoints route response from Routes API
   * @param {Object} data - API response data
   * @param {Array} waypoints - Array of waypoints
   * @param {string} travelMode - Travel mode used
   * @returns {Object} - Processed route information with waypoints
   */
  processWaypointsRouteResponse(data, waypoints, travelMode) {
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found in Routes API response for waypoints');
    }
    
    console.log('Route with waypoints found successfully');
    
    const route = data.routes[0];
    const legs = route.legs;
    
    return {
      origin: `${legs[0].startLocation.latLng.latitude},${legs[0].startLocation.latLng.longitude}`,
      destination: `${legs[legs.length - 1].endLocation.latLng.latitude},${legs[legs.length - 1].endLocation.latLng.longitude}`,
      waypoints: waypoints,
      totalDistance: route.distanceMeters,
      totalDuration: parseInt(route.duration.replace('s', '')),
      mode: travelMode.toLowerCase(),
      legs: legs.map(leg => ({
        start: `${leg.startLocation.latLng.latitude},${leg.startLocation.latLng.longitude}`,
        end: `${leg.endLocation.latLng.latitude},${leg.endLocation.latLng.longitude}`,
        distance: leg.distanceMeters ? formatDistance(leg.distanceMeters) : 'Unknown',
        duration: leg.duration ? formatDuration(leg.duration) : 'Unknown'
      })),
      polyline: route.polyline.encodedPolyline
    };
  }
}

console.log('Routes API service loaded successfully');

module.exports = RoutesService;
