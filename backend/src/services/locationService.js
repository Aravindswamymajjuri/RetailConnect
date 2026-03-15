const logger = require('../utils/logger');

/**
 * Location and Distance Service
 * Handles geolocation calculations and nearby shop discovery
 */

const locationService = {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in kilometers
   */
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  },

  /**
   * Find nearby shops using MongoDB geospatial query
   * @param {Array} shops - Array of shops with location data
   * @param {number} userLat - User's latitude
   * @param {number} userLon - User's longitude
   * @param {number} maxDistance - Max distance in meters
   * @returns {Array} Filtered and sorted shops with distance
   */
  findNearbyShops: (shops, userLat, userLon, maxDistance = 50000) => {
    try {
      logger.debug('Finding nearby shops', { userLat, userLon, maxDistance });

      const nearbyShops = shops
        .map((shop) => {
          if (
            !shop.location ||
            !shop.location.coordinates ||
            shop.location.coordinates.length !== 2
          ) {
            return null;
          }

          const [shopLon, shopLat] = shop.location.coordinates;
          const distance = locationService.calculateDistance(userLat, userLon, shopLat, shopLon);
          const distanceInMeters = distance * 1000;

          if (distanceInMeters <= maxDistance) {
            return {
              ...shop.toObject ? shop.toObject() : shop,
              distance,
              distanceInMeters,
              distanceText: `${distance} km away`
            };
          }
          return null;
        })
        .filter((shop) => shop !== null)
        .sort((a, b) => a.distance - b.distance);

      logger.success('Nearby shops found', { count: nearbyShops.length });
      return nearbyShops;
    } catch (error) {
      logger.error('Error finding nearby shops', { error: error.message });
      throw error;
    }
  },

  /**
   * Validate location coordinates
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {boolean} True if valid
   */
  isValidLocation: (latitude, longitude) => {
    return (
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  },

  /**
   * Format location for display
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {string} Formatted location
   */
  formatLocation: (lat, lon) => {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  },

  /**
   * Get coordinates from location object
   * @param {Object} location - Location object
   * @returns {Object} {latitude, longitude}
   */
  getCoordinates: (location) => {
    if (!location || !location.coordinates || location.coordinates.length !== 2) {
      return null;
    }
    return {
      longitude: location.coordinates[0],
      latitude: location.coordinates[1]
    };
  },

  /**
   * Format distance for display
   * @param {number} distanceKm - Distance in kilometers
   * @returns {string} Formatted distance
   */
  formatDistance: (distanceKm) => {
    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000);
      return `${meters} meters`;
    }
    const km = distanceKm.toFixed(2);
    const meters = Math.round(distanceKm * 1000);
    return `${km} km (${meters}m)`;
  },

  /**
   * Format distance detailed - returns object with both km and meters
   * @param {number} distanceKm - Distance in kilometers
   * @returns {Object} {km, meters, text}
   */
  formatDistanceDetailed: (distanceKm) => {
    const meters = Math.round(distanceKm * 1000);
    const km = distanceKm.toFixed(2);
    
    let text = '';
    if (distanceKm < 1) {
      text = `${meters} m`;
    } else {
      text = `${km} km`;
    }

    return {
      km: parseFloat(km),
      meters: meters,
      text: text,
      fullText: `${km} km (${meters} meters)`
    };
  }
};

module.exports = locationService;
