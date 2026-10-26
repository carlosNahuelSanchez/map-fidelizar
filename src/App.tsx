import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { createBackend } from './backend';
import { clearBackendConfig, readBackendConfig, type BackendConfig } from './backend-config';
import { ConnectionScreen } from './ConnectionScreen';
import { TeamApp } from './TeamApp';
import { MapPreview } from './MapPreview';
import { Button, Message, Page, colors } from './ui';
import { errorMessage } from './domain';

function Application() {
  const [config, setConfig] = useState<BackendConfig | null | undefined>();
  const [session, setSession] = useState<Session | null | undefined>();
  const [startupError, setStartupError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState(false);
  const client = useMemo(() => config ? createBackend(config) : null, [config]);
  useEffect(() => { void readBackendConfig().then(setConfig).catch(() => setConfig(null)); }, []);
  useEffect(() => {
    if (!client) return;
    let disposed = false;
    let joined = false;
    setStartupError(''); setSession(undefined);
    void (async () => {
      const existing = await client.auth.getSession();
      if (existing.error) throw existing.error;
      let current = existing.data.session;
      if (!current) {
        const anonymous = await client.auth.signInAnonymously();
        if (anonymous.error) throw anonymous.error;
        current = anonymous.data.session;
      }
      if (!current) throw new Error('No se pudo conectar este teléfono. Intentá nuevamente.');
      const { error } = await client.rpc('join_team', { p_access_code: config!.teamCode, p_display_name: config!.deviceName });
      if (error) throw error;
      if (!disposed) { joined = true; setSession(current); }
    })().catch(cause => { if (!disposed) setStartupError(errorMessage(cause)); });
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (disposed || !joined) return;
      if (event === 'SIGNED_OUT') { setSession(undefined); setAttempt(value => value + 1); }
      else if (next) setSession(next);
    });
    if (AppState.currentState === 'active') client.auth.startAutoRefresh();
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
    return () => { disposed = true; subscription.unsubscribe(); appState.remove(); client.auth.stopAutoRefresh(); void client.removeAllChannels(); };
  }, [client, attempt]);
  const changeConnection = async () => {
    await clearBackendConfig(); setSession(undefined); setConfig(null); setStartupError('');
  };
  if (config === undefined) return <Page title="Fidelizar"><ActivityIndicator color={colors.teal} /></Page>;
  if (preview) return <MapPreview onBack={() => setPreview(false)} />;
  if (!config || !client) return <ConnectionScreen onConnect={setConfig} onPreview={() => setPreview(true)} />;
  if (startupError) return <Page title="No se pudo conectar al equipo"><Message text={startupError} error /><Button title="Reintentar" onPress={() => setAttempt(value => value + 1)} /><Button title="Cambiar conexión" onPress={() => void changeConnection()} secondary /></Page>;
  if (!session) return <Page title="Conectando equipo"><ActivityIndicator color={colors.teal} /></Page>;
  return <TeamApp key={session.user.id} client={client} session={session} onChangeConnection={changeConnection} />;
}

export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><Application /></SafeAreaProvider>;
}
