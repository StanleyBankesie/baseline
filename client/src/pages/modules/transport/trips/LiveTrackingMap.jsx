import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Spin, message } from 'antd';
import L from 'leaflet';
import api from '../../../../api/client.js';

// Fix for default marker icons in leaflet with webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export default function LiveTrackingMap({ tripId }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    try {
      const res = await api.get(`/transport/trips/${tripId}/locations`);
      if (res.data?.success) {
        setLocations(res.data.data.locations || []);
      }
    } catch (err) {
      console.error("Failed to fetch GPS data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // Poll every 10 seconds for live tracking
    const interval = setInterval(fetchLocations, 10000);
    return () => clearInterval(interval);
  }, [tripId]);

  if (loading && locations.length === 0) {
    return <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  }

  if (locations.length === 0) {
    return <div style={{ height: 400, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No GPS data available for this trip yet.</div>;
  }

  const positions = locations.map(loc => [parseFloat(loc.latitude), parseFloat(loc.longitude)]);
  const currentPosition = positions[positions.length - 1];

  return (
    <div style={{ height: 400, width: '100%', borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer center={currentPosition} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={positions} color="blue" />
        <Marker position={currentPosition}>
          <Popup>
            Driver Current Location <br/>
            Speed: {locations[locations.length - 1].speed} km/h <br/>
            Recorded At: {new Date(locations[locations.length - 1].recorded_at).toLocaleString()}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
