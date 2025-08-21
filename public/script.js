let map;
let directionsService;
let directionsRenderer;
let currentRoute = null;
let originMarker = null;
let destinationMarker = null;

// Initialize the map
function initMap() {
    console.log('Initializing Google Maps...');
    
    // Default center (United States)
    const defaultCenter = { lat: 39.8283, lng: -98.5795 };
    
    // Create map with Map ID for Advanced Markers support
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 4,
        center: defaultCenter,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapId: 'DEMO_MAP_ID', // Required for Advanced Markers
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    });

    // Initialize directions service and renderer
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#4285f4',
            strokeWeight: 5,
            strokeOpacity: 0.8
        }
    });
    
    directionsRenderer.setMap(map);
    
    // Initialize modern autocomplete
    initializeModernAutocomplete();
    
    console.log('Google Maps initialized successfully');
}

// Initialize modern autocomplete using PlaceAutocompleteElement
function initializeModernAutocomplete() {
    console.log('Initializing modern Google Places API (New) with PlaceAutocompleteElement...');
    
    // Wait for the custom elements to be defined
    if (customElements.get('gmp-place-autocomplete')) {
        setupModernPlaceAutocomplete();
    } else {
        // Fallback: wait for the element to be defined
        customElements.whenDefined('gmp-place-autocomplete').then(() => {
            setupModernPlaceAutocomplete();
        });
    }
}

