import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';
import { useReverseGeocode } from '../hooks/useReverseGeocode';

// Fix para ícones do Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface Incident {
  id: string;
  type: string;
  description: string;
  user: { name: string; phone: string };
  locations: Array<{ lat: number; lng: number; accuracy?: number; createdAt: string }>;
}

interface PanicEvent {
  id: string;
  status: string;
  user: {
    name: string;
    phone: string;
    trustedContacts?: Array<{ name: string; phone: string }>;
  };
  locations: Array<{ lat: number; lng: number; accuracy?: number; createdAt: string }>;
}

interface MapViewProps {
  incidents: Incident[];
  panicEvents: PanicEvent[];
  selectedIncidentId?: string | null;
}


// Componente de endereço que busca ao montar
function AddressLine({ lat, lng }: { lat: number; lng: number }) {
  const { address } = useReverseGeocode(lat, lng);
  return (
    <div style={{ marginTop: '4px', fontSize: '0.85em', color: '#555' }}>
      📍 {address ?? 'Buscando endereço...'}
    </div>
  );
}

function WhatsAppLink({ phone }: { phone?: string | null }) {
  if (!phone) return <span style={{ color: '#999' }}>N/A</span>;
  return (
    <a
      href={`https://wa.me/${phone.replace(/\D/g, '')}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#25D366', fontWeight: 'bold', textDecoration: 'none' }}
    >
      📱 {phone}
    </a>
  );
}

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [35, 51], iconAnchor: [17, 51], popupAnchor: [1, -34], shadowSize: [41, 41],
});

export default function MapView({ incidents, panicEvents, selectedIncidentId }: MapViewProps) {
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    if (mapRef.current) {
      const allLocations: Location[] = [];
      panicEvents.forEach((event) =>
        event.locations.forEach((loc) => allLocations.push({ lat: loc.lat, lng: loc.lng }))
      );
      if (selectedIncidentId) {
        incidents
          .filter((i) => i.id === selectedIncidentId)
          .forEach((i) => i.locations.forEach((loc) => allLocations.push({ lat: loc.lat, lng: loc.lng })));
      }
      if (allLocations.length > 0) {
        mapRef.current.fitBounds(L.latLngBounds(allLocations), { padding: [50, 50] });
      }
    }
  }, [incidents, panicEvents, selectedIncidentId]);

  const defaultCenter: [number, number] = [-22.9068, -43.1729];

  return (
    <div className="map-container">
      <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }} ref={mapRef}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcadores de pânico */}
        {panicEvents.map((event) =>
          event.locations.map((location, idx) => (
            <Marker key={`panic-${event.id}-${idx}`} position={[location.lat, location.lng]} icon={redIcon}>
              <Popup>
                <div style={{ minWidth: '220px' }}>
                  <strong>🚨 Pânico Ativo</strong>
                  <br />
                  <strong>Usuária:</strong> {event.user.name}
                  <br />
                  <strong>WhatsApp:</strong> <WhatsAppLink phone={event.user.phone} />
                  <br />
                  <strong>Status:</strong> {event.status}
                  <br />
                  <strong>Precisão:</strong> {location.accuracy?.toFixed(0)}m
                  <AddressLine lat={location.lat} lng={location.lng} />
                  {event.user.trustedContacts && event.user.trustedContacts.length > 0 && (
                    <>
                      <br />
                      <strong>📞 Contatos de Emergência:</strong>
                      {event.user.trustedContacts.map((contact, i) => (
                        <div key={i} style={{ marginTop: '4px', fontSize: '0.9em' }}>
                          • {contact.name}: <WhatsAppLink phone={contact.phone} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ))
        )}

        {/* Trajetória de pânico */}
        {panicEvents.map((event) =>
          event.locations.length > 1 ? (
            <Polyline
              key={`panic-line-${event.id}`}
              positions={event.locations.map((loc) => [loc.lat, loc.lng] as [number, number])}
              color="red" weight={3} opacity={0.7}
            />
          ) : null
        )}

        {/* Marcadores de denúncias */}
        {incidents.map((incident) => {
          const isSelected = selectedIncidentId === incident.id;
          return incident.locations.map((location, idx) => (
            <Marker
              key={`incident-${incident.id}-${idx}`}
              position={[location.lat, location.lng]}
              icon={isSelected ? selectedIcon : blueIcon}
            >
              <Popup>
                <div style={{ minWidth: '220px' }}>
                  <strong>📋 Denúncia {isSelected ? '(Selecionada)' : ''}</strong>
                  <br />
                  <strong>Tipo:</strong> {incident.type}
                  <br />
                  <strong>Usuária:</strong> {incident.user.name}
                  <br />
                  <strong>WhatsApp:</strong> <WhatsAppLink phone={incident.user.phone} />
                  <br />
                  <strong>Descrição:</strong> {incident.description || 'N/A'}
                  <AddressLine lat={location.lat} lng={location.lng} />
                </div>
              </Popup>
            </Marker>
          ));
        })}

        {/* Trajetória da denúncia selecionada */}
        {selectedIncidentId &&
          incidents
            .filter((inc) => inc.id === selectedIncidentId)
            .map((incident) =>
              incident.locations.length > 1 ? (
                <Polyline
                  key={`incident-line-${incident.id}`}
                  positions={incident.locations.map((loc) => [loc.lat, loc.lng] as [number, number])}
                  color="green" weight={4} opacity={0.8}
                />
              ) : null
            )}
      </MapContainer>
    </div>
  );
}
