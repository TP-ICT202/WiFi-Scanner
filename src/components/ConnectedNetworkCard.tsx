import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WifiNetwork } from '../types';
import { getSignalPercentage, getWiFiSpeed } from '../utils/wifiUtils';

interface ConnectedNetworkCardProps {
  network: WifiNetwork;
  onDisconnect: () => void;
  theme: any;
}

export default function ConnectedNetworkCard({ network, onDisconnect, theme }: ConnectedNetworkCardProps) {
  const percentage = getSignalPercentage(network.rssi);
  const speed = getWiFiSpeed(network.rssi, network.frequency);
  const is5GHz = network.frequency > 5000;
  const frequencyBand = is5GHz ? '5 GHz' : '2.4 GHz';

  const qrCodeString = `WIFI:S:${network.ssid};T:${network.security === 'OPEN' ? 'nopass' : 'WPA'};P:;${network.bssid ? `B:${network.bssid};` : ''}`;

  return (
    <View style={[styles.card, { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' }]}>
      <View style={styles.headerRow}>
        <Text style={styles.wifiIcon}>📶</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.ssid}>{network.ssid}</Text>
          <Text style={styles.associatedBadge}>Associated</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Adresse BSSID</Text>
        <Text style={styles.detailValue}>{network.bssid}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Security</Text>
        <Text style={styles.detailValue}>{network.security}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Sec</Text>
        <Text style={styles.detailValue}>{frequencyBand} · Ch {network.channel}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Débit</Text>
        <Text style={[styles.detailValue, styles.speedText]}>{speed} ({percentage}%)</Text>
      </View>

      <View style={styles.qrSection}>
        <Text style={styles.qrSectionTitle}>Associer votre vrai téléphone</Text>
        <Text style={styles.qrSectionDesc}>
          Scannez ce QR Code avec l'appareil photo de votre téléphone pour connecter réellement votre appareil physique à ce réseau.
        </Text>

        <View style={styles.qrCode}>
          <Text style={styles.qrLabel}>WiFi QR Code</Text>
          <Text style={styles.qrCodeText} numberOfLines={2}>{qrCodeString}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.disconnectBtn} onPress={onDisconnect} activeOpacity={0.7}>
        <Text style={styles.disconnectText}>Se Déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wifiIcon: {
    fontSize: 22,
  },
  headerInfo: {
    flex: 1,
  },
  ssid: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '800',
  },
  associatedBadge: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#052e16',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 4,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  detailValue: {
    color: '#f1f5f9',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  speedText: {
    color: '#22c55e',
  },
  qrSection: {
    marginTop: 12,
    gap: 8,
  },
  qrSectionTitle: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  qrSectionDesc: {
    color: '#94a3b8',
    fontSize: 10,
    lineHeight: 14,
  },
  qrCode: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  qrLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qrCodeText: {
    color: '#3b82f6',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  disconnectBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  disconnectText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
