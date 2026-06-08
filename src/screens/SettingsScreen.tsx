import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import PermissionCard from '../components/PermissionCard';
import LogConsole from '../components/LogConsole';

interface SettingsScreenProps {
  scanner: any;
  theme: any;
}

type ConfigTab = 'permissions' | 'network' | 'about';

export default function SettingsScreen({ scanner, theme }: SettingsScreenProps) {
  const { permissions, logs, addLog, requestPermissions } = scanner;
  const [activeTab, setActiveTab] = useState<ConfigTab>('permissions');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tab Selector */}
      <View style={styles.tabsRow}>
        {([
          { key: 'permissions', label: 'Permissions' },
          { key: 'network', label: 'Network Config' },
          { key: 'about', label: 'About' },
        ] as { key: ConfigTab; label: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              {
                backgroundColor: activeTab === tab.key ? '#3b82f6' : '#1e293b',
                borderColor: activeTab === tab.key ? '#3b82f6' : theme.colors.border,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? '#fff' : '#94a3b8' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'permissions' && (
        <PermissionCard
          permissions={permissions}
          onRequestPermissions={requestPermissions}
          theme={theme}
        />
      )}

      {activeTab === 'network' && (
        <View style={[styles.configCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.configTitle, { color: theme.colors.text }]}>
            Scan Configuration
          </Text>

          <ConfigRow
            label="Scan Interval"
            description="Time between auto-scans"
            value="10 seconds"
            theme={theme}
          />
          <ConfigRow
            label="RSSI Threshold"
            description="Minimum signal strength"
            value="-90 dBm"
            theme={theme}
          />
          <ConfigRow
            label="SSID Filter"
            description="Filter by network name"
            value="Disabled"
            theme={theme}
          />
          <ConfigRow
            label="BSSID Whitelist"
            description="Only trusted MACs"
            value="Inactive"
            theme={theme}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Configure these options programmatically via{' '}
              <Text style={styles.infoCode}>WifiScanner.startConfig()</Text> in your app code.
            </Text>
          </View>
        </View>
      )}

      {activeTab === 'about' && (
        <View style={[styles.configCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.configTitle, { color: theme.colors.text }]}>
            WifiBridge Library
          </Text>

          <AboutRow label="Version" value="1.0.0" theme={theme} />
          <AboutRow label="Platform" value="Android (Kotlin) + iOS (Swift)" theme={theme} />
          <AboutRow label="Bridge" value="React Native TypeScript" theme={theme} />
          <AboutRow label="Min SDK" value="Android 7.0+ / iOS 15.0+" theme={theme} />
          <AboutRow label="License" value="Apache-2.0" theme={theme} />

          <View style={styles.aboutDescription}>
            <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>
              A production-grade React Native library to scan and associate Wi-Fi networks in real-time
              across Android (Kotlin) and iOS (Swift), managing complex permissions and secure parameters.
            </Text>
          </View>

          <View style={styles.featureList}>
            <Text style={styles.featureItem}>✓ Cross-platform unified API</Text>
            <Text style={styles.featureItem}>✓ WPA3/WPA2/WEP/OPEN support</Text>
            <Text style={styles.featureItem}>✓ Secure passphrase handling</Text>
            <Text style={styles.featureItem}>✓ Real-time event emitters</Text>
            <Text style={styles.featureItem}>✓ Automatic permission management</Text>
          </View>
        </View>
      )}

      <LogConsole logs={logs} theme={theme} />
    </ScrollView>
  );
}

function ConfigRow({
  label,
  description,
  value,
  theme,
}: {
  label: string;
  description: string;
  value: string;
  theme: any;
}) {
  return (
    <View style={configRowStyles.row}>
      <View>
        <Text style={[configRowStyles.label, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[configRowStyles.desc, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Text style={configRowStyles.value}>{value}</Text>
    </View>
  );
}

function AboutRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: any;
}) {
  return (
    <View style={configRowStyles.row}>
      <Text style={[configRowStyles.label, { color: theme.colors.text }]}>{label}</Text>
      <Text style={[configRowStyles.desc, { color: theme.colors.textSecondary }]}> {value}</Text>
    </View>
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
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  configCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  configTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#172554',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    color: '#93c5fd',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  infoCode: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#60a5fa',
  },
  aboutDescription: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  aboutText: {
    fontSize: 12,
    lineHeight: 18,
  },
  featureList: {
    marginTop: 10,
    gap: 4,
  },
  featureItem: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '600',
  },
});

const configRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  desc: {
    fontSize: 10,
    marginTop: 1,
  },
  value: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '700',
  },
});
