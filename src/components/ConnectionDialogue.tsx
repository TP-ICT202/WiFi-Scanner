import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { WifiNetwork } from '../types';

interface ConnectionDialogueProps {
  network: WifiNetwork | null;
  visible: boolean;
  onConnect: (ssid: string, password: string) => void;
  onCancel: () => void;
  theme: any;
}

export default function ConnectionDialogue({
  network,
  visible,
  onConnect,
  onCancel,
  theme,
}: ConnectionDialogueProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = () => {
    if (!network) return;
    if (network.security !== 'OPEN' && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    onConnect(network.ssid, password);
    setPassword('');
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    setShowPassword(false);
    onCancel();
  };

  if (!network) return null;

  const isOpen = network.security === 'OPEN';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🔒</Text>
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
              {network.ssid}
            </Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {isOpen
              ? 'This network is open. Connect without a password?'
              : `Security credentials required (${network.security})`}
          </Text>

          {!isOpen && (
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Network Security Key
              </Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.colors.text,
                      backgroundColor: '#0f172a',
                      borderColor: error ? '#ef4444' : theme.colors.border,
                    },
                  ]}
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    setError('');
                  }}
                  placeholder="Enter Wi-Fi password"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={[styles.eyeText, { color: theme.colors.textSecondary }]}>
                    {showPassword ? '👁' : '👁‍🗨'}
                  </Text>
                </TouchableOpacity>
              </View>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
            </View>
          )}

          <View style={styles.hintBox}>
            <Text style={styles.hintIcon}>💡</Text>
            <Text style={styles.hintText}>
              {isOpen
                ? 'Open networks connect instantly without credentials.'
                : 'Type "wrong" or "12345678" to simulate a connection failure.'}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, { borderColor: theme.colors.border }]}
              onPress={handleCancel}
            >
              <Text style={[styles.btnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.connectBtn]}
              onPress={handleConnect}
            >
              <Text style={styles.connectBtnText}>
                {isOpen ? 'Connect' : 'Associate'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#64748b',
    fontSize: 18,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  passwordRow: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    paddingRight: 44,
    fontSize: 14,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  eyeText: {
    fontSize: 18,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  hintBox: {
    flexDirection: 'row',
    backgroundColor: '#451a03',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 8,
  },
  hintIcon: {
    fontSize: 16,
  },
  hintText: {
    color: '#fbbf24',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  connectBtn: {
    backgroundColor: '#3b82f6',
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
