import { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapView, type MapFocus } from './MapView';
import { useLocation } from './useLocation';
import { Button, Message, s } from './ui';

export function MapPreview({ onBack }: { onBack: () => void }) {
  const location = useLocation();
  const [focus, setFocus] = useState<MapFocus | null>(null); const serial = useRef(0);
  const centered = useRef(false);
  useEffect(() => { if (location.position && !centered.current) { centered.current = true; setFocus({ serial: ++serial.current, center: location.position }); } }, [location.position]);
  return <SafeAreaView style={s.page}>
    <View style={{ padding: 16, gap: 8 }}><Text style={s.sectionTitle}>Mapa</Text><Text style={s.small}>Conectá tu equipo para agregar locales y notas.</Text><Button title="Conectar equipo" onPress={onBack} secondary /></View>
    <Message text={location.error} error />
    <View style={{ flex: 1 }}><MapView places={[]} userPosition={location.position} focus={focus} route={null} destination={null} onSelect={() => {}} onPoint={() => Alert.alert('Conectá tu equipo', 'Después de conectar tu equipo vas a poder agregar locales aquí.')} picking={false} />
      <View style={{ position: 'absolute', top: 12, right: 12, width: 125, gap: 8 }}><Button title={location.busy ? 'Buscando GPS…' : 'Mi ubicación'} secondary onPress={() => { if (location.position) setFocus({ serial: ++serial.current, center: location.position }); else void location.enable(); }} /><Button title="Argentina" secondary onPress={() => setFocus({ serial: ++serial.current, country: true })} /></View>
    </View>
  </SafeAreaView>;
}
