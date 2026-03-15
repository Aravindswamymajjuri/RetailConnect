import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

/**
 * Custom hook for real-time data fetching with Socket.io integration
 * Automatically fetches data on mount and listening for real-time updates
 */
export const useRealTimeData = (apiUrl, socketEvents = [], token) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from backend API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error(`Error fetching from ${apiUrl}:`, err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token]);

  // Setup Socket.io listeners
  useEffect(() => {
    // Fetch data on mount
    if (token && apiUrl) {
      fetchData();
    }

    // Listen for socket events if socket is available
    if (window.socket && socketEvents && socketEvents.length > 0) {
      socketEvents.forEach(event => {
        window.socket.on(event, () => {
          console.log(`📡 Real-time update received: ${event}`);
          fetchData();
        });
      });

      // Cleanup listeners
      return () => {
        socketEvents.forEach(event => {
          window.socket.off(event);
        });
      };
    }
  }, [apiUrl, socketEvents, token, fetchData]);

  return { data, loading, error, refetch: fetchData };
};

export default useRealTimeData;
