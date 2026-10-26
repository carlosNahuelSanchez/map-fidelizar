import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { validateBackendConfig, type BackendConfig } from './connection-validation';
export { validateBackendConfig, type BackendConfig } from './connection-validation';

const CONFIG_KEY = 'fidelizar.backend.v1';
export async function readBackendConfig(): Promise<BackendConfig | null> {
  const saved = await AsyncStorage.getItem(CONFIG_KEY);
  try {
    if (!saved) return null;
    const config = JSON.parse(saved);
    return validateBackendConfig(config.url, config.key, await SecureStore.getItemAsync('fidelizar-team-code') ?? '', config.deviceName ?? 'Equipo');
  } catch { return null; }
}
export async function storeBackendConfig(config: BackendConfig) {
  const { teamCode, ...publicConfig } = config;
  await SecureStore.setItemAsync('fidelizar-team-code', teamCode);
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(publicConfig));
}
export async function clearBackendConfig() {
  await AsyncStorage.removeItem(CONFIG_KEY);
  await SecureStore.deleteItemAsync('fidelizar-team-code');
}
