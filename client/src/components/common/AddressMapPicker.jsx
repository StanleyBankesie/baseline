import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { toast } from "react-toastify";
import api from "../../api/client.js";

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 5.6037,
  lng: -0.1870, // Default to Accra
};

const libraries = ['places'];


export default function AddressMapPicker(props) {
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
    return <div className="text-sm text-slate-500 py-4">Loading map configuration...</div>;
  }

  if (!apiKey) {
    return (
      <div className="bg-amber-50 text-amber-700 p-4 rounded-md border border-amber-200">
        Google Maps API Key is not configured. Please go to System Configuration &gt; General Settings to set it up.
      </div>
    );
  }

  return <AddressMapPickerInner apiKey={apiKey} {...props} />;
}

function AddressMapPickerInner({ apiKey, value, onChange, placeholder, label, layout, countryRestriction }) {
  const [markerPos, setMarkerPos] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [inputValue, setInputValue] = useState(value || "");
  const autocompleteRef = useRef(null);

  // Sync external value
  useEffect(() => {
    if (value && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries, 
  });

  const onLoadAutocomplete = (autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (!place || !place.geometry) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const name = place.formatted_address || place.name;

      setInputValue(name);
      const newPos = { lat, lng };
      setMarkerPos(newPos);
      setMapCenter(newPos);

      if (onChange) {
        onChange({ name, lat, lng });
      }
    }
  };

  const handleMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const newPos = { lat, lng };
    setMarkerPos(newPos);
    
    if (onChange) {
      onChange({ name: inputValue || 'Selected from map', lat, lng }); 
    }
  };

  if (loadError) {
    return <div className="text-red-500 py-4">Error loading Google Maps. Check your API Key.</div>;
  }

  if (!isLoaded) return <div className="text-sm text-slate-500 py-4">Loading Map...</div>;

  return (
    <div className={`gap-4 relative ${layout === 'vertical' ? 'flex flex-col' : 'flex flex-col md:flex-row'}`}>
      <div className="flex-1 relative">
        <Autocomplete
          onLoad={onLoadAutocomplete}
          onPlaceChanged={onPlaceChanged}
          options={{ componentRestrictions: { country: countryRestriction || "gh" } }}
        >
          <input
            type="text"
            className="input input-bordered w-full border-brand-500 focus:ring-brand-500 bg-brand-50"
            placeholder={placeholder || "Search with Google Places..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </Autocomplete>
        <p className="text-xs text-slate-500 mt-2">
          Search for an address or click anywhere on the map to drop a pin.
        </p>
      </div>

      <div className={`rounded-md overflow-hidden border border-slate-300 relative z-10 ${layout === 'vertical' ? 'w-full min-h-[256px]' : 'flex-1 h-64'}`}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={14}
          onClick={handleMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false
          }}
        >
          {markerPos && (
            <Marker 
              position={markerPos} 
              draggable={true}
              onDragEnd={handleMapClick} 
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
