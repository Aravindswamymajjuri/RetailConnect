import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox token here
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'your_mapbox_token_here';

export const ShopMap = ({ shops = [], userLocation, onShopSelect, title = 'Nearby Shops' }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const markersRef = useRef([]);
  const mapInitializedRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInitializedRef.current) return;

    try {
      // Check if map already exists (prevent duplicate initialization)
      if (map.current) {
        map.current.remove();
      }

      // Create map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [
          userLocation?.longitude || 78.356,
          userLocation?.latitude || 17.450
        ],
        zoom: 12,
        attributionControl: true
      });

      mapInitializedRef.current = true;

      // Wait for map to load before adding resources
      map.current.on('load', () => {
        if (!map.current) return;

        // Add user location marker
        if (userLocation) {
          try {
            new mapboxgl.Marker({ color: '#0066ff' })
              .setLngLat([userLocation.longitude, userLocation.latitude])
              .setPopup(new mapboxgl.Popup().setText('📍 Your Location'))
              .addTo(map.current);

            // Add 5km radius circle visualization
            if (!map.current.getSource('radius-circle')) {
              map.current.addSource('radius-circle', {
                'type': 'geojson',
                'data': {
                  'type': 'Feature',
                  'geometry': {
                    'type': 'Point',
                    'coordinates': [userLocation.longitude, userLocation.latitude]
                  }
                }
              });

              // Add circle layer (5km radius = ~0.045 degrees at equator)
              map.current.addLayer({
                'id': 'radius-circle-layer',
                'type': 'circle',
                'source': 'radius-circle',
                'paint': {
                  'circle-radius': {
                    'type': 'exponential',
                    'base': 2,
                    'stops': [
                      [0, 0],
                      [20, 100]
                    ]
                  },
                  'circle-color': '#3b82f6',
                  'circle-opacity': 0.1,
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#3b82f6',
                  'circle-stroke-opacity': 0.5
                }
              });
            }
          } catch (error) {
            console.warn('Error adding user location marker:', error);
          }
        }
      });

      // Add navigation controls
      if (map.current) {
        map.current.addControl(new mapboxgl.NavigationControl());
        map.current.addControl(new mapboxgl.FullscreenControl());
      }

      // Clean up function
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
  }, [userLocation?.latitude, userLocation?.longitude]);

  // Update markers when shops change
  useEffect(() => {
    if (!map.current || !shops.length || !mapInitializedRef.current) return;

    try {
      // Remove old markers
      markersRef.current.forEach((markerObj) => {
        try {
          if (markerObj.marker) {
            markerObj.marker.remove();
          }
        } catch (error) {
          console.warn('Error removing marker:', error);
        }
      });
      markersRef.current = [];

      // Add new markers for each shop
      shops.forEach((shop) => {
        try {
          if (!shop.location || !shop.location.coordinates) return;

          const [lon, lat] = shop.location.coordinates;
          
          // Create a custom HTML marker element (red dot for shops)
          const el = document.createElement('div');
          el.className = 'shop-marker';
          el.style.width = '32px';
          el.style.height = '32px';
          el.style.backgroundColor = selectedShop?._id === shop._id ? '#dc2626' : '#ef4444';
          el.style.border = selectedShop?._id === shop._id ? '3px solid #991b1b' : '2px solid white';
          el.style.borderRadius = '50%';
          el.style.cursor = 'pointer';
          el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.fontSize = '18px';
          el.innerHTML = '🏪';

          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-3 max-w-xs">
              <h3 class="font-bold text-base">${shop.name}</h3>
              <p class="text-sm text-gray-600">${shop.address}</p>
              <p class="text-sm font-semibold text-blue-600">📍 ${shop.distanceKm || (shop.distance?.toFixed(2))} km (${shop.distanceMeters || Math.round((shop.distance || 0) * 1000)} meters) away</p>
              <p class="text-sm text-gray-600">⭐ Rating: ${shop.averageRating ? shop.averageRating.toFixed(1) : 'N/A'} / 5</p>
              ${shop.owner ? `<p class="text-sm text-gray-600 mt-1">👤 Owner: ${shop.owner.name}</p>` : ''}
            </div>
          `);

          const marker = new mapboxgl.Marker(el)
            .setLngLat([lon, lat])
            .setPopup(popup)
            .addTo(map.current);

          // Click handler for marker
          el.addEventListener('click', () => {
            setSelectedShop(shop);
            onShopSelect?.(shop);
            marker.togglePopup();
          });

          markersRef.current.push({ marker, el, shopId: shop._id });
        } catch (error) {
          console.warn('Error adding marker for shop:', error);
        }
      });

      // Update existing markers' styling when selectedShop changes
      markersRef.current.forEach((markerObj) => {
        try {
          const isSelected = selectedShop?._id === markerObj.shopId;
          markerObj.el.style.backgroundColor = isSelected ? '#dc2626' : '#ef4444';
          markerObj.el.style.border = isSelected ? '3px solid #991b1b' : '2px solid white';
          markerObj.el.style.width = isSelected ? '40px' : '32px';
          markerObj.el.style.height = isSelected ? '40px' : '32px';
        } catch (error) {
          console.warn('Error updating marker style:', error);
        }
      });
    } catch (error) {
      console.error('Error updating markers:', error);
    }
  }, [shops, selectedShop, onShopSelect]);

  // Auto-zoom to fit all markers
  useEffect(() => {
    if (!map.current || !shops.length || !mapInitializedRef.current) return;

    try {
      const bounds = new mapboxgl.LngLatBounds();

      // Add user location to bounds
      if (userLocation) {
        bounds.extend([userLocation.longitude, userLocation.latitude]);
      }

      // Add all shop locations
      shops.forEach((shop) => {
        if (shop.location?.coordinates) {
          bounds.extend(shop.location.coordinates);
        }
      });

      // Only fit bounds if we have locations
      if (!bounds.isEmpty?.()) {
        map.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.warn('Error fitting bounds:', error);
    }
  }, [shops, userLocation]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-gray-600">{shops.length} shops found within 5km radius</p>
      </div>
      <div
        ref={mapContainer}
        className="w-full h-96 rounded-lg shadow-lg border border-gray-300 relative"
        style={{ minHeight: '400px' }}
      >
        {/* Map Legend */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
          <h3 className="font-bold text-gray-900 mb-3">🗺️ Map Legend</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-700"></div>
              <span>Your Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span>Wholesale Shops</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-400 border-2 border-blue-400"></div>
              <span>5km Search Radius</span>
            </div>
          </div>
        </div>
      </div>
      {selectedShop && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
          <h3 className="font-bold text-lg text-blue-900">{selectedShop.name}</h3>
          <p className="text-gray-700">{selectedShop.address}</p>
          <p className="text-blue-600 font-semibold mt-2">
            📍 {selectedShop.distanceKm || selectedShop.distance?.toFixed(2)} km ({selectedShop.distanceMeters || Math.round((selectedShop.distance || 0) * 1000)} meters) away
          </p>
          <p className="text-gray-600 mt-2">⭐ Rating: {selectedShop.averageRating ? selectedShop.averageRating.toFixed(1) : 'N/A'} / 5</p>
          {selectedShop.owner && (
            <p className="text-gray-600 mt-2">👤 Owner: {selectedShop.owner.name}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ShopMap;
