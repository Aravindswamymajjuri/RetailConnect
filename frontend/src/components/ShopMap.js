import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
      map.current = L.map(mapContainer.current).setView(
        [
          userLocation?.latitude || 17.450,
          userLocation?.longitude || 78.356
        ],
        12
      );

      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map.current);

      mapInitializedRef.current = true;

      // Add user location marker
      if (userLocation) {
        try {
          const blueIcon = L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMDA2NmZmIi8+PC9zdmc+',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12]
          });

          L.marker([userLocation.latitude, userLocation.longitude], { icon: blueIcon })
            .bindPopup('📍 Your Location')
            .addTo(map.current);

          // Add 5km radius circle
          L.circle([userLocation.latitude, userLocation.longitude], {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
            radius: 5000 // 5km in meters
          }).addTo(map.current);
        } catch (error) {
          console.warn('Error adding user location marker:', error);
        }
      }

      // Add zoom control
      L.control.zoom().addTo(map.current);

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
  }, [userLocation]);

  // Update markers when shops change
  useEffect(() => {
    if (!map.current || !shops.length || !mapInitializedRef.current) return;

    try {
      // Remove old markers
      markersRef.current.forEach((markerObj) => {
        try {
          if (markerObj.marker) {
            map.current.removeLayer(markerObj.marker);
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
          const isSelected = selectedShop?._id === shop._id;
          
          // Create custom icon for shop
          const customIcon = L.divIcon({
            html: `<div style="
              width: ${isSelected ? '40px' : '32px'};
              height: ${isSelected ? '40px' : '32px'};
              background-color: ${isSelected ? '#dc2626' : '#ef4444'};
              border: ${isSelected ? '3px solid #991b1b' : '2px solid white'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.3);
              cursor: pointer;
            ">🏪</div>`,
            iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
            iconAnchor: [isSelected ? 20 : 16, isSelected ? 40 : 32],
            popupAnchor: [0, isSelected ? -40 : -32],
            className: 'shop-marker'
          });

          const popupContent = `
            <div class="p-3 max-w-xs">
              <h3 class="font-bold text-base">${shop.name}</h3>
              <p class="text-sm text-gray-600">${shop.address}</p>
              <p class="text-sm font-semibold text-blue-600">📍 ${shop.distanceKm || (shop.distance?.toFixed(2))} km (${shop.distanceMeters || Math.round((shop.distance || 0) * 1000)} meters) away</p>
              <p class="text-sm text-gray-600">⭐ Rating: ${shop.averageRating ? shop.averageRating.toFixed(1) : 'N/A'} / 5</p>
              ${shop.owner ? `<p class="text-sm text-gray-600 mt-1">👤 Owner: ${shop.owner.name}</p>` : ''}
            </div>
          `;

          const marker = L.marker([lat, lon], { icon: customIcon })
            .bindPopup(popupContent)
            .addTo(map.current);

          // Click handler for marker
          marker.on('click', () => {
            setSelectedShop(shop);
            onShopSelect?.(shop);
            marker.openPopup();
          });

          markersRef.current.push({ marker, shopId: shop._id });
        } catch (error) {
          console.warn('Error adding marker for shop:', error);
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
      const bounds = L.latLngBounds([]);

      // Add user location to bounds
      if (userLocation) {
        bounds.extend([userLocation.latitude, userLocation.longitude]);
      }

      // Add all shop locations
      shops.forEach((shop) => {
        if (shop.location?.coordinates) {
          const [lon, lat] = shop.location.coordinates;
          bounds.extend([lat, lon]);
        }
      });

      // Only fit bounds if we have locations
      if (bounds.isValid()) {
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
