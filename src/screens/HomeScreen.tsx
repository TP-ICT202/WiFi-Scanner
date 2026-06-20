import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AppScreen } from '../types';
import ConnectedNetworkCard from '../components/ConnectedNetworkCard';
interface HomeScreenProps {
  scanner: any;
  theme: any;
  onNavigate: (screen: AppScreen) => void;
}

export default function HomeScreen({ scanner, theme, onNavigate }: HomeScreenProps) {
  const { connectedNetwork, networks, logs, isModuleAvailable } = scanner;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Brand Header */}
      <View style={[styles.brandCard, { backgroundColor: '#1e3a5f' }]}>
        <Text style={styles.brandBadge}>WifiBridge</Text>
        <Text style={styles.brandTitle}>Wi-Fi Scanner & Connector</Text>
        <Text style={styles.brandSubtitle}>
          React Native native module demo — scan, connect, and monitor Wi-Fi networks in real-time
          across Android (Kotlin) and iOS (Swift).
        </Text>
        {!isModuleAvailable && (
          <View style={styles.moduleWarning}>
            <Text style={styles.moduleWarningText}>
              ⚠ Native module not available. Run on a physical device.
            </Text>
          </View>
        )}
      </View>

      {/* Connection Status */}
      {connectedNetwork ? (
        <ConnectedNetworkCard
          network={connectedNetwork}
          onDisconnect={() => scanner.disconnect()}
          theme={theme}
        />
      ) : (
        <View style={[styles.statusCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
            Current Link State
          </Text>
          <View style={styles.disconnectedState}>
            <Text style={styles.wifiOffIcon}>📵</Text>
            <View style={styles.disconnectedInfo}>
              <Text style={[styles.disconnectedTitle, { color: theme.colors.text }]}>
                No active connection
              </Text>
              <Text style={[styles.disconnectedSub, { color: theme.colors.textSecondary }]}>
                Cellular carrier mode
              </Text>
            </View>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => onNavigate('scan')}
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Wi-Fi Hardware</Text>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>ON</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Discovered</Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{networks.length} stations</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={[styles.actionsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.actionsTitle, { color: theme.colors.textSecondary }]}>Quick Actions</Text>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#0f172a', borderColor: theme.colors.border }]}
          onPress={() => {
            onNavigate('scan');
            scanner.addLog('info', 'Navigated to scan view', 'System');
          }}
        >
          <Text style={styles.actionBtnText}>📡 Start Wi-Fi Scan</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#0f172a', borderColor: theme.colors.border }]}
          onPress={() => {
            onNavigate('settings');
            scanner.addLog('info', 'Navigated to settings', 'System');
          }}
        >
          <Text style={styles.actionBtnText}>⚙️ Configure Settings</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  brandCard: {
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  brandBadge: {
    color: '#93c5fd',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  brandTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  brandSubtitle: {
    color: '#bfdbfe',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  moduleWarning: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  moduleWarningText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '600',
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  disconnectedState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wifiOffIcon: {
    fontSize: 24,
  },
  disconnectedInfo: {
    flex: 1,
  },
  disconnectedTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  disconnectedSub: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  searchBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  searchBtnText: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  actionsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  actionsTitle: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  actionBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  actionArrow: {
    color: '#3b82f6',
    fontSize: 16,
  },
});
