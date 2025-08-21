# Architecture Documentation

This document describes the modular architecture of the Route Assistant backend, which provides a well-organized, maintainable structure for the application.

## 🏗️ Architecture Overview

The application has been restructured into the following modular components:

```
routeassistant/
├── config/                 # Configuration management
│   └── index.js           # Centralized configuration
├── middleware/             # Express middleware
│   ├── security.js        # Security and CORS middleware
│   └── rateLimit.js       # Rate limiting middleware
├── routes/                 # Route definitions and handlers
│   ├── index.js           # Main router configuration
│   └── routeHandlers.js   # Route handler functions
├── services/               # Business logic and API services
│   ├── routesService.js   # Google Maps Routes API service
│   ├── placesService.js   # Google Places API service
│   └── geminiService.js   # Gemini AI API service
├── utils/                  # Utility functions
│   └── timeUtils.js       # Time and distance conversion utilities
├── server.js              # Original monolithic server (legacy)
├── server-new.js          # New modular server
└── package.json           # Updated with modular scripts
```

## 🔧 Configuration (`config/`)

**File:** `config/index.js`

Centralizes all configuration including:
- Environment variables
- API keys and endpoints
- Server settings
- Security policies
- Rate limiting parameters

**Benefits:**
- Single source of truth for configuration
- Easy to modify settings without touching business logic
- Environment-specific configuration support

## 🛡️ Middleware (`middleware/`)

### Security Middleware (`middleware/security.js`)
- Helmet security headers
- CORS configuration
- Content Security Policy

### Rate Limiting (`middleware/rateLimit.js`)
- Configurable rate limiting
- IP-based request throttling
- Customizable time windows and limits

## 🛣️ Routes (`routes/`)

### Main Router (`routes/index.js`)
- Defines all API endpoints
- Serves static files
- Handles 404 errors
- Clean separation of concerns

### Route Handlers (`routes/routeHandlers.js`)
- Contains business logic for each endpoint
- Orchestrates service calls
- Handles request validation
- Manages error responses

## 🚀 Services (`services/`)

### Routes Service (`services/routesService.js`)
- Handles all Google Maps Routes API interactions
- Route computation with and without waypoints
- Response processing and formatting
- Travel mode conversion

### Places Service (`services/placesService.js`)
- Manages Google Places API calls
- Search along route functionality
- Routing summary processing
- Segment-based search optimization

### Gemini Service (`services/geminiService.js`)
- AI-powered stop recommendations
- Intelligent route planning
- Response parsing and enhancement
- Fallback handling

## 🛠️ Utilities (`utils/`)

### Time Utils (`utils/timeUtils.js`)
- Time and distance conversions
- Formatting functions
- Reusable helper methods

## 📱 Running the Application

### Legacy Mode (Original)
```bash
npm start          # Production
npm run dev        # Development with nodemon
```

### Modular Mode (New)
```bash
npm run start:modular    # Production
npm run dev:modular      # Development with nodemon
```

## 🔄 Migration Benefits

### 1. **Maintainability**
- Each component has a single responsibility
- Easy to locate and modify specific functionality
- Clear separation of concerns

### 2. **Scalability**
- Services can be easily extended or replaced
- New APIs can be added without affecting existing code
- Modular testing and deployment

### 3. **Testing**
- Individual services can be unit tested
- Mock services for testing
- Better test coverage and isolation

### 4. **Development Experience**
- Faster development cycles
- Easier debugging
- Better code organization
- Reduced merge conflicts

### 5. **API Management**
- Each external API is isolated in its own service
- Easy to switch between API versions
- Centralized error handling per service

## 🧪 Testing the Modular Architecture

```bash
# Test the new modular server
npm run start:modular

# Test in development mode
npm run dev:modular

# Run existing tests
npm test
```

## 🔍 Key Differences from Monolithic Version

| Aspect | Monolithic | Modular |
|--------|------------|---------|
| **File Structure** | Single `server.js` | Multiple organized files |
| **Configuration** | Scattered throughout code | Centralized in `config/` |
| **Middleware** | Inline in main file | Separate files in `middleware/` |
| **Business Logic** | Mixed with route handlers | Isolated in `services/` |
| **Route Handling** | Inline functions | Organized in `routes/` |
| **Utilities** | Inline functions | Reusable in `utils/` |
| **Testing** | Difficult to isolate | Easy to test components |
| **Maintenance** | Hard to modify | Easy to update specific parts |

## 🚀 Future Enhancements

The modular architecture enables easy addition of:

1. **New API Services**
   - Weather API integration
   - Traffic data services
   - Alternative routing providers

2. **Enhanced Middleware**
   - Authentication
   - Request logging
   - Performance monitoring

3. **Database Integration**
   - User preferences
   - Route history
   - Analytics

4. **Microservices**
   - Service decomposition
   - Independent scaling
   - Technology diversity

## 📚 Best Practices

1. **Service Isolation**: Each service handles one external API
2. **Configuration Centralization**: All settings in one place
3. **Error Handling**: Consistent error responses across services
4. **Logging**: Comprehensive logging for debugging
5. **Validation**: Input validation at the route handler level
6. **Testing**: Unit tests for each service component

## 🔧 Troubleshooting

### Common Issues

1. **Module Not Found Errors**
   - Ensure all dependencies are installed
   - Check file paths in imports
   - Verify file extensions

2. **Configuration Issues**
   - Check environment variables
   - Verify API keys
   - Review config validation

3. **Service Errors**
   - Check individual service logs
   - Verify API endpoints
   - Review error handling

### Debug Mode

Set `NODE_ENV=development` for detailed logging and error messages.

---

This modular architecture provides a solid foundation for future development while maintaining all existing functionality. Each component can be developed, tested, and deployed independently, making the codebase more maintainable and scalable.
