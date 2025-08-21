const axios = require('axios');
const config = require('../config');

console.log('Loading Gemini AI service...');

class GeminiService {
  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.apiUrl = config.gemini.apiUrl;
  }

  /**
   * Check if Gemini API is available
   * @returns {boolean} - Whether Gemini API key is available
   */
  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Get intelligent stop recommendations using Gemini AI
   * @param {Array} places - Array of places found along the route
   * @param {Object} origin - Origin coordinates
   * @param {string} query - Search query
   * @returns {Object|null} - Intelligent stops plan or null if unavailable
   */
  async getIntelligentStops(places, origin, query) {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key not available');
    }
    
    console.log('Calling Gemini API for intelligent stop selection...');
    
    // Prepare the prompt for Gemini
    const prompt = this.buildPrompt(places, origin, query);
    
    try {
      const response = await axios.post(this.apiUrl, {
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
          'x-goog-api-key': this.apiKey
        }
      });
      
      console.log('Gemini API response received');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Gemini response text:', geminiResponse);
      }
      
      // Try to extract JSON from the response
      const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('No valid JSON found in Gemini response');
        return null;
      }
      
      try {
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
        
      } catch (parseError) {
        console.error('Error parsing Gemini JSON response:', parseError.message);
        return null;
      }
      
    } catch (error) {
      console.error('Error calling Gemini API:', error.message);
      throw error;
    }
  }

  /**
   * Build the prompt for Gemini AI
   * @param {Array} places - Array of places
   * @param {Object} origin - Origin coordinates
   * @param {string} query - Search query
   * @returns {string} - Formatted prompt for Gemini
   */
  buildPrompt(places, origin, query) {
    return `You are a travel assistant that helps drivers select the best places to stop along a route.  

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
  }
}

console.log('Gemini AI service loaded successfully');

module.exports = GeminiService;
