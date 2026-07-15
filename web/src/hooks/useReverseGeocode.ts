import { useState, useEffect } from 'react';

const cache: Record<string, string> = {};

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache[key]) return cache[key];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.road || a.pedestrian || a.footway || a.path,
      a.house_number,
      a.suburb || a.neighbourhood || a.quarter,
      a.city || a.town || a.village || a.municipality,
      a.state,
    ].filter(Boolean);
    const address = parts.join(', ') || data.display_name || 'Endereço não encontrado';
    cache[key] = address;
    return address;
  } catch {
    return 'Erro ao buscar endereço';
  }
}

export function useReverseGeocode(lat?: number, lng?: number) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;
    setLoading(true);
    reverseGeocode(lat, lng).then((addr) => {
      setAddress(addr);
      setLoading(false);
    });
  }, [lat, lng]);

  return { address, loading };
}