// Setup modern PlaceAutocompleteElement
function setupModernPlaceAutocomplete() {
    console.log('Setting up modern PlaceAutocompleteElement...');
    
    // Wait a bit for the Google Places API to fully initialize
    setTimeout(() => {
        const originElement = document.getElementById('origin');
        const destinationElement = document.getElementById('destination');
        
        if (originElement) {
            // Listen for place selection using the correct event for Places API New
            originElement.addEventListener('gmp-select', async (event) => {
                console.log('Origin gmp-select event triggered:', event);
                const { placePrediction } = event;
                console.log('Origin placePrediction:', placePrediction);
                
                try {
                    // Convert prediction to place and fetch details
                    const place = placePrediction.toPlace();
                    await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
                    
                    console.log('Origin place details fetched:', place.toJSON());
                    
                    // Store the selected place data
                    originElement.selectedPlace = place;
                    
                    // Update the display with the formatted address
                    const placeData = place.toJSON();
                    const displayValue = placeData.formattedAddress || placeData.displayName;
                    
                    if (displayValue) {
                        originElement.setAttribute('data-selected-value', displayValue);
                        originElement.currentInputValue = displayValue;
                        console.log('Origin value set to:', displayValue);
                    }
                    
                    // Automatically zoom to origin location and add marker
                    if (placeData.location) {
                        console.log('Zooming to origin location and adding marker...');
                        zoomToLocation(placeData.location, 'origin');
                        addMarker(placeData.location, 'origin', displayValue);
                    }
                    
                } catch (error) {
                    console.error('Error processing origin place selection:', error);
                }
            });
            
            // Listen for input changes in the Google Places field
            originElement.addEventListener('gmp-input', (event) => {
                console.log('Origin gmp-input event:', event);
                // Try to get the current input value
                const currentValue = getCurrentInputValue(originElement);
                if (currentValue && currentValue.trim()) {
                    originElement.currentInputValue = currentValue.trim();
                    originElement.setAttribute('data-current-input', currentValue.trim());
                    console.log('Origin gmp-input value captured:', currentValue.trim());
                }
            });
            
            // Listen for focus to capture current input state
            originElement.addEventListener('focus', (event) => {
                console.log('Origin focused');
                // Try to get current value when focused
                const currentValue = getCurrentInputValue(originElement);
                if (currentValue && currentValue.trim()) {
                    originElement.currentInputValue = currentValue.trim();
                    originElement.setAttribute('data-current-input', currentValue.trim());
                    console.log('Origin focus - value captured:', currentValue.trim());
                }
            });
            
            // Add mutation observer to watch for DOM changes
            const originObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        // Try to extract current input value from the DOM
                        const inputText = getCurrentInputValue(originElement);
                        if (inputText && inputText.trim() && inputText.trim() !== originElement.placeholder) {
                            console.log('Origin mutation observer detected text:', inputText.trim());
                            originElement.currentInputValue = inputText.trim();
                            originElement.setAttribute('data-current-input', inputText.trim());
                        }
                    }
                });
            });
            
            originObserver.observe(originElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
        
        if (destinationElement) {
            // Listen for place selection using the correct event for Places API New
            destinationElement.addEventListener('gmp-select', async (event) => {
                console.log('Destination gmp-select event triggered:', event);
                const { placePrediction } = event;
                console.log('Destination placePrediction:', placePrediction);
                
                try {
                    // Convert prediction to place and fetch details
                    const place = placePrediction.toPlace();
                    await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
                    
                    console.log('Destination place details fetched:', place.toJSON());
                    
                    // Store the selected place data
                    destinationElement.selectedPlace = place;
                    
                    // Update the display with the formatted address
                    const placeData = place.toJSON();
                    const displayValue = placeData.formattedAddress || placeData.displayName;
                    
                    if (displayValue) {
                        destinationElement.setAttribute('data-selected-value', displayValue);
                        destinationElement.currentInputValue = displayValue;
                        console.log('Destination value set to:', displayValue);
                    }
                    
                    // Add destination marker
                    if (placeData.location) {
                        console.log('Adding destination marker...');
                        addMarker(placeData.location, 'destination', displayValue);
                    }
                    
                    // Automatically find and display route if origin is already selected
                    const originElement = document.getElementById('origin');
                    if (originElement && originElement.selectedPlace) {
                        console.log('Origin already selected, automatically finding route...');
                        setTimeout(() => {
                            findRoute();
                        }, 500); // Small delay to ensure everything is processed
                    }
                    
                } catch (error) {
                    console.error('Error processing destination place selection:', error);
                }
            });
            
            // Listen for input changes in the Google Places field
            destinationElement.addEventListener('gmp-input', (event) => {
                console.log('Destination gmp-input event:', event);
                // Try to get the current input value
                const currentValue = getCurrentInputValue(destinationElement);
                if (currentValue && currentValue.trim()) {
                    destinationElement.currentInputValue = currentValue.trim();
                    destinationElement.setAttribute('data-current-input', currentValue.trim());
                    console.log('Destination gmp-input value captured:', currentValue.trim());
                }
            });
            
            // Listen for focus to capture current input state
            destinationElement.addEventListener('focus', (event) => {
                console.log('Destination focused');
                // Try to get current value when focused
                const currentValue = getCurrentInputValue(destinationElement);
                if (currentValue && currentValue.trim()) {
                    destinationElement.currentInputValue = currentValue.trim();
                    destinationElement.setAttribute('data-current-input', currentValue.trim());
                    console.log('Destination focus - value captured:', currentValue.trim());
                }
            });
            
            // Add mutation observer to watch for DOM changes
            const destinationObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        // Try to extract current input value from the DOM
                        const inputText = getCurrentInputValue(destinationElement);
                        if (inputText && inputText.trim() && inputText.trim() !== destinationElement.placeholder) {
                            console.log('Destination mutation observer detected text:', inputText.trim());
                            destinationElement.currentInputValue = inputText.trim();
                            destinationElement.setAttribute('data-current-input', inputText.trim());
                        }
                    }
                });
            });
            
            destinationObserver.observe(destinationElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
        
        console.log('Modern PlaceAutocompleteElement initialized successfully');
    }, 1000); // Wait 1 second for full initialization
}

// Function to zoom to a specific location
function zoomToLocation(location, type) {
    console.log(`Zooming to ${type} location:`, location);
    
    if (location && location.lat && location.lng) {
        const latLng = new google.maps.LatLng(location.lat, location.lng);
        
        // Center map on the location
        map.setCenter(latLng);
        
        // Set appropriate zoom level based on type
        if (type === 'origin') {
            map.setZoom(15); // Closer zoom for origin
        } else {
            map.setZoom(13); // Slightly further zoom for destination
        }
        
        console.log(`Map zoomed to ${type} location successfully`);
    }
}

