import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { Layer } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ConstituencyResult {
  constituencyId: string;
  constituencyCode: string;
  constituencyName: string;
  mapColor: string;
  winnerName: string;
  winnerParty: string;
  winningPercentage: number;
  totalVotes: number;
}

interface ElectionMapProps {
  mapData: any;
  results?: { constituencies?: ConstituencyResult[] };
  onConstituencyClick?: (constituency: ConstituencyResult | null) => void;
  center?: [number, number];
  zoom?: number;
}

export default function ElectionMap({ 
  mapData, 
  results, 
  onConstituencyClick,
  center = [23.8103, 90.4125],
  zoom = 7
}: ElectionMapProps) {
  
  const onEachFeature = (feature: any, layer: Layer) => {
    const props = feature.properties;
    
    layer.on({
      click: () => {
        if (onConstituencyClick) {
          const result = results?.constituencies?.find(
            (c: ConstituencyResult) => c.constituencyCode === props.constituency_code
          );
          onConstituencyClick(result || null);
        }
      },
      mouseover: (e: any) => {
        e.target.setStyle({
          weight: 3,
          color: '#22c55e',
          fillOpacity: 0.9
        });
        
        // Show tooltip
        if (props.constituency_name) {
          e.target.bindTooltip(
            `<div class="font-semibold">${props.constituency_name}</div>
             ${props.winner_name ? `<div class="text-sm">Winner: ${props.winner_name} (${props.winner_party})</div>` : ''}
             ${props.total_votes ? `<div class="text-sm">Votes: ${props.total_votes.toLocaleString()}</div>` : ''}`,
            { className: 'custom-tooltip' }
          ).openTooltip();
        }
      },
      mouseout: (e: any) => {
        e.target.setStyle({
          weight: 1,
          color: '#334155',
          fillOpacity: props.fill_opacity || 0.7
        });
        e.target.closeTooltip();
      }
    });
  };

  const getStyle = (feature: any) => {
    const props = feature.properties;
    return {
      fillColor: props.fill_color || '#E0E0E0',
      weight: 1,
      opacity: 1,
      color: '#334155',
      fillOpacity: props.fill_opacity || 0.7
    };
  };

  if (!mapData?.features || mapData.features.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p>Map data not available</p>
          <p className="text-sm text-slate-600 mt-2">Upload a GeoJSON file in the admin panel</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      className="rounded-2xl"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <GeoJSON
        data={mapData}
        style={getStyle}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}
