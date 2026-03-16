import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setLoading(false);
          // Keep default location (Hyderabad)
        }
      );
    } else {
      setLoading(false);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInitializedRef.current || loading) return;

    try {
      if (map.current) {
        map.current.remove();
      }

      map.current = L.map(mapContainer.current).setView(
        [selectedLocation.latitude, selectedLocation.longitude],
        13
      );

      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map.current);

      mapInitializedRef.current = true;

      // Add initial marker if location is provided
      if (selectedLocation.latitude && selectedLocation.longitude) {
        addMarker(selectedLocation.longitude, selectedLocation.latitude);
      }

      // Add click handler to map
      map.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const newLocation = { latitude: lat, longitude: lng };
        setSelectedLocation(newLocation);
        addMarker(lng, lat);
      });

      // Add zoom control
      L.control.zoom().addTo(map.current);

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
  }, [loading, selectedLocation.latitude, selectedLocation.longitude]);

  // Add or update marker on map
  const addMarker = (lng, lat) => {
    // Remove existing marker
    if (markerRef.current) {
      map.current.removeLayer(markerRef.current);
    }

    // Create custom icon
    const customIcon = L.divIcon({
      html: `<div style="
        width: 40px;
        height: 40px;
        background-color: #dc2626;
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        cursor: pointer;
      ">📍</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
      className: 'custom-icon'
    });

    markerRef.current = L.marker([lat, lng], { icon: customIcon })
      .bindPopup(`
        <div class="p-2">
          <p class="font-semibold">Shop Location</p>
          <p class="text-sm text-gray-600">📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
        </div>
      `)
      .openPopup()
      .addTo(map.current);
  };

  // Get current location
  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setSelectedLocation(newLocation);
      addMarker(newLocation.longitude, newLocation.latitude);

      // Center map on new location with Leaflet syntax
      if (map.current) {
        map.current.flyTo([newLocation.latitude, newLocation.longitude], 15, {
          duration: 1
        });
      }
    } catch (error) {
      console.error('Geolocation error:', error);
      alert('Could not get your current location. Please enable location services in your browser settings.');
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
