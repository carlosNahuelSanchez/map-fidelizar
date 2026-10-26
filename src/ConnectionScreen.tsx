import { useState } from 'react';
import { Button, Field, Message, Page } from './ui';
import { storeBackendConfig, validateBackendConfig, type BackendConfig } from './backend-config';
import { errorMessage } from './domain';

export function ConnectionScreen({ onConnect, onPreview }: { onConnect: (config: BackendConfig) => void; onPreview: () => void }) {
  const [url, setUrl] = useState(process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''); const [key, setKey] = useState(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '');
  const [teamCode, setTeamCode] = useState(''); const [deviceName, setDeviceName] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const connect = async () => {
    setBusy(true); setError('');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const config = validateBackendConfig(url, key, teamCode, deviceName);
      const response = await fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.key }, signal: controller.signal });
      if (!response.ok) throw new Error('La URL o la clave pública no son válidas para este proyecto.');
      await storeBackendConfig(config); onConnect(config);
    } catch (cause) { setError(controller.signal.aborted ? 'Supabase tardó demasiado. Revisá internet y si el proyecto está activo.' : errorMessage(cause)); }
    finally { clearTimeout(timer); setBusy(false); }
  };
  return <Page title="Fidelizar" subtitle="Conectá este teléfono a la base compartida de tu equipo.">
    <Field label="URL del proyecto Supabase" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://tu-proyecto.supabase.co" editable={!busy} />
    <Field label="Clave pública (publishable o anon)" value={key} onChangeText={setKey} autoCapitalize="none" autoCorrect={false} multiline placeholder="sb_publishable_…" editable={!busy} />
    <Field label="Código compartido del equipo" value={teamCode} onChangeText={setTeamCode} autoCapitalize="none" autoCorrect={false} secureTextEntry editable={!busy} />
    <Field label="Nombre de este teléfono (opcional)" value={deviceName} onChangeText={setDeviceName} placeholder="Por ejemplo: Equipo 1" maxLength={80} editable={!busy} />
    <Message text={error} error />
    <Button title="Conectar" onPress={() => void connect()} busy={busy} />
    <Button title="Ver mapa" onPress={onPreview} secondary disabled={busy} />
    <Message text="Sin cuentas personales. Usá el mismo proyecto y código del equipo en todos los teléfonos. Nunca pegues una clave secreta o service_role." />
  </Page>;
}
