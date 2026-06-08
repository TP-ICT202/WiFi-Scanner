import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PermissionsState } from '../types';

interface PermissionCardProps {
  permissions: PermissionsState;
  onRequestPermissions: () => void;
  theme: any;
}

export default function PermissionCard({ permissions, onRequestPermissions, theme }: PermissionCardProps) {
  const allGranted = permissions.fineLocation === 'granted' && permissions.coarseLocation === 'granted';

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🛡️</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>System Permissions</Text>
        {allGranted ? (
          <Text style={styles.grantedAll}>All Granted ✓</Text>
        ) : null}
      </View>

      <PermissionRow
        label="Fine Location (GPS)"
        androidPermission="ACCESS_FINE_LOCATION"
        status={permissions.fineLocation}
        theme={theme}
      />
      <PermissionRow
        label="Coarse Location"
        androidPermission="ACCESS_COARSE_LOCATION"
        status={permissions.coarseLocation}
        theme={theme}
      />
      <PermissionRow
        label="Wi-Fi State"
        androidPermission="ACCESS_WIFI_STATE"
        status={permissions.wifiState}
        theme={theme}
      />

      {!allGranted && (
        <TouchableOpacity style={styles.requestBtn} onPress={onRequestPermissions} activeOpacity={0.8}>
          <Text style={styles.requestBtnText}>Grant Permissions</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PermissionRow({
  label,
  androidPermission,
  status,
  theme,
}: {
  label: string;
  androidPermission: string;
  status: string;
  theme: any;
}) {
  const statusColor =
    status === 'granted' ? '#22c55e' : status === 'denied' ? '#ef4444' : '#f59e0b';
  const statusLabel =
    status === 'granted' ? 'Granted' : status === 'denied' ? 'Denied' : 'Prompt';

  return (
    <View style={styles.row}>
      <View>
        <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[styles.rowPermission, { color: theme.colors.textSecondary }]}>
          {androidPermission}
        </Text>
      </View>
      <Text style={[styles.rowStatus, { color: statusColor }]}>{statusLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  grantedAll: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  rowPermission: {
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  rowStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  requestBtn: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  requestBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
