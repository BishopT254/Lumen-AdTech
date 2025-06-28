'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LogisticsMapProps {
  devices: Array<{
    id: string;
    location: {
      lat: number;
      lng: number;
      address?: string;
    };
    status: string;
    deviceType: string;
  }>;
  onSelect: (device: any) => void;
}

const deviceIcons = {
  ANDROID_TV: new L.Icon({
    iconUrl: '/map-markers/tv.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  VEHICLE_MOUNTED: new L.Icon({
    iconUrl: '/map-markers/vehicle.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  DEFAULT: new L.Icon({
    iconUrl: '/map-markers/default.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
};

export default function LogisticsMap({ devices, onSelect }: LogisticsMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup>(new L.LayerGroup());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      mapRef.current = L.map('map', {
        center: [-1.2921, 36.8219], // Default to Nairobi coordinates
        zoom: 12,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);

      markersRef.current.addTo(mapRef.current);
    }

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    markersRef.current.clearLayers();

    devices.forEach(device => {
      if (!device.location) return;
      
      const marker = L.marker([device.location.lat, device.location.lng], {
        icon: deviceIcons[device.deviceType as keyof typeof deviceIcons] || deviceIcons.DEFAULT,
      });

      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-semibold">${device.deviceType}</h3>
          <p class="text-sm">${device.location.address || 'Unknown location'}</p>
          <p class="text-sm">Status: ${device.status}</p>
        </div>
      `);

      marker.on('click', () => onSelect(device));
      marker.addTo(markersRef.current);
    });

    if (devices.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(devices
        .filter(d => d.location)
        .map(d => [d.location.lat, d.location.lng])
      );
      
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds);
      }
    }
  }, [devices, onSelect]);

  return <div id="map" className="h-full w-full rounded-lg" />;
}