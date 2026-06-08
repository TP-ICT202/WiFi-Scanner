import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import { WifiNetwork } from '../types';
import WifiNetworkCard from '../components/WifiNetworkCard';
import ConnectionDialogue from '../components/ConnectionDialogue';
import LogConsole from '../components/LogConsole';

interface ScanScreenProps {
  scanner: any;
  theme: any;
}

export default function ScanScreen({ scanner, theme }: ScanScreenProps) {
  const {
    networks,
    connectedNetwork,
    connectingNetwork,
    isScanning,
    logs,
    permissions,
    addLog,
    startScan,
    stopScan,
    refreshScan,
    connectToNetwork,
  } = scanner;

  const [searchSsid, setSearchSsid] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);
  const [showDialogue, setShowDialogue] = useState(false);
  const [autoScan, setAutoScan] = useState(false);

  const filteredNetworks = networks
    .filter(n =>
      searchSsid
        ? n.ssid.toLowerCase().includes(searchSsid.toLowerCase())
        : true,
    )
    .sort((a: WifiNetwork, b: WifiNetwork) => b.rssi - a.rssi);

  const handleNetworkPress = useCallback(
    (network: WifiNetwork) => {
      if (connectedNetwork?.bssid === network.bssid) return;
      if (network.security === 'OPEN') {
        connectToNetwork(network.ssid);
      } else {
        setSelectedNetwork(network);
        setShowDialogue(true);
      }
    },
    [connectedNetwork, connectToNetwork],
  );

  const handleConnect = useCallback(
    (ssid: string, password: string) => {
      setShowDialogue(false);
      setSelectedNetwork(null);
      connectToNetwork(ssid, password);
    },
    [connectToNetwork],
  );

  const handleCancel = useCallback(() => {
    setShowDialogue(false);
    setSelectedNetwork(null);
  }, []);

  const toggleAutoScan = useCallback(
    (value: boolean) => {
      setAutoScan(value);
      if (value) {
        startScan({ scanIntervalMs: 10000, rssiThreshold: -90 });
      } else {
        stopScan();
      }
    },
    [startScan, stopScan],
  );

  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  const permissionsBlocked = permissions.fineLocation !== 'granted';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Wi-Fi Toggle Header */}
        <View style={[styles.toggleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.toggleLeft}>
            <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
            <View>
              <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>Wi-Fi Hardware</Text>
              <Text style={[styles.toggleSub, { color: theme.colors.textSecondary }]}>
                Active — Broadcasting
              </Text>
            </View>
          </View>
        </View>

        {/* Permissions Warning */}
        {permissionsBlocked && (
          <View style={styles.permWarning}>
            <Text style={styles.permWarningIcon}>⚠️</Text>
            <View style={styles.permWarningText}>
              <Text style={styles.permWarningTitle}>Permissions Required</Text>
              <Text style={styles.permWarningDesc}>
                Grant location access to scan for nearby Wi-Fi networks.
              </Text>
            </View>
          </View>
        )}

        {/* Search & Scan Controls */}
        <View style={styles.controlsRow}>
          <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              value={searchSsid}
              onChangeText={setSearchSsid}
              placeholder="Filter by SSID..."
              placeholderTextColor="#64748b"
            />
            {searchSsid ? (
              <TouchableOpacity onPress={() => setSearchSsid('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.scanButtons}>
            <TouchableOpacity
              style={[
                styles.scanBtn,
                {
                  backgroundColor: isScanning ? '#dc2626' : permissionsBlocked ? '#334155' : '#3b82f6',
                },
              ]}
              onPress={() => (isScanning ? stopScan() : startScan({ scanIntervalMs: 10000, rssiThreshold: -90 }))}
              disabled={permissionsBlocked}
            >
              <Text style={styles.scanBtnIcon}>{isScanning ? '⏹' : '▶'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.refreshBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={refreshScan}
              disabled={permissionsBlocked}
            >
              <Text style={styles.refreshIcon}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Auto-scan toggle */}
        <View style={[styles.autoScanRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.autoScanLabel, { color: theme.colors.text }]}>Continuous Scan</Text>
          <Switch
            value={autoScan}
            onValueChange={toggleAutoScan}
            trackColor={{ false: '#334155', true: '#1e3a5f' }}
            thumbColor={autoScan ? '#3b82f6' : '#64748b'}
          />
        </View>

        {/* Network List */}
        <View style={styles.networkSection}>
          <View style={styles.networkHeader}>
            <Text style={[styles.networkTitle, { color: theme.colors.textSecondary }]}>
              Nearby Networks ({filteredNetworks.length})
            </Text>
            {isScanning && <Text style={styles.scanningIndicator}>Scanning...</Text>}
          </View>

          {filteredNetworks.length > 0 ? (
            filteredNetworks.map((net: WifiNetwork) => (
              <WifiNetworkCard
                key={net.bssid}
                network={net}
                isConnected={connectedNetwork?.bssid === net.bssid}
                isConnecting={connectingNetwork?.bssid === net.bssid}
                onPress={handleNetworkPress}
                theme={theme}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📡</Text>
              <Text style={styles.emptyTitle}>No networks found</Text>
              <Text style={styles.emptySub}>
                {permissionsBlocked
                  ? 'Grant permissions and try again'
                  : 'Pull to refresh or start a scan'}
              </Text>
            </View>
          )}
        </View>

        {/* Log Console */}
        <LogConsole logs={logs} theme={theme} />
      </ScrollView>

      <ConnectionDialogue
        network={selectedNetwork}
        visible={showDialogue}
        onConnect={handleConnect}
        onCancel={handleCancel}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 24,
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 9,
    marginTop: 1,
  },
  permWarning: {
    flexDirection: 'row',
    backgroundColor: '#451a03',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  permWarningIcon: {
    fontSize: 16,
  },
  permWarningText: {
    flex: 1,
  },
  permWarningTitle: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  permWarningDesc: {
    color: '#f59e0b',
    fontSize: 10,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 10,
  },
  clearBtn: {
    color: '#64748b',
    fontSize: 14,
  },
  scanButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  scanBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnIcon: {
    color: '#fff',
    fontSize: 16,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  refreshIcon: {
    fontSize: 16,
  },
  autoScanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  autoScanLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  networkSection: {
    gap: 6,
  },
  networkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  networkTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scanningIndicator: {
    color: '#3b82f6',
    fontSize: 9,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyIcon: {
    fontSize: 32,
    opacity: 0.4,
  },
  emptyTitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  emptySub: {
    color: '#475569',
    fontSize: 11,
  },
});
