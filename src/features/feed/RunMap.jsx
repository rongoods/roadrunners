import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '../../utils/cn';

function MapController({ route, isInteractive }) {
    const map = useMap();

    useEffect(() => {
        if (!isInteractive && route && route.length > 0) {
            try {
                const bounds = L.latLngBounds(route);
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [20, 20] });
                }
            } catch (e) {
                console.warn("Map bounds fit failed", e);
            }
        }
    }, [route, isInteractive, map]);

    return null;
}

function MapEvents({ onMapClick, isInteractive }) {
    useMapEvents({
        click(e) {
            if (isInteractive && onMapClick) {
                onMapClick([e.latlng.lat, e.latlng.lng]);
            }
        },
    });
    return null;
}

export default function RunMap({
    route = [],
    onRouteUpdate,
    isInteractive = false,
    className,
    height = "300px"
}) {
    const [mapTheme, setMapTheme] = useState('dark');

    useEffect(() => {
        const isLight = document.documentElement.classList.contains('light-mode');
        setMapTheme(isLight ? 'light' : 'dark');

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isLightNow = document.documentElement.classList.contains('light-mode');
                    setMapTheme(isLightNow ? 'light' : 'dark');
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

    const handleMapClick = (latlng) => {
        if (onRouteUpdate) {
            onRouteUpdate([...route, latlng]);
        }
    };

    const tileUrl = mapTheme === 'light'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const center = route.length > 0 ? route[0] : [40.7128, -74.0060];
    const zoom = route.length > 0 ? 13 : 12;

    return (
        <div
            className={cn("border-2 border-border-bright relative overflow-hidden", className)}
            style={{ height }}
        >
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={isInteractive}
                attributionControl={false}
            >
                <TileLayer url={tileUrl} />
                {route && route.length > 0 && (
                    <Polyline
                        positions={route}
                        pathOptions={{
                            color: '#1E90FF',
                            weight: 4,
                            opacity: 0.8,
                            lineJoin: 'square',
                            dashArray: isInteractive ? '5, 10' : 'none'
                        }}
                    />
                )}
                <MapEvents onMapClick={handleMapClick} isInteractive={isInteractive} />
                <MapController route={route} isInteractive={isInteractive} />
            </MapContainer>

            {isInteractive && (
                <>
                    <div className="absolute bottom-2 right-2 z-[1000] flex flex-col gap-1">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onRouteUpdate) onRouteUpdate(route.slice(0, -1));
                            }}
                            className="bg-text text-background text-[10px] font-bold px-2 py-1 uppercase border border-text hover:bg-background hover:text-text transition-colors"
                        >
                            Undo Point
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onRouteUpdate) onRouteUpdate([]);
                            }}
                            className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 uppercase border border-red-600 hover:bg-background hover:text-red-500 transition-colors"
                        >
                            Clear Route
                        </button>
                    </div>
                    <div className="absolute top-2 left-2 z-[1000] bg-primary text-black text-[10px] font-bold px-2 py-1 uppercase border border-primary shadow-brutalist">
                        Tracing Mode: Click to add points
                    </div>
                </>
            )}

            {!isInteractive && route.length === 0 && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center pointer-events-none z-[1000]">
                    <span className="text-[10px] font-mono uppercase opacity-50">No Route Data</span>
                </div>
            )}
        </div>
    );
}