// Function to add markers to the map
function addMarker(location, type, label) {
    console.log(`Adding ${type} marker at:`, location, 'with label:', label);
    
    if (location && location.lat && location.lng) {
        const latLng = new google.maps.LatLng(location.lat, location.lng);
        
        // Remove existing marker of the same type
        if (type === 'origin' && originMarker) {
            if (originMarker.map !== undefined) {
                originMarker.map = null; // Advanced Marker
            } else {
                originMarker.setMap(null); // Regular Marker
            }
        } else if (type === 'destination' && destinationMarker) {
            if (destinationMarker.map !== undefined) {
                destinationMarker.map = null; // Advanced Marker
            } else {
                destinationMarker.setMap(null); // Regular Marker
            }
        }
        
        let marker;
        
        // Try to use Advanced Markers first, fallback to regular markers
        if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
            console.log('Using Advanced Marker Element');
            
            // Create custom marker content
            const markerContent = document.createElement('div');
            markerContent.style.cssText = `
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 2px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
                color: white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            `;
            
            // Set marker appearance based on type
            if (type === 'origin') {
                markerContent.style.backgroundColor = '#4285f4';
                markerContent.textContent = 'A';
            } else {
                markerContent.style.backgroundColor = '#ea4335';
                markerContent.textContent = 'B';
            }
            
            // Create new advanced marker
            marker = new google.maps.marker.AdvancedMarkerElement({
                position: latLng,
                map: map,
                title: label,
                content: markerContent
            });
            
        } else {
            console.log('Advanced Markers not available, using regular Marker');
            
            // Create regular marker with custom icon
            const iconUrl = type === 'origin' 
                ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="16" cy="16" r="16" fill="#4285f4" stroke="#ffffff" stroke-width="2"/>
                        <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">A</text>
                    </svg>
                `)
                : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="16" cy="16" r="16" fill="#ea4335" stroke="#ffffff" stroke-width="2"/>
                        <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">B</text>
                    </svg>
                `);
            
            marker = new google.maps.Marker({
                position: latLng,
                map: map,
                title: label,
                icon: {
                    url: iconUrl,
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 16)
                }
            });
        }
        
        // Store reference to marker
        if (type === 'origin') {
            originMarker = marker;
        } else {
            destinationMarker = marker;
        }
        
        // Add info window for the marker
        const infoWindow = new google.maps.InfoWindow({
            content: `<div style="padding: 8px;"><strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong><br>${label}</div>`
        });
        
        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });
        
        console.log(`${type} marker added successfully`);
    }
}

// Find route between origin and destination
async function findRoute() {
    console.log('Find route function called');
    
    const originElement = document.getElementById('origin');
    const destinationElement = document.getElementById('destination');
    
    console.log('Origin element:', originElement);
    console.log('Destination element:', destinationElement);
    
    // Get values from the modern PlaceAutocompleteElement
    let origin = '';
    let destination = '';
    
    if (originElement) {
        // For modern Google Places API, we need to get the value differently
        // Try to get the current input value or selected place
        origin = getCurrentInputValue(originElement);
        
        console.log('Origin value extracted:', {
            currentInputValue: originElement.currentInputValue,
            dataCurrentInput: originElement.getAttribute('data-current-input'),
            dataSelectedValue: originElement.getAttribute('data-selected-value'),
            placeholder: originElement.placeholder,
            final: origin
        });
    }
    
    if (destinationElement) {
        // For modern Google Places API, we need to get the value differently
        // Try to get the current input value or selected place
        destination = getCurrentInputValue(destinationElement);
        
        console.log('Destination value extracted:', {
            currentInputValue: destinationElement.currentInputValue,
            dataCurrentInput: destinationElement.getAttribute('data-current-input'),
            dataSelectedValue: destinationElement.getAttribute('data-selected-value'),
            placeholder: destinationElement.placeholder,
            final: destination
        });
    }
    
    // Clean up the values
    origin = origin.trim();
    destination = destination.trim();
    
    console.log('Cleaned values - Origin:', origin, 'Destination:', destination);
    
    // Check if values are empty or just placeholders
    if (!origin || !destination || 
        origin === originElement?.placeholder || 
        destination === destinationElement?.placeholder ||
        origin === 'e.g., New York, NY' || 
        destination === 'e.g., Boston, MA') {
        console.log('Validation failed - showing error');
        showError('Please enter both starting location and destination');
        return;
    }

    console.log('Finding route from', origin, 'to', destination);
    
    // Show loading state
    showLoading(true);
    hideError();
    hideRouteInfo();

    try {
        // Call our backend API
        const response = await fetch('/api/route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin: origin,
                destination: destination,
                mode: 'driving'
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to find route');
        }

        console.log('Route found:', data);
        
        // Display route on map
        displayRoute(data);
        
        // Show route information
        showRouteInfo(data);
        
    } catch (error) {
        console.error('Error finding route:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Display route on the map
function displayRoute(routeData) {
    console.log('Displaying route on map...');
    
    // Create Google Maps request
    const request = {
        origin: routeData.origin,
        destination: routeData.destination,
        travelMode: google.maps.TravelMode.DRIVING
    };

    // Get directions from Google Maps
    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            console.log('Directions service response received');
            
            // Render the route
            directionsRenderer.setDirections(result);
            
            // Fit map to show entire route
            const bounds = new google.maps.LatLngBounds();
            const route = result.routes[0];
            
            route.legs.forEach(leg => {
                bounds.extend(leg.start_location);
                bounds.extend(leg.end_location);
            });
            
            map.fitBounds(bounds);
            
            // Add some padding to the bounds
            map.setZoom(Math.min(map.getZoom(), 12));
            
            console.log('Route displayed successfully');
            
        } else {
            console.error('Directions service failed:', status);
            showError('Failed to display route on map');
        }
    });
}

