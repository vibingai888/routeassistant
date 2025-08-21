# Route Assistant Backend

A Node.js backend service that integrates with the Google Maps Platform to provide routing between locations. This service uses the modern Google Routes API for comprehensive route planning with support for waypoints, multiple transportation modes, and detailed turn-by-turn directions.

## Features

- 🗺️ **Route Planning**: Get directions between any two locations
- 🔄 **Waypoints Support**: Plan routes with multiple stops
- 🚗 **Multiple Modes**: Driving, walking, bicycling, and transit
- 📍 **Detailed Instructions**: Turn-by-turn navigation with distances and times
- 🛡️ **Security**: Rate limiting, CORS, and security headers
- ✅ **Comprehensive Testing**: Full test coverage with Jest and Supertest
- 📊 **Health Monitoring**: Built-in health check endpoint
- 🌐 **Web Frontend**: Simple, clean interface with Google Maps integration

## Prerequisites

- Node.js (v14 or higher)
- Google Maps API key with Routes API enabled
- Google Places API enabled (for location search)

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd routeassistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your Google Maps API key:
   ```env
   GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   PORT=3000
   NODE_ENV=development
   ```

4. **Get Google Maps API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Routes API and Places API
   - Create credentials (API Key)
   - Add the API key to your `.env` file

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## Frontend Application

The application includes a simple, clean web frontend:

- **Full-screen Google Maps** background
- **Two input fields** for origin and destination
- **Google Places Autocomplete** for address suggestions
- **Route visualization** with automatic zoom to fit the entire route
- **Route details** showing distance and duration
- **Clean, modern UI** with no clutter

### Using the Frontend

1. Start the server: `npm start`
2. Open your browser and go to `http://localhost:3000`
3. **Type in starting location** - get instant address suggestions
4. **Type in destination** - get instant address suggestions
5. **Select from dropdown** or continue typing
6. Click "Find Route" or press Enter
7. View the route on the map with automatic zoom

### Autocomplete Features

- **Modern Google Places API**: Uses the latest `PlaceAutocompleteElement` (no deprecated APIs)
- **Smart Address Suggestions**: Type partial addresses to get full suggestions
- **US-Focused Results**: Optimized for United States locations
- **Establishment Support**: Find businesses, landmarks, and addresses
- **Professional Styling**: Integrated dropdown design matching the app theme
- **Keyboard Navigation**: Use arrow keys and Enter to select suggestions
- **Future-Proof**: Built with modern web standards and Google's latest recommendations

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and uptime information.

### Route Planning
```
POST /api/route
```
Get directions between two locations.

**Request Body:**
```json
{
  "origin": "San Francisco, CA",
  "destination": "Los Angeles, CA",
  "mode": "driving"
}
```

**Response:**
```json
{
  "origin": "San Francisco, CA, USA",
  "destination": "Los Angeles, CA, USA",
  "distance": "382 mi",
  "duration": "5 hours 45 mins",
  "mode": "driving",
  "steps": [
    {
      "instruction": "Head north on I-5 S",
      "distance": "0.1 mi",
      "duration": "1 min"
    }
  ],
  "polyline": "encoded_polyline_data",
  "bounds": {...}
}
```

### Route with Waypoints
```
POST /api/route/waypoints
```
Plan a route with multiple stops.

**Request Body:**
```json
{
  "origin": "San Francisco, CA",
  "destination": "Los Angeles, CA",
  "waypoints": ["Sacramento, CA", "Fresno, CA"],
  "mode": "driving"
}
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Test Frontend
```bash
node test-frontend.js
```

### Test Coverage
The test suite covers:
- ✅ Health endpoint functionality
- ✅ Route planning with valid data
- ✅ Error handling for missing parameters
- ✅ Google Maps API error responses
- ✅ Network error handling
- ✅ Default mode handling
- ✅ Waypoints routing
- ✅ Rate limiting
- ✅ 404 error handling
- ✅ Malformed JSON handling
- ✅ Frontend HTML serving
- ✅ Static file serving

## Configuration Options

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `GOOGLE_MAPS_API_KEY` | Required | Your Google Maps API key |
| `PORT` | 3000 | Server port number |
| `NODE_ENV` | development | Environment mode |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |

## Security Features

- **Helmet**: Security headers for Express
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Sanitizes and validates all inputs
- **Error Handling**: Secure error messages in production

## Error Handling

The service provides comprehensive error handling:
- **400 Bad Request**: Invalid input parameters
- **404 Not Found**: Unknown endpoints
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side errors

## Development

### Project Structure
```
routeassistant/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── jest.config.js         # Jest configuration
├── env.example            # Environment variables template
├── public/                # Frontend static files
│   └── index.html         # Main frontend application
├── tests/                 # Test files
│   └── server.test.js     # Main test suite
├── test-frontend.js       # Frontend testing script
├── test-api.js            # API testing script
├── README.md              # This file
└── ARCHITECTURE.md        # Architecture documentation
```

### Adding New Features
1. Add your feature to `server.js`
2. Create corresponding tests in `tests/`
3. Update this README if needed
4. Run tests to ensure everything works

## Troubleshooting

### Common Issues

1. **"GOOGLE_MAPS_API_KEY environment variable is required"**
   - Make sure you have a `.env` file with your API key
   - Verify the API key is valid and has Routes API enabled

2. **"Route not found" errors**
   - Check that your origin and destination are valid locations
   - Ensure your Google Maps API key has proper billing set up

3. **Rate limiting errors**
   - The service limits to 100 requests per 15 minutes per IP
   - Adjust limits in your `.env` file if needed

4. **Frontend not loading**
   - Ensure the server is running
   - Check that the `public/` directory exists
   - Verify Google Maps API key is valid

### Debug Mode
Set `NODE_ENV=development` in your `.env` file for detailed logging.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the test files for usage examples
- Ensure your Google Maps API key is properly configured
- Test the frontend with `node test-frontend.js`
