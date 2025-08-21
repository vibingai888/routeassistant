# Route Assistant Frontend

A simple, clean frontend application that displays routes on Google Maps.

## Features

- 🗺️ **Full-screen Google Maps** background
- 📍 **Two input fields** for origin and destination
- 🚗 **Route visualization** with automatic zoom to fit the entire route
- 📊 **Route details** showing distance and duration
- 🎨 **Clean, modern UI** with no clutter

## How to Use

1. **Start the server**: `npm start`
2. **Open your browser** and go to `http://localhost:3000`
3. **Enter starting location** (e.g., "New York, NY")
4. **Enter destination** (e.g., "Boston, MA")
5. **Click "Find Route"** or press Enter
6. **View the route** on the map with automatic zoom

## Technical Details

- **Frontend**: Pure HTML/CSS/JavaScript
- **Maps**: Google Maps JavaScript API
- **Backend Integration**: Uses your Route Assistant API
- **Responsive Design**: Works on desktop and mobile
- **No Dependencies**: Lightweight and fast

## API Integration

The frontend calls your backend at `/api/route` to get route data, then uses Google Maps to visualize the route. The map automatically zooms to show the entire route from start to finish.

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

- Make sure your Google Maps API key is valid
- Ensure the backend server is running
- Check browser console for any JavaScript errors
- Verify your internet connection for map loading
