import React, { useCallback, useState, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer, MarkerClusterer } from '@react-google-maps/api';
import api from '../../../../api/client.js';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = { lat: 5.6037, lng: -0.1870 }; // Default to Accra

export default function EnhancedGoogleMap({ vehicles, selectedVehicleId, onSelectVehicle, geofences }) {
  const [apiKey, setApiKey] = useState(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/admin/settings/google-maps");
        if (mounted && res?.data?.data?.api_key) {
          setApiKey(res.data.data.api_key);
        }
      } catch (err) {
        console.error("Failed to load Google Maps API Key", err);
      } finally {
        if (mounted) setApiKeyLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (apiKeyLoading) {
    return <div className="p-4 animate-pulse bg-slate-100 h-full w-full flex items-center justify-center">Loading map...</div>;
  }

  if (!apiKey) {
    return <div className="p-4 bg-amber-100 text-amber-800 m-4 rounded-lg">Google Maps API Key is not configured. Please set it in System Settings.</div>;
  }

  return <EnhancedGoogleMapInner apiKey={apiKey} vehicles={vehicles} selectedVehicleId={selectedVehicleId} onSelectVehicle={onSelectVehicle} geofences={geofences} />;
}

function EnhancedGoogleMapInner({ apiKey, vehicles, selectedVehicleId, onSelectVehicle, geofences }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: ['places', 'geometry']
  });

  const mapRef = useRef(null);
  const [directions, setDirections] = useState(null);

  const onLoad = useCallback(function callback(map) {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(function callback(map) {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (selectedVehicleId) {
      const v = vehicles.find(v => v.trip_id === selectedVehicleId);
      if (v) {
        const lat = v.latitude ? Number(v.latitude) : (v.origin_lat ? Number(v.origin_lat) : null);
        const lng = v.longitude ? Number(v.longitude) : (v.origin_lng ? Number(v.origin_lng) : null);
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(16);
        }
      }
    } else if (vehicles?.length > 0) {
      // Fit bounds to all vehicles
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidCoords = false;
      vehicles.forEach(v => {
        const lat = v.latitude ? Number(v.latitude) : (v.origin_lat ? Number(v.origin_lat) : null);
        const lng = v.longitude ? Number(v.longitude) : (v.origin_lng ? Number(v.origin_lng) : null);
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          bounds.extend({ lat, lng });
          hasValidCoords = true;
        }
      });
      if (hasValidCoords) mapRef.current.fitBounds(bounds);
    }
  }, [selectedVehicleId, vehicles]);

  // Fetch directions for selected vehicle
  useEffect(() => {
    if (!selectedVehicleId || !window.google || !isLoaded) {
      setDirections(null);
      return;
    }
    const v = vehicles.find(v => v.trip_id === selectedVehicleId);
    if (!v || !v.origin_lat || !v.destination_lat) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route({
      origin: { lat: Number(v.origin_lat), lng: Number(v.origin_lng) },
      destination: { lat: Number(v.destination_lat), lng: Number(v.destination_lng) },
      travelMode: window.google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        setDirections(result);
      }
    });
  }, [selectedVehicleId, vehicles, isLoaded]);

  if (loadError) return <div className="p-4 text-red-500">Error loading maps</div>;
  if (!isLoaded) return <div className="p-4 animate-pulse bg-slate-100 h-full w-full"></div>;

  const getMarkerIcon = (v) => {
    // Generate SVG for rotated truck icon
    const color = v.status === 'COMPLETED' ? '#6b7280' : (!v.speed && v.status === 'IN_TRANSIT') ? '#3b82f6' : (v.speed > 0 ? '#10b981' : '#f43f5e');
    const heading = v.heading || 0;
    
    return {
      path: 'M17.402,0H5.643C4.518,0,3.628,0.89,3.628,2.015v21.579c0,1.125,0.89,2.015,2.015,2.015h11.759c1.125,0,2.015-0.89,2.015-2.015V2.015C19.417,0.89,18.527,0,17.402,0z M11.52,24.321c-0.902,0-1.633-0.73-1.633-1.632c0-0.902,0.73-1.632,1.633-1.632c0.901,0,1.632,0.73,1.632,1.632C13.152,23.591,12.421,24.321,11.52,24.321z M17.387,19.344H5.66V3.882h11.728V19.344z',
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: '#ffffff',
      rotation: heading,
      scale: 1.2,
      anchor: new window.google.maps.Point(11, 13)
    };
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={12}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: true,
        fullscreenControl: true,
        styles: [
          // Add custom map styles here for dark mode if needed
        ]
      }}
    >
      {directions && (
        <DirectionsRenderer 
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#3b82f6', strokeWeight: 4, strokeOpacity: 0.8 }
          }} 
        />
      )}

      <MarkerClusterer options={{ imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m' }}>
        {(clusterer) => (
          <>
            {vehicles.map((v) => {
              const lat = v.latitude ? Number(v.latitude) : (v.origin_lat ? Number(v.origin_lat) : null);
              const lng = v.longitude ? Number(v.longitude) : (v.origin_lng ? Number(v.origin_lng) : null);
              if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
              const isSelected = selectedVehicleId === v.trip_id;

              return (
                <Marker
                  key={v.trip_id}
                  position={{ lat, lng }}
                  icon={getMarkerIcon(v)}
                  onClick={() => onSelectVehicle(v)}
                  clusterer={clusterer}
                  zIndex={isSelected ? 1000 : 1}
                >
                  {isSelected && (
                    <InfoWindow onCloseClick={() => onSelectVehicle(null)}>
                      <div className="p-1 min-w-[200px]">
                        <h3 className="font-bold text-slate-800">{v.registration_number}</h3>
                        <p className="text-xs text-slate-500 mb-2">{v.driver_name}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-slate-400">Speed</p>
                            <p className="font-semibold">{v.speed || 0} km/h</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Status</p>
                            <p className="font-semibold">{v.status}</p>
                          </div>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              );
            })}
          </>
        )}
      </MarkerClusterer>
    </GoogleMap>
  );
}
