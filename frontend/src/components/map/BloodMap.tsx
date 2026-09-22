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
  distance_km?: number;
}

interface BloodMapProps {
  facilities: FacilityOnMap[];
  onFacilitySelect: (facility: FacilityOnMap) => void;
  selectedFacilityId?: number | null;
  userLocation?: [number, number] | null;
  nearestFacilityId?: number | null;
  flyToCoords?: [number, number] | null;
  flyToZoom?: number;
}

// Custom marker SVG for hospitals with accurate tip anchor
const createHospitalIcon = (count: number, isSelected: boolean, isPrimary: boolean, isNearest: boolean) => {
  const pinW = isSelected ? 44 : 36;
  const pinH = isSelected ? 56 : 46;
  const anchorX = pinW / 2;
  const anchorY = pinH;
  const headR = anchorX - 3;
  const headCy = anchorX;

  const color = count > 0 ? (count >= 3 ? '#dc2626' : '#f59e0b') : '#10b981';
  const pinFill = isSelected ? '#1a2332' : color;
  const innerBg = isSelected ? color : '#ffffff';
  const crossColor = isSelected ? '#ffffff' : color;

  const crossW = isSelected ? 16 : 13;
  const crossThick = isSelected ? 5 : 4;

  const svg = `
    <svg width="${pinW}" height="${pinH}" viewBox="0 0 ${pinW} ${pinH}" style="display:block;overflow:visible;" xmlns="http://www.w3.org/2000/svg">
      <!-- Pin drop shadow -->
      <path d="M${anchorX} ${pinH} C${anchorX} ${pinH} 3 ${pinH * 0.65} 3 ${headCy} A${headR} ${headR} 0 1 1 ${pinW - 3} ${headCy} C${pinW - 3} ${pinH * 0.65} ${anchorX} ${pinH} ${anchorX} ${pinH} Z" 
            fill="${pinFill}" stroke="#ffffff" stroke-width="2" style="filter: drop-shadow(0 3px 4px rgba(0,0,0,0.3));"/>
      <!-- Inner circular white/colored badge -->
      <circle cx="${anchorX}" cy="${headCy}" r="${headR - 4}" fill="${innerBg}"/>
      <!-- Medical Cross -->
      <rect x="${anchorX - crossW/2}" y="${headCy - crossThick/2}" width="${crossW}" height="${crossThick}" rx="1" fill="${crossColor}"/>
      <rect x="${anchorX - crossThick/2}" y="${headCy - crossW/2}" width="${crossThick}" height="${crossW}" rx="1" fill="${crossColor}"/>
      ${count > 0 ? `
        <!-- Count Badge -->
        <circle cx="${pinW - 5}" cy="5" r="8" fill="#dc2626" stroke="#ffffff" stroke-width="1.5"/>
        <text x="${pinW - 5}" y="8.5" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="900" font-family="system-ui, sans-serif">${count > 9 ? '9+' : count}</text>
      ` : ''}
      ${isPrimary ? `
        <!-- Primary Hospital Star -->
        <circle cx="5" cy="5" r="6" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>
        <text x="5" y="8" text-anchor="middle" fill="#ffffff" font-size="7.5" font-weight="bold">★</text>
      ` : ''}
    </svg>
  `;

  return L.divIcon({
    html: `<div class="hospital-pin-wrapper ${isNearest ? 'nearest-pin-pulse' : ''}" style="width:${pinW}px;height:${pinH}px;display:flex;align-items:flex-end;justify-content:center;">${svg}</div>`,
    className: 'custom-hospital-marker',
    iconSize: [pinW, pinH],
    iconAnchor: [anchorX, anchorY],
    popupAnchor: [0, -anchorY],
  });
};