// Show route information
function showRouteInfo(routeData) {
    document.getElementById('distance').textContent = routeData.distance;
    document.getElementById('duration').textContent = routeData.duration;
    document.getElementById('routeInfo').classList.add('show');
}

// Hide route information
function hideRouteInfo() {
    document.getElementById('routeInfo').classList.remove('show');
}

// Show loading state
function showLoading(show) {
    const loading = document.getElementById('loading');
    
    if (show) {
        loading.classList.add('show');
    } else {
        loading.classList.remove('show');
    }
}

// Show error message
function showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.classList.add('show');
}

// Hide error message
function hideError() {
    document.getElementById('error').classList.remove('show');
}

// Helper function to extract current input text from a PlaceAutocompleteElement
function getCurrentInputValue(element) {
    
    // Try multiple methods to get the current input value
    let inputText = '';
    
    if (element.selectedPlace) {
        try {
            const placeData = element.selectedPlace.toJSON();
            const selectedValue = placeData.formattedAddress || placeData.displayName;
            if (selectedValue && selectedValue.trim()) {
                inputText = selectedValue.trim();
                return inputText; // Return immediately if we have a selected place
            }
        } catch (error) {
            console.log('selectedPlace access failed:', error);
        }
    }
    return inputText;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up event listeners...');
    
    // Handle Enter key in input fields
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && (e.target.id === 'origin' || e.target.id === 'destination')) {
            e.preventDefault();
            console.log('Enter key pressed, calling findRoute...');
            findRoute();
        }
    });
    
    // Add input event listeners to capture values as they're typed
    const originElement = document.getElementById('origin');
    const destinationElement = document.getElementById('destination');
    
    if (originElement) {
        // Listen for any meaningful changes in the DOM
        originElement.addEventListener('focus', function(e) {
            console.log('Origin focused - checking for current value');
            // Try to get current value when focused
            const value = getCurrentInputValue(originElement);
            if (value && value.trim() && value !== originElement.placeholder) {
                originElement.currentInputValue = value.trim();
                originElement.setAttribute('data-current-input', value.trim());
                console.log('Origin focus - value captured:', value.trim());
            }
        });
    }
    
    if (destinationElement) {
        // Listen for any meaningful changes in the DOM
        destinationElement.addEventListener('focus', function(e) {
            console.log('Destination focused - checking for current value');
            // Try to get current value when focused
            const value = getCurrentInputValue(destinationElement);
            if (value && value.trim() && value !== destinationElement.placeholder) {
                destinationElement.currentInputValue = value.trim();
                destinationElement.setAttribute('data-current-input', value.trim());
                console.log('Destination focus - value captured:', value.trim());
            }
        });
    }
    
    console.log('Event listeners set up successfully');
    
    // Set up periodic checking for input values (Google Places API might update DOM asynchronously)
    setInterval(() => {
        if (originElement) {
            const currentValue = getCurrentInputValue(originElement);
            if (currentValue && currentValue.trim() && 
                currentValue.trim() !== originElement.currentInputValue && 
                currentValue.trim() !== originElement.placeholder) {
                originElement.currentInputValue = currentValue.trim();
                originElement.setAttribute('data-current-input', currentValue.trim());
                console.log('Periodic check - origin value updated:', currentValue.trim());
            }
        }
        
        if (destinationElement) {
            const currentValue = getCurrentInputValue(destinationElement);
            if (currentValue && currentValue.trim() && 
                currentValue.trim() !== destinationElement.currentInputValue && 
                currentValue.trim() !== destinationElement.placeholder) {
                destinationElement.currentInputValue = currentValue.trim();
                destinationElement.setAttribute('data-current-input', currentValue.trim());
                console.log('Periodic check - destination value updated:', currentValue.trim());
            }
        }
    }, 2000); // Check every 2 seconds instead of every second
});

// Make initMap globally available for Google Maps callback
window.initMap = initMap;
