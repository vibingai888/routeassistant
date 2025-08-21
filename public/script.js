let map;
let directionsService;
let directionsRenderer;
let currentRoute = null;
let originMarker = null;
let destinationMarker = null;
let gasStationMarkers = [];
let aiRecommendedMarkers = []; // New array for AI-recommended stop markers

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

// Function to search for gas stations along a route with segment-based planning
async function searchGasStationsAlongRoute(encodedPolyline) {
    console.log('Searching for gas stations along route with segment-based planning...');
    
    try {
        // Show loading state
        showLoading(true);
        
        // Get origin coordinates from the current route for detour time calculations
        let originCoords = null;
        if (currentRoute && currentRoute.origin) {
            console.log('Route origin available:', currentRoute.origin);
            
            // For demo purposes, use a default location (you can enhance this with geocoding)
            originCoords = {
                latitude: 37.4219,  // Default latitude (you can enhance this)
                longitude: -122.0841  // Default longitude (you can enhance this)
            };
            console.log('Using default origin coordinates for routing summaries:', originCoords);
        }
        
        // Check if this is a long route that needs segmentation
        const routeDuration = currentRoute?.durationInSeconds || 0;
        const isLongRoute = routeDuration > 2700; // 45 minutes = 2700 seconds
        
        if (isLongRoute) {
            console.log(`Long route detected (${Math.round(routeDuration / 60)} minutes), using segment-based search...`);
            await searchGasStationsBySegments(encodedPolyline, originCoords, routeDuration);
        } else {
            console.log('Standard route, using single search...');
            await searchGasStationsSingleRequest(encodedPolyline, originCoords);
        }
        
    } catch (error) {
        console.error('Error searching for gas stations:', error);
        showError('Failed to search for gas stations: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Function to search for gas stations in a single request (for shorter routes)
async function searchGasStationsSingleRequest(encodedPolyline, originCoords) {
    console.log('Performing single gas station search...');
    
    const requestBody = {
        textQuery: 'gas station',
        encodedPolyline: encodedPolyline,
        maxResultCount: 15,
        openNow: false,
        includedType: 'gas_station'
    };
    
    // Always include origin coordinates for routing summaries
    if (originCoords && originCoords.latitude && originCoords.longitude) {
        requestBody.origin = originCoords;
        console.log('Including origin coordinates in search for detour time calculations');
    } else {
        console.log('Warning: No origin coordinates available - routing summaries will not be calculated');
    }
    
    const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to search for gas stations');
    }

    console.log(`Found ${data.totalResults} gas stations along the route:`, data.places);
    console.log('Response includes routing summaries:', data.places.some(p => p.detourTime));
    
    // Display gas stations on the map
    displayGasStations(data.places);
    
    // Show gas stations info
    showGasStationsInfo(data.places);
    
    // Show intelligent stops if available
    if (data.intelligentStops) {
        showIntelligentStops(data.intelligentStops);
    }
}

// Function to search for gas stations by breaking route into segments
async function searchGasStationsBySegments(encodedPolyline, originCoords, totalDurationSeconds) {
    console.log('Breaking route into segments for comprehensive gas station search...');
    
    // Calculate optimal segment duration (target 30-45 minutes)
    const targetSegmentDuration = 35 * 60; // 35 minutes in seconds
    const numSegments = Math.ceil(totalDurationSeconds / targetSegmentDuration);
    const actualSegmentDuration = totalDurationSeconds / numSegments;
    
    console.log(`Route duration: ${Math.round(totalDurationSeconds / 60)} minutes`);
    console.log(`Breaking into ${numSegments} segments of ~${Math.round(actualSegmentDuration / 60)} minutes each`);
    
    // Create segments for the route
    const segments = [];
    for (let i = 0; i < numSegments; i++) {
        const startTime = i * actualSegmentDuration;
        const endTime = (i + 1) * actualSegmentDuration;
        
        segments.push({
            index: i,
            startTime: startTime,
            endTime: endTime,
            startTimeFormatted: `${Math.floor(startTime / 60)}-${Math.floor(endTime / 60)} min`,
            endTimeFormatted: `${Math.floor(endTime / 60)} min`
        });
    }
    
    console.log('Route segments created:', segments);
    
    // Search for gas stations in each segment
    const allPlaces = [];
    const segmentResults = [];
    
    for (const segment of segments) {
        console.log(`Searching segment ${segment.index + 1}: ${segment.startTimeFormatted}`);
        
        try {
            // For each segment, we'll search with a focused area
            // In a real implementation, you might want to create sub-polylines for each segment
            // For now, we'll use the full polyline but adjust the search parameters
            
            const requestBody = {
                textQuery: 'gas station',
                encodedPolyline: encodedPolyline,
                maxResultCount: 8, // Fewer results per segment for better distribution
                openNow: false,
                includedType: 'gas_station',
                segment: segment.index,
                segmentInfo: {
                    startTime: segment.startTime,
                    endTime: segment.endTime,
                    startTimeFormatted: segment.startTimeFormatted,
                    endTimeFormatted: segment.endTimeFormatted
                }
            };
            
            // Always include origin coordinates for routing summaries
            if (originCoords && originCoords.latitude && originCoords.longitude) {
                requestBody.origin = originCoords;
            }
            
            const response = await fetch('/api/places/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            
            if (response.ok && data.places) {
                console.log(`Segment ${segment.index + 1}: Found ${data.places.length} gas stations`);
                
                // Add segment information to each place
                const placesWithSegment = data.places.map(place => ({
                    ...place,
                    segment: segment.index,
                    segmentInfo: segment,
                    segmentTimeRange: segment.startTimeFormatted
                }));
                
                allPlaces.push(...placesWithSegment);
                segmentResults.push({
                    segment: segment,
                    places: placesWithSegment,
                    intelligentStops: data.intelligentStops
                });
                
                // Add a small delay between requests to avoid rate limiting
                if (segment.index < segments.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
            } else {
                console.warn(`Segment ${segment.index + 1}: Search failed or no results`);
            }
            
        } catch (error) {
            console.error(`Error searching segment ${segment.index + 1}:`, error);
            // Continue with other segments even if one fails
        }
    }
    
    console.log(`Total places found across all segments: ${allPlaces.length}`);
    
    if (allPlaces.length > 0) {
        // Display all gas stations on the map
        displayGasStations(allPlaces);
        
        // Show gas stations info with segment information
        showGasStationsInfoWithSegments(allPlaces, segments);
        
        // Show intelligent stops from all segments
        const allIntelligentStops = combineIntelligentStopsFromSegments(segmentResults);
        if (allIntelligentStops && allIntelligentStops.stopsPlan && allIntelligentStops.stopsPlan.length > 0) {
            showIntelligentStops(allIntelligentStops);
        }
        
        // Show segment summary
        showSegmentSummary(segments, allPlaces);
        
    } else {
        showError('No gas stations found along any route segment');
    }
}

// Function to combine intelligent stops from multiple segments
function combineIntelligentStopsFromSegments(segmentResults) {
    console.log('Combining intelligent stops from multiple segments...');
    
    const combinedStops = {
        stopsPlan: []
    };
    
    segmentResults.forEach(segmentResult => {
        if (segmentResult.intelligentStops && segmentResult.intelligentStops.stopsPlan) {
            segmentResult.intelligentStops.stopsPlan.forEach(segment => {
                // Update segment name to include time range
                const updatedSegment = {
                    ...segment,
                    segment: `${segmentResult.segment.startTimeFormatted} - ${segmentResult.segment.endTimeFormatted}`,
                    segmentIndex: segmentResult.segment.index
                };
                
                combinedStops.stopsPlan.push(updatedSegment);
            });
        }
    });
    
    console.log(`Combined ${combinedStops.stopsPlan.length} segments with intelligent stops`);
    return combinedStops;
}

// Function to display gas stations on the map
function displayGasStations(places) {
    console.log('Displaying gas stations on map...');
    
    places.forEach((place, index) => {
        if (place.location && place.location.latitude && place.location.longitude) {
            console.log(`Adding gas station marker ${index + 1}: ${place.name}`);
            
            const latLng = new google.maps.LatLng(place.location.latitude, place.location.longitude);
            
            let marker;
            
            // Try to use Advanced Markers first, fallback to regular markers
            if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
                console.log('Using Advanced Marker Element for gas station');
                
                // Create custom marker content for gas station
                const markerContent = document.createElement('div');
                markerContent.style.cssText = `
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    border: 2px solid white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 10px;
                    color: white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    background-color: #34a853;
                `;
                markerContent.textContent = '⛽';
                
                // Create new advanced marker
                marker = new google.maps.marker.AdvancedMarkerElement({
                    position: latLng,
                    map: map,
                    title: place.name,
                    content: markerContent
                });
                
            } else {
                console.log('Advanced Markers not available, using regular Marker for gas station');
                
                // Create regular marker with gas station icon
                const iconUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="14" cy="14" r="14" fill="#34a853" stroke="#ffffff" stroke-width="2"/>
                        <text x="14" y="18" text-anchor="middle" fill="white" font-size="12" font-weight="bold">⛽</text>
                    </svg>
                `);
                
                marker = new google.maps.Marker({
                    position: latLng,
                    map: map,
                    title: place.name,
                    icon: {
                        url: iconUrl,
                        scaledSize: new google.maps.Size(28, 28),
                        anchor: new google.maps.Point(14, 14)
                    }
                });
            }
            
            // Store reference to marker
            gasStationMarkers.push(marker);
            
            // Create info window content
            const infoContent = `
                <div style="padding: 12px; min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">${place.name}</h3>
                    <p style="margin: 0 0 6px 0; color: #666; font-size: 14px;">${place.address}</p>
                    ${place.rating ? `<p style="margin: 0 0 6px 0; color: #333; font-size: 14px;">⭐ ${place.rating}/5 (${place.userRatingCount} reviews)</p>` : ''}
                    ${place.isOpen ? '<p style="margin: 0 0 6px 0; color: #34a853; font-size: 14px; font-weight: bold;">🟢 Open Now</p>' : '<p style="margin: 0 0 6px 0; color: #ea4335; font-size: 14px; font-weight: bold;">🔴 Closed</p>'}
                    ${place.priceLevel ? `<p style="margin: 0 0 6px 0; color: #333; font-size: 14px;">💰 ${'$'.repeat(place.priceLevel)}</p>` : ''}
                    ${place.detourTime || place.detourDistanceFormatted ? `
                        <div class="station-routing">
                            ${place.detourTimeMinutes ? `<span class="station-detour-time">⚠️ Detour: ${place.detourTimeMinutes} min</span>` : ''}
                            ${place.detourDistanceFormatted ? `<span class="station-detour-distance">📏 ${place.detourDistanceFormatted}</span>` : ''}
                            ${place.directionsUri ? `<a href="${place.directionsUri}" target="_blank" class="station-directions">🗺️ Directions</a>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Add info window for the marker
            const infoWindow = new google.maps.InfoWindow({
                content: infoContent
            });
            
            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });
        }
    });
    
    console.log(`Displayed ${gasStationMarkers.length} gas station markers on map`);
}

// Function to display AI-recommended stops with special markers
function displayAIRecommendedStops(intelligentStops) {
    console.log('Displaying AI-recommended stops with special markers...');
    
    if (!intelligentStops || !intelligentStops.stopsPlan) {
        return;
    }
    
    // Clear any existing AI markers
    clearAIRecommendedMarkers();
    
    intelligentStops.stopsPlan.forEach((segment, segmentIndex) => {
        segment.recommendedPlaces.forEach((place, placeIndex) => {
            if (place.location && place.location.latitude && place.location.longitude) {
                console.log(`Adding AI-recommended marker for ${place.name} in segment ${segment.segment}`);
                
                const latLng = new google.maps.LatLng(place.location.latitude, place.location.longitude);
                
                let marker;
                
                // Try to use Advanced Markers first, fallback to regular markers
                if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
                    console.log('Using Advanced Marker Element for AI-recommended stop');
                    
                    // Create custom marker content for AI-recommended stop
                    const markerContent = document.createElement('div');
                    markerContent.style.cssText = `
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        border: 3px solid white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 12px;
                        color: white;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                        position: relative;
                    `;
                    markerContent.textContent = '🤖';
                    
                    // Add segment indicator
                    const segmentIndicator = document.createElement('div');
                    segmentIndicator.style.cssText = `
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: #f39c12;
                        border: 2px solid white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 10px;
                        font-weight: bold;
                        color: white;
                    `;
                    segmentIndicator.textContent = segmentIndex + 1;
                    markerContent.appendChild(segmentIndicator);
                    
                    // Create new advanced marker
                    marker = new google.maps.marker.AdvancedMarkerElement({
                        position: latLng,
                        map: map,
                        title: `🤖 AI-Recommended: ${place.name}`,
                        content: markerContent
                    });
                    
                } else {
                    console.log('Advanced Markers not available, using regular Marker for AI-recommended stop');
                    
                    // Create regular marker with AI-recommended icon
                    const iconUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="16" cy="16" r="16" fill="url(#gradient)" stroke="#ffffff" stroke-width="3"/>
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
                                    <stop offset="100%" style="stop-color:#ee5a24;stop-opacity:1" />
                                </linearGradient>
                            </defs>
                            <text x="16" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">🤖</text>
                            <circle cx="24" cy="8" r="8" fill="#f39c12" stroke="#ffffff" stroke-width="2"/>
                            <text x="24" y="11" text-anchor="middle" fill="white" font-size="8" font-weight="bold">${segmentIndex + 1}</text>
                        </svg>
                    `);
                    
                    marker = new google.maps.Marker({
                        position: latLng,
                        map: map,
                        title: `🤖 AI-Recommended: ${place.name}`,
                        icon: {
                            url: iconUrl,
                            scaledSize: new google.maps.Size(32, 32),
                            anchor: new google.maps.Point(16, 16)
                        }
                    });
                }
                
                // Store reference to marker
                aiRecommendedMarkers.push(marker);
                
                // Create enhanced info window content for AI-recommended stops
                const infoContent = `
                    <div style="padding: 16px; min-width: 280px; background: linear-gradient(135deg, #fff5f5, #fff); border-left: 4px solid #ff6b6b;">
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <span style="font-size: 20px; margin-right: 8px;">🤖</span>
                            <h3 style="margin: 0; color: #333; font-size: 18px; font-weight: bold;">${place.name}</h3>
                        </div>
                        <div style="background: #f8f9fa; padding: 8px; border-radius: 6px; margin-bottom: 12px;">
                            <p style="margin: 0; color: #666; font-size: 14px;">📍 ${place.address}</p>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                            ${place.rating ? `<span style="background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 12px;">⭐ ${place.rating}/5 (${place.userRatingCount} reviews)</span>` : ''}
                            <span style="background: #d1ecf1; color: #0c5460; padding: 4px 8px; border-radius: 4px; font-size: 12px;">⚠️ ${place.detourTimeMinutes} min detour</span>
                            <span style="background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-size: 12px;">📏 ${place.detourDistanceKm} km</span>
                        </div>
                        <div style="background: #e2e3e5; padding: 8px; border-radius: 6px; margin-bottom: 12px;">
                            <p style="margin: 0; color: #495057; font-size: 13px; font-style: italic;">💡 ${place.reasoning}</p>
                        </div>
                        <div style="background: #fff3cd; padding: 8px; border-radius: 6px; margin-bottom: 12px;">
                            <p style="margin: 0; color: #856404; font-size: 13px; font-weight: bold;">🎯 Segment: ${segment.segment}</p>
                        </div>
                        ${place.directionsUri ? `<a href="${place.directionsUri}" target="_blank" style="display: inline-block; background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: bold;">🗺️ Get Directions</a>` : ''}
                    </div>
                `;
                
                // Add info window for the marker
                const infoWindow = new google.maps.InfoWindow({
                    content: infoContent
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });
            }
        });
    });
    
    console.log(`Displayed ${aiRecommendedMarkers.length} AI-recommended stop markers on map`);
}

// Function to clear AI-recommended stop markers
function clearAIRecommendedMarkers() {
    console.log('Clearing existing AI-recommended stop markers...');
    
    aiRecommendedMarkers.forEach(marker => {
        if (marker.map !== undefined) {
            marker.map = null; // Advanced Marker
        } else {
            marker.setMap(null); // Regular Marker
        }
    });
    
    aiRecommendedMarkers = [];
    console.log('AI-recommended stop markers cleared');
}

// Function to clear gas station markers
function clearGasStationMarkers() {
    console.log('Clearing existing gas station markers...');
    
    gasStationMarkers.forEach(marker => {
        if (marker.map !== undefined) {
            marker.map = null; // Advanced Marker
        } else {
            marker.setMap(null); // Regular Marker
        }
    });
    
    gasStationMarkers = [];
    console.log('Gas station markers cleared');
}

// Function to show gas stations information
function showGasStationsInfo(places) {
    const gasStationsInfo = document.getElementById('gasStationsInfo');
    
    if (!gasStationsInfo) {
        // Create the gas stations info section if it doesn't exist
        const routeInfo = document.getElementById('routeInfo');
        if (routeInfo) {
            const gasStationsSection = document.createElement('div');
            gasStationsSection.id = 'gasStationsInfo';
            gasStationsSection.className = 'gas-stations-info';
            gasStationsSection.innerHTML = `
                <h3>Gas Stations Along Route</h3>
                <div class="gas-stations-list" id="gasStationsList"></div>
            `;
            routeInfo.appendChild(gasStationsSection);
        }
    }
    
    const gasStationsList = document.getElementById('gasStationsList');
    if (gasStationsList) {
        if (places.length === 0) {
            gasStationsList.innerHTML = '<p style="color: #666; font-style: italic;">No gas stations found along this route.</p>';
        } else {
            const stationsHTML = places.map(place => `
                <div class="gas-station-item">
                    <div class="station-name">${place.name}</div>
                    <div class="station-details">
                        <span class="station-address">${place.address}</span>
                        ${place.rating ? `<span class="station-rating">⭐ ${place.rating}/5</span>` : ''}
                        ${place.isOpen ? '<span class="station-status open">🟢 Open</span>' : '<span class="station-status closed">🔴 Closed</span>'}
                    </div>
                    ${place.detourTime || place.detourDistanceFormatted ? `
                        <div class="station-routing">
                            ${place.detourTimeMinutes ? `<span class="station-detour-time">⚠️ Detour: ${place.detourTimeMinutes} min</span>` : ''}
                            ${place.detourDistanceFormatted ? `<span class="station-detour-distance">📏 ${place.detourDistanceFormatted}</span>` : ''}
                            ${place.directionsUri ? `<a href="${place.directionsUri}" target="_blank" class="station-directions">🗺️ Directions</a>` : ''}
                        </div>
                    ` : ''}
                </div>
            `).join('');
            
            gasStationsList.innerHTML = stationsHTML;
        }
    }
}

// Function to show gas stations info with segment information
function showGasStationsInfoWithSegments(places, segments) {
    const gasStationsInfo = document.getElementById('gasStationsInfo');
    
    if (!gasStationsInfo) {
        // Create the gas stations info section if it doesn't exist
        const routeInfo = document.getElementById('routeInfo');
        if (routeInfo) {
            const gasStationsSection = document.createElement('div');
            gasStationsSection.id = 'gasStationsInfo';
            gasStationsSection.className = 'gas-stations-info';
            gasStationsSection.innerHTML = `
                <h3>⛽ Gas Stations Along Route</h3>
                <div class="segment-summary" id="segmentSummary"></div>
                <div class="gas-stations-list" id="gasStationsList"></div>
            `;
            routeInfo.appendChild(gasStationsSection);
        }
    }
    
    // Group places by segment
    const placesBySegment = {};
    segments.forEach(segment => {
        placesBySegment[segment.index] = [];
    });
    
    places.forEach(place => {
        if (place.segment !== undefined && placesBySegment[place.segment]) {
            placesBySegment[place.segment].push(place);
        }
    });
    
    // Display places grouped by segment
    const gasStationsList = document.getElementById('gasStationsList');
    if (gasStationsList) {
        let html = '';
        
        segments.forEach(segment => {
            const segmentPlaces = placesBySegment[segment.index] || [];
            if (segmentPlaces.length > 0) {
                html += `
                    <div class="segment-group">
                        <h4 class="segment-title">${segment.startTimeFormatted} Segment</h4>
                        <div class="segment-places">
                            ${segmentPlaces.map(place => `
                                <div class="gas-station-item">
                                    <div class="station-name">${place.name}</div>
                                    <div class="station-address">${place.address}</div>
                                    <div class="station-details">
                                        ${place.rating ? `<span class="station-rating">⭐ ${place.rating}/5 (${place.userRatingCount} reviews)</span>` : ''}
                                        ${place.isOpen ? '<span class="station-status open">🟢 Open</span>' : '<span class="station-status closed">🔴 Closed</span>'}
                                        ${place.priceLevel ? `<span class="station-price">💰 ${'$'.repeat(place.priceLevel)}</span>` : ''}
                                    </div>
                                    ${place.detourTime || place.detourDistanceFormatted ? `
                                        <div class="station-routing">
                                            ${place.detourTimeMinutes ? `<span class="station-detour-time">⚠️ Detour: ${place.detourTimeMinutes} min</span>` : ''}
                                            ${place.detourDistanceFormatted ? `<span class="station-detour-distance">📏 ${place.detourDistanceFormatted}</span>` : ''}
                                            ${place.directionsUri ? `<a href="${place.directionsUri}" target="_blank" class="station-directions">🗺️ Directions</a>` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        });
        
        gasStationsList.innerHTML = html;
    }
}

// Function to show intelligent stops from Gemini API
function showIntelligentStops(intelligentStops) {
    if (!intelligentStops || !intelligentStops.stopsPlan) {
        return;
    }
    
    const gasStationsInfo = document.getElementById('gasStationsInfo');
    if (!gasStationsInfo) return;
    
    // Create intelligent stops section
    const intelligentStopsSection = document.createElement('div');
    intelligentStopsSection.id = 'intelligentStopsSection';
    intelligentStopsSection.className = 'intelligent-stops-section';
    intelligentStopsSection.innerHTML = `
        <h3>🤖 AI-Recommended Stops</h3>
        <div class="intelligent-stops-list" id="intelligentStopsList"></div>
    `;
    
    // Insert before the regular gas stations list
    const gasStationsList = document.getElementById('gasStationsList');
    if (gasStationsList) {
        gasStationsInfo.insertBefore(intelligentStopsSection, gasStationsList);
    }
    
    const intelligentStopsList = document.getElementById('intelligentStopsList');
    if (intelligentStopsList) {
        const stopsHTML = intelligentStops.stopsPlan.map(segment => `
            <div class="segment-item">
                <h4 class="segment-title">${segment.segment}</h4>
                <div class="segment-places">
                    ${segment.recommendedPlaces.map(place => `
                        <div class="recommended-place">
                            <div class="place-name">${place.name}</div>
                            <div class="place-address">${place.address}</div>
                            <div class="place-details">
                                ${place.rating ? `<span class="place-rating">⭐ ${place.rating}/5 (${place.userRatingCount} reviews)</span>` : ''}
                                <span class="place-detour">⚠️ ${place.detourTimeMinutes} min detour</span>
                                <span class="place-distance">📏 ${place.detourDistanceKm} km</span>
                            </div>
                            <div class="place-reasoning">💡 ${place.reasoning}</div>
                            ${place.directionsUri ? `<a href="${place.directionsUri}" target="_blank" class="place-directions">🗺️ Get Directions</a>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        intelligentStopsList.innerHTML = stopsHTML;
    }
    
    // Display AI-recommended stops on the map with special markers
    displayAIRecommendedStops(intelligentStops);
}

// Function to manually search for gas stations
function searchGasStationsManually() {
    console.log('Manual gas station search requested...');
    
    // Check if we have the current route data stored
    if (currentRoute && currentRoute.polyline) {
        console.log('Found route polyline from current route data, searching for gas stations...');
        console.log('Using polyline:', currentRoute.polyline.substring(0, 50) + '...');
        searchGasStationsAlongRoute(currentRoute.polyline);
    } else {
        console.log('No route data available for gas station search');
        showError('Please plan a route first before searching for gas stations');
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
        
        // Store the current route data for future use
        currentRoute = data;
        
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
            
            // Gas station search is now only manual - removed automatic search
            
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
    
    // Also clear gas station markers and info
    clearGasStationMarkers();
    clearAIRecommendedMarkers();
    
    // Remove gas stations info section if it exists
    const gasStationsInfo = document.getElementById('gasStationsInfo');
    if (gasStationsInfo) {
        gasStationsInfo.remove();
    }
    
    // Remove intelligent stops section if it exists
    const intelligentStopsSection = document.getElementById('intelligentStopsSection');
    if (intelligentStopsSection) {
        intelligentStopsSection.remove();
    }
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

// Function to show segment summary
function showSegmentSummary(segments, allPlaces) {
    const segmentSummary = document.getElementById('segmentSummary');
    if (segmentSummary) {
        const totalPlaces = allPlaces.length;
        const avgPlacesPerSegment = Math.round(totalPlaces / segments.length);
        
        const summaryHTML = `
            <div class="segment-overview">
                <h4>📊 Route Segmentation Summary</h4>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Route Duration:</span>
                        <span class="stat-value">${Math.round(segments[0].endTime * segments.length / 60)} minutes</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Number of Segments:</span>
                        <span class="stat-value">${segments.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Segment Duration:</span>
                        <span class="stat-value">~${Math.round(segments[0].endTime / 60)} minutes each</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Gas Stations:</span>
                        <span class="stat-value">${totalPlaces}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Average per Segment:</span>
                        <span class="stat-value">${avgPlacesPerSegment}</span>
                    </div>
                </div>
                <div class="segment-breakdown">
                    ${segments.map((segment, index) => {
                        const segmentPlaces = allPlaces.filter(place => place.segment === index);
                        return `
                            <div class="segment-stat">
                                <span class="segment-name">${segment.startTimeFormatted}</span>
                                <span class="segment-count">${segmentPlaces.length} stations</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        segmentSummary.innerHTML = summaryHTML;
    }
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
