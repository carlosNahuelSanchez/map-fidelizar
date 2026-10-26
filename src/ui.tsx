import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = { paper: '#f3f6f2', white: '#ffffff', ink: '#233b31', muted: '#65776e', line: '#d9e3dc', teal: '#137d72', error: '#9d3f28' };
export function Button({ title, onPress, secondary, danger, busy, disabled }: { title: string; onPress: () => void; secondary?: boolean; danger?: boolean; busy?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, danger && { backgroundColor: '#fbece7' }, (disabled || busy) && { opacity: 0.5 }, pressed && { opacity: 0.75 }]}>
    {busy ? <ActivityIndicator color={secondary ? colors.ink : colors.white} /> : <Text style={[s.buttonText, secondary && { color: colors.ink }, danger && { color: colors.error }]}>{title}</Text>}
  </Pressable>;
}
export function Field({ label, multiline, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#89978f" multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[s.input, multiline && { minHeight: 115 }]} {...props} /></View>;
}
export function Message({ text, error }: { text: string; error?: boolean }) {
  return text ? <Text accessibilityLiveRegion="polite" style={[s.message, error && { color: colors.error, backgroundColor: '#fbece7' }]}>{text}</Text> : null;
}
export function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <SafeAreaView style={s.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Text style={s.title}>{title}</Text>{subtitle && <Text style={s.subtitle}>{subtitle}</Text>}{children}</ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function ModalPage({ visible, title, onClose, children, busy }: { visible: boolean; title: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
  return <Modal visible={visible} animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}><SafeAreaView style={s.page}><View style={s.modalHeader}><Text style={s.sectionTitle}>{title}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={{ padding: 12 }}><Text style={s.link}>Cerrar</Text></Pressable></View><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">{children}</ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>;
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper }, content: { padding: 22, gap: 17, flexGrow: 1 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: '700', color: colors.ink, marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  subtitle: { fontSize: 15, lineHeight: 23, color: colors.muted }, label: { fontSize: 13, fontWeight: '600', color: colors.ink },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 16, color: colors.ink, minHeight: 48 },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: colors.ink, padding: 12, justifyContent: 'center', alignItems: 'center' },
  secondary: { backgroundColor: '#e3ece5' }, buttonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  message: { padding: 12, borderRadius: 10, backgroundColor: '#e4efe8', fontSize: 13, lineHeight: 20, color: colors.ink },
  link: { color: colors.teal, fontWeight: '600', fontSize: 14 },
  modalHeader: { padding: 12, paddingLeft: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.line },
  card: { padding: 16, gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white },
  small: { fontSize: 12, lineHeight: 18, color: colors.muted },
});
