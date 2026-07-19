'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface FacilityOnMap {
  facility_id: number;
  facility_name: string;
  short_name?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  is_primary?: boolean;
  logo_url?: string;
  pendingRequests: any[];
}

interface BloodMapProps {
  facilities: FacilityOnMap[];
  onFacilitySelect: (facility: FacilityOnMap) => void;
  selectedFacilityId?: number | null;
}

// Custom marker SVG for hospitals
const createHospitalIcon = (count: number, isSelected: boolean, isPrimary: boolean) => {
  const size = isSelected ? 44 : 36;
  const color = count > 0 ? (count >= 3 ? '#dc2626' : '#f59e0b') : '#10b981';
  const borderColor = isSelected ? '#1a2332' : color;
  const bgColor = isSelected ? color : '#ffffff';
  const textColor = isSelected ? '#ffffff' : color;

  const svg = `
    <svg width="${size}" height="${size + 12}" viewBox="0 0 ${size} ${size + 12}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-10%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.2"/>
        </filter>
      </defs>
      <!-- Pin shape -->
      <path d="M${size/2} ${size + 10} L${size/2 - 6} ${size - 2} A${size/2 - 2} ${size/2 - 2} 0 1 1 ${size/2 + 6} ${size - 2} Z" 
            fill="${borderColor}" filter="url(#shadow)"/>
      <!-- Circle background -->
      <circle cx="${size/2}" cy="${size/2 - 1}" r="${size/2 - 3}" fill="${bgColor}" stroke="${borderColor}" stroke-width="2.5"/>
      <!-- Cross icon -->
      <rect x="${size/2 - 7}" y="${size/2 - 3}" width="14" height="5" rx="1" fill="${textColor}"/>
      <rect x="${size/2 - 2.5}" y="${size/2 - 8}" width="5" height="14" rx="1" fill="${textColor}"/>
      ${count > 0 ? `
        <!-- Badge -->
        <circle cx="${size - 6}" cy="6" r="8" fill="#dc2626" stroke="#fff" stroke-width="1.5"/>
        <text x="${size - 6}" y="10" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold" font-family="Arial">${count > 9 ? '9+' : count}</text>
      ` : ''}
      ${isPrimary ? `
        <!-- Star badge -->
        <circle cx="6" cy="6" r="6" fill="#f59e0b" stroke="#fff" stroke-width="1.5"/>
        <text x="6" y="9.5" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">★</text>
      ` : ''}
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-hospital-marker',
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 10],
    popupAnchor: [0, -(size + 5)],
  });
};

export default function BloodMap({ facilities, onFacilitySelect, selectedFacilityId }: BloodMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Vietnam center coordinates
  const defaultCenter: [number, number] = [10.8231, 106.6297]; // Ho Chi Minh City
  const defaultZoom = 12;

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Use CartoDB Positron tiles for a clean, professional look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Attribution
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© <a href="https://carto.com/">CARTO</a> | © <a href="https://www.openstreetmap.org/">OSM</a>')
      .addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when facilities change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    const validFacilities = facilities.filter(f => f.latitude && f.longitude);

    validFacilities.forEach(facility => {
      const count = facility.pendingRequests?.length || 0;
      const isSelected = facility.facility_id === selectedFacilityId;
      const icon = createHospitalIcon(count, isSelected, facility.is_primary || false);

      const marker = L.marker([facility.latitude!, facility.longitude!], { icon })
        .on('click', () => {
          onFacilitySelect(facility);
        });

      // Tooltip
      marker.bindTooltip(
        `<div style="font-family: system-ui; padding: 2px 0;">
          <div style="font-weight: 700; font-size: 12px; color: #1a2332; margin-bottom: 2px;">${facility.facility_name}</div>
          <div style="font-size: 11px; color: #64748b;">${facility.address || ''}</div>
          ${count > 0 
            ? `<div style="font-size: 11px; color: #dc2626; font-weight: 600; margin-top: 3px;">🩸 ${count} yêu cầu đang chờ</div>` 
            : `<div style="font-size: 11px; color: #10b981; margin-top: 3px;">✓ Không có yêu cầu chờ</div>`
          }
        </div>`,
        { 
          direction: 'top', 
          offset: [0, -10],
          className: 'map-tooltip-custom'
        }
      );

      markersRef.current!.addLayer(marker);
    });

    // Fit bounds if there are markers
    if (validFacilities.length > 0) {
      const bounds = L.latLngBounds(
        validFacilities.map(f => [f.latitude!, f.longitude!] as [number, number])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [facilities, selectedFacilityId]);

  // Pan to selected facility
  useEffect(() => {
    if (!mapRef.current || !selectedFacilityId) return;
    const facility = facilities.find(f => f.facility_id === selectedFacilityId);
    if (facility?.latitude && facility?.longitude) {
      mapRef.current.flyTo([facility.latitude, facility.longitude], 15, { duration: 0.8 });
    }
  }, [selectedFacilityId]);

  return (
    <>
      <style jsx global>{`
        .custom-hospital-marker {
          background: none !important;
          border: none !important;
        }
        .map-tooltip-custom {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 4px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
          padding: 8px 12px !important;
        }
        .map-tooltip-custom::before {
          border-top-color: #e2e8f0 !important;
        }
        .leaflet-control-zoom a {
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          font-size: 16px !important;
          border-radius: 2px !important;
          background: white !important;
          color: #1a2332 !important;
          border: 1px solid #e2e8f0 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #f8fafc !important;
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full" />
    </>
  );
}
