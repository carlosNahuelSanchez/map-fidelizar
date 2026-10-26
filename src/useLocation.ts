import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { UserPosition } from './navigation';

export function useLocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const watch = useRef<Location.LocationSubscription | null>(null);
  const generation = useRef(0);
  const disable = useCallback(() => {
    generation.current++;
    watch.current?.remove(); watch.current = null;
    setPosition(null); setBusy(false);
  }, []);
  const enable = useCallback(async () => {
    const request = ++generation.current;
    watch.current?.remove(); watch.current = null;
    setBusy(true); setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Habilitá el permiso de ubicación en Ajustes para usar el GPS.');
      if (!await Location.hasServicesEnabledAsync()) throw new Error('Activá la ubicación del teléfono.');
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
        value => {
          if (request !== generation.current) return;
          const accuracy = value.coords.accuracy ?? Infinity;
          if (accuracy > 100 || Date.now() - value.timestamp > 30000) {
            setError('Esperando una ubicación más precisa. Activá la ubicación precisa del teléfono.'); return;
          }
          setPosition({ lat: value.coords.latitude, lng: value.coords.longitude, accuracy, timestamp: value.timestamp });
          setError(''); setBusy(false);
        },
        () => { if (request === generation.current) { setError('No se pudo actualizar el GPS. Revisá el permiso y la ubicación del teléfono.'); setBusy(false); } },
      );
      if (request !== generation.current) subscription.remove();
      else watch.current = subscription;
    } catch (cause) {
      if (request === generation.current) { setError(cause instanceof Error ? cause.message : 'No se pudo acceder al GPS.'); setBusy(false); }
    }
  }, []);
  useEffect(() => () => { generation.current++; watch.current?.remove(); }, []);
  return { position, busy, error, enable, disable };
}