// User location icon
const createUserLocationIcon = () => {
  return L.divIcon({
    html: `<div class="user-location-marker"><div class="user-location-dot"></div><div class="user-location-ring"></div></div>`,
    className: 'user-location-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export default function BloodMap({ facilities, onFacilitySelect, selectedFacilityId, userLocation, nearestFacilityId, flyToCoords, flyToZoom }: BloodMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);

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

    // Standard OpenStreetMap tiles - 100% free, no API key required, reliable worldwide
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

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
      const isNearest = facility.facility_id === nearestFacilityId;
      const icon = createHospitalIcon(count, isSelected, facility.is_primary || false, isNearest);

      const marker = L.marker([facility.latitude!, facility.longitude!], { icon })
        .on('click', () => {
          onFacilitySelect(facility);
        });

      // Tooltip
      const distanceInfo = facility.distance_km !== undefined
        ? `<div style="font-size: 11px; color: #2563eb; font-weight: 600; margin-top: 3px;">📍 ${facility.distance_km.toFixed(1)} km từ bạn</div>`
        : '';

      marker.bindTooltip(
        `<div style="font-family: system-ui; padding: 2px 0;">
          <div style="font-weight: 700; font-size: 12px; color: #1a2332; margin-bottom: 2px;">${facility.facility_name}</div>
          <div style="font-size: 11px; color: #64748b;">${facility.address || ''}</div>
          ${count > 0 
            ? `<div style="font-size: 11px; color: #dc2626; font-weight: 600; margin-top: 3px;">🩸 ${count} yêu cầu đang chờ</div>` 
            : `<div style="font-size: 11px; color: #10b981; margin-top: 3px;">✓ Không có yêu cầu chờ</div>`
          }
          ${distanceInfo}
          ${isNearest ? `<div style="font-size: 11px; color: #7c3aed; font-weight: 700; margin-top: 3px;">⭐ Gần bạn nhất!</div>` : ''}
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
      const allPoints: [number, number][] = validFacilities.map(f => [f.latitude!, f.longitude!] as [number, number]);
      if (userLocation) allPoints.push(userLocation);
      const bounds = L.latLngBounds(allPoints);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [facilities, selectedFacilityId, nearestFacilityId]);

  // User location marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old marker and line
    if (userMarkerRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (lineRef.current) {
      mapRef.current.removeLayer(lineRef.current);
      lineRef.current = null;
    }

    if (userLocation) {
      const userIcon = createUserLocationIcon();
      userMarkerRef.current = L.marker(userLocation, { icon: userIcon, zIndexOffset: 1000 })
        .bindTooltip('<div style="font-family: system-ui; font-weight: 700; font-size: 12px; color: #2563eb;">📍 Vị trí của bạn</div>', {
          direction: 'top', offset: [0, -10], className: 'map-tooltip-custom'
        })
        .addTo(mapRef.current);

      // Draw line to nearest facility
      if (nearestFacilityId) {
        const nearest = facilities.find(f => f.facility_id === nearestFacilityId);
        if (nearest?.latitude && nearest?.longitude) {
          lineRef.current = L.polyline(
            [userLocation, [nearest.latitude, nearest.longitude]],
            { color: '#6366f1', weight: 3, dashArray: '8, 8', opacity: 0.7 }
          ).addTo(mapRef.current);
        }
      }
    }
  }, [userLocation, nearestFacilityId, facilities]);

  // Pan to selected facility
  useEffect(() => {
    if (!mapRef.current || !selectedFacilityId) return;
    const facility = facilities.find(f => f.facility_id === selectedFacilityId);
    if (facility?.latitude && facility?.longitude) {
      mapRef.current.flyTo([facility.latitude, facility.longitude], 15, { duration: 0.8 });
    }
  }, [selectedFacilityId]);

  // Fly to specified coordinates (e.g. province/city change)
  useEffect(() => {
    if (!mapRef.current || !flyToCoords) return;
    mapRef.current.flyTo(flyToCoords, flyToZoom || 13, { duration: 1.2 });
  }, [flyToCoords, flyToZoom]);

  return (
    <>
      <style jsx global>{`
        .custom-hospital-marker {
          background: transparent !important;
          border: none !important;
        }
        .hospital-pin-wrapper {
          transform-origin: bottom center;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .hospital-pin-wrapper:hover {
          transform: scale(1.15);
        }
        .nearest-pin-pulse {
          animation: hospitalPinPulse 1.8s ease-in-out infinite;
        }
        @keyframes hospitalPinPulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 3px rgba(220, 38, 38, 0.6));
          }
          50% {
            transform: scale(1.18);
            filter: drop-shadow(0 0 14px rgba(220, 38, 38, 0.9));
          }
        }
        .user-location-icon {
          background: none !important;
          border: none !important;
        }
        .user-location-marker {
          position: relative;
          width: 24px;
          height: 24px;
        }
        .user-location-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: #2563eb;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 6px rgba(37, 99, 235, 0.4);
          z-index: 2;
        }
        .user-location-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.15);
          animation: userRingPulse 2s ease-in-out infinite;
          z-index: 1;
        }
        @keyframes userRingPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.3; }
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
