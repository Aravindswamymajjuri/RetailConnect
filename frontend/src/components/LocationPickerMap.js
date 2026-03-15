import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox token here
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'your_mapbox_token_here';

/**
 * LocationPickerMap Component
 * Allows users to click on a map to select their shop location
 * Returns coordinates { latitude, longitude }
 * Automatically centers on user's current location
 */
export const LocationPickerMap = ({ onLocationSelect, initialLocation = null, title = 'Select Your Shop Location' }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markerRef = useRef(null);
  const mapInitializedRef = useRef(false);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || { latitude: 17.35, longitude: 78.65 });
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setSelectedLocation(userLocation);
          setLoading(false);
          setLocationError(null);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setLocationError('Using default location');
          setLoading(false);
          // Keep default location (Hyderabad)
        }
      );
    } else {
      setLoading(false);
      setLocationError('Geolocation not supported');
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInitializedRef.current || loading) return;

    try {
      if (map.current) {
        map.current.remove();
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [selectedLocation.longitude, selectedLocation.latitude],
        zoom: 13,
        attributionControl: true
      });

      mapInitializedRef.current = true;

      // Wait for map to load
      map.current.on('load', () => {
        if (!map.current) return;

        // Add initial marker if location is provided
        if (selectedLocation.latitude && selectedLocation.longitude) {
          addMarker(selectedLocation.longitude, selectedLocation.latitude);
        }

        // Add click handler to map
        map.current.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          const newLocation = { latitude: lat, longitude: lng };
          setSelectedLocation(newLocation);
          addMarker(lng, lat);
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl());
      });

      return () => {
        mapInitializedRef.current = false;
        if (map.current) {
          try {
            map.current.remove();
            map.current = null;
          } catch (error) {
            console.warn('Error removing map:', error);
          }
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      mapInitializedRef.current = false;
    }
  }, [loading]);

  // Add or update marker on map
  const addMarker = (lng, lat) => {
    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create new marker
    const el = document.createElement('div');
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.backgroundColor = '#dc2626';
    el.style.border = '3px solid white';
    el.style.borderRadius = '50%';
    el.style.cursor = 'pointer';
    el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '20px';
    el.innerHTML = '📍';

    markerRef.current = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <p class="font-semibold">Shop Location</p>
            <p class="text-sm text-gray-600">📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
          </div>
        `)
      )
      .addTo(map.current);

    markerRef.current.togglePopup();
  };

  // Get current location
  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setSelectedLocation(newLocation);
      addMarker(newLocation.longitude, newLocation.latitude);

      // Center map on new location
      if (map.current) {
        map.current.flyTo({
          center: [newLocation.longitude, newLocation.latitude],
          zoom: 15,
          duration: 1000
        });
      }
    } catch (error) {
      alert('Could not get your current location. Please enable location services.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Confirm location selection
  const handleConfirmLocation = () => {
    onLocationSelect?.(selectedLocation);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">
        {loading 
          ? '📍 Getting your current location...' 
          : 'Click on the map to select your shop location, or use your current location'}
      </p>

      {/* Loading State */}
      {loading && (
        <div className="w-full h-96 rounded-lg shadow-md border-2 border-gray-300 mb-4 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600 font-semibold">📍 Getting your location...</p>
            <p className="text-xs text-gray-500 mt-2">Please allow location access in your browser</p>
          </div>
        </div>
      )}

      {/* Map Container - Only show when not loading */}
      {!loading && (
        <>
          <div
            ref={mapContainer}
            className="w-full h-96 rounded-lg shadow-md border-2 border-gray-300 mb-4"
            style={{ minHeight: '400px' }}
          />

          {/* Controls */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={handleGetCurrentLocation}
              disabled={isGettingLocation}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:bg-gray-400"
            >
              {isGettingLocation ? '🔍 Getting location...' : '📍 Use Current Location'}
            </button>

            <button
              onClick={handleConfirmLocation}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              ✅ Confirm Location
            </button>
          </div>

          {/* Selected Coordinates Display */}
          {selectedLocation.latitude && selectedLocation.longitude && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">📌 Selected Location</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Latitude</p>
                  <p className="text-lg font-mono font-bold text-blue-600">{selectedLocation.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Longitude</p>
                  <p className="text-lg font-mono font-bold text-blue-600">{selectedLocation.longitude.toFixed(6)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
