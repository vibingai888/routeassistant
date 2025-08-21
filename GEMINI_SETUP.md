# Gemini API Integration Setup

This guide explains how to set up Google Gemini API integration for intelligent stop selection in Route Assistant.

## What Gemini Does

The Gemini API integration provides intelligent recommendations for stops along your route by:

1. **Analyzing all available places** returned by Google Places API
2. **Applying smart ranking criteria** based on:
   - Open/closed status
   - Detour time and distance
   - User ratings and review count
   - Price level
3. **Segmenting long trips** into logical time segments (30-45 minutes)
4. **Providing reasoning** for each recommendation

## Setup Steps

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Add to Environment Variables

Add the following to your `.env` file:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Restart Server

After adding the API key, restart your server:

```bash
node server.js
```

You should see: `"Gemini API key loaded successfully"`

## API Response Format

When Gemini integration is enabled, the API returns:

```json
{
  "query": "gas station",
  "totalResults": 15,
  "origin": { "latitude": 37.4219, "longitude": -122.0841 },
  "places": [...], // All places from Google Places API
  "intelligentStops": {
    "stopsPlan": [
      {
        "segment": "0–45 min",
        "recommendedPlaces": [
          {
            "name": "Shell",
            "address": "123 Main St",
            "rating": 4.2,
            "userRatingCount": 150,
            "detourTimeMinutes": 6.5,
            "detourDistanceKm": 2.3,
            "directionsUri": "...",
            "reasoning": "Shortest detour with good rating and many reviews."
          }
        ]
      }
    ]
  }
}
```

## Fallback Behavior

If Gemini API is not configured or fails:
- The system falls back to showing all places from Google Places API
- All routing information (detour times, distances) is still available
- No functionality is lost

## Troubleshooting

### "Gemini API key not available"
- Check that `GEMINI_API_KEY` is set in your `.env` file
- Restart the server after adding the key

### "Error calling Gemini API"
- Verify your API key is valid
- Check your internet connection
- Ensure you have sufficient Gemini API quota

### No intelligent stops displayed
- Check server logs for Gemini API errors
- Verify the API key has access to Gemini 1.5 Flash model

## Benefits

- **Smarter recommendations** instead of showing all places
- **Trip segmentation** for long journeys
- **Contextual reasoning** for each recommendation
- **Better user experience** with fewer, more relevant options
