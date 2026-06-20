import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WifiNetwork } from '../types';
import { getSignalPercentage, getSignalColor } from '../utils/wifiUtils';

interface WifiNetworkCardProps {
  network: WifiNetwork;
  isConnected: boolean;
  isConnecting: boolean;
  onPress: (network: WifiNetwork) => void;
  theme: any;
}

export default function WifiNetworkCard({
  network,
  isConnected,
  isConnecting,
  onPress,
  theme,
}: WifiNetworkCardProps) {
  const percentage = getSignalPercentage(network.rssi);
  const signalColor = getSignalColor(percentage);
  const isOpen = network.security === 'OPEN';
  const is5GHz = network.frequency > 5000;

  const frequencyBand = is5GHz ? '5 GHz' : '2.4 GHz';
  const channelLabel = `Ch ${network.channel}`;
  const securityLabel =
    network.security === 'OPEN' ? 'Open' : network.security;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isConnected ? '#1e3a5f' : theme.colors.surface,
          borderColor: isConnected ? '#3b82f6' : theme.colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.cardBody}
        onPress={() => onPress(network)}
        disabled={isConnected || isConnecting}
        activeOpacity={0.7}
      >
        <View style={styles.left}>
          <View style={styles.signalContainer}>
            <WifiBars percentage={percentage} color={signalColor} />
          </View>
          <View style={styles.networkInfo}>
            <View style={styles.ssidRow}>
              <Text style={[styles.ssid, { color: theme.colors.text }]} numberOfLines={1}>
                {network.ssid}
              </Text>
              {isConnected && (
                <Text style={styles.connectedBadge}>Connected</Text>
              )}
              {isConnecting && (
                <Text style={styles.connectingBadge}>Connecting...</Text>
              )}
            </View>
            <Text style={[styles.details, { color: theme.colors.textSecondary }]}>
              {network.bssid} · {frequencyBand} · {channelLabel}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.metaChip, { backgroundColor: theme.colors.border }]}>
                <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>
                  {securityLabel}
                </Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: theme.colors.border }]}>
                <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>
                  {percentage}%
                </Text>
              </View>
              <Text style={[styles.speed, { color: signalColor }]}>
                {getWiFiSpeedText(network.rssi, network.frequency)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.right}>
          {isConnecting ? (
            <Text style={styles.loadingDots}>...</Text>
          ) : !isConnected && (
            <Text style={styles.securityIcon}>
              {isOpen ? '🔓' : '🔒'}
            </Text>
          )}
        </View>
      </TouchableOpacity>

    </View>
  );
}

function WifiBars({ percentage, color }: { percentage: number; color: string }) {
  const bars = [1, 2, 3, 4];
  const activeBars = percentage >= 80 ? 4 : percentage >= 55 ? 3 : percentage >= 30 ? 2 : 1;

  return (
    <View style={wifiStyles.container}>
      {bars.map((_, i) => (
        <View
          key={i}
          style={[
            wifiStyles.bar,
            {
              height: (i + 1) * 4,
              backgroundColor: i < activeBars ? color : '#334155',
              width: 3,
              marginLeft: i === 0 ? 0 : 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

function getWiFiSpeedText(rssi: number, frequency: number): string {
  const is5GHz = frequency > 5000;
  if (is5GHz) {
    if (rssi >= -45) return '1.2 Gbps';
    if (rssi >= -55) return '866 Mbps';
    if (rssi >= -65) return '650 Mbps';
    if (rssi >= -75) return '433 Mbps';
    return '150 Mbps';
  }
  if (rssi >= -45) return '300 Mbps';
  if (rssi >= -55) return '216 Mbps';
  if (rssi >= -65) return '144 Mbps';
  if (rssi >= -75) return '72 Mbps';
  return '11 Mbps';
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
    overflow: 'hidden',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  signalContainer: {
    marginRight: 10,
  },
  networkInfo: {
    flex: 1,
  },
  ssidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ssid: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  connectedBadge: {
    fontSize: 9,
    color: '#22c55e',
    backgroundColor: '#052e16',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
    overflow: 'hidden',
  },
  connectingBadge: {
    fontSize: 9,
    color: '#f59e0b',
    backgroundColor: '#451a03',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
    overflow: 'hidden',
  },
  details: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  metaChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  metaChipText: {
    fontSize: 9,
    fontWeight: '600',
  },
  speed: {
    fontSize: 10,
    fontWeight: '600',
  },
  right: {
    alignItems: 'center',
    marginLeft: 8,
  },
  loadingDots: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: '700',
  },
  securityIcon: {
    fontSize: 16,
  },
});

const wifiStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
  },
  bar: {
    borderRadius: 1,
  },
});
