import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ConsoleLog } from '../types';

interface LogConsoleProps {
  logs: ConsoleLog[];
  theme: any;
}

const sourceColors: Record<string, string> = {
  Kotlin: '#a78bfa',
  Swift: '#38bdf8',
  JSBridge: '#34d399',
  System: '#fbbf24',
};

const levelColors: Record<string, string> = {
  error: '#f87171',
  warn: '#fbbf24',
  success: '#34d399',
  info: '#cbd5e1',
};

const sourcePrefix: Record<string, string> = {
  Kotlin: '[Kotlin]',
  Swift: '[Swift]',
  JSBridge: '[Bridge]',
  System: '[Sys]',
};

export default function LogConsole({ logs, theme }: LogConsoleProps) {
  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>⬤</Text>
        <Text style={styles.headerTitle}>Native Bridge Logger</Text>
        <Text style={styles.logCount}>{logs.length}</Text>
      </View>
      <ScrollView style={styles.logList} contentContainerStyle={styles.logListContent}>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No logs yet. Start a scan to see events.</Text>
        ) : (
          logs.map(log => (
            <View key={log.id} style={styles.logEntry}>
              <View style={styles.logMeta}>
                <Text style={styles.timestamp}>{log.timestamp}</Text>
                <Text style={[styles.sourceTag, { color: sourceColors[log.source] || '#94a3b8' }]}>
                  {sourcePrefix[log.source] || '[?]'}
                </Text>
              </View>
              <Text style={[styles.logMessage, { color: levelColors[log.level] || '#cbd5e1' }]}>
                {log.message}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    flex: 1,
    minHeight: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerIcon: {
    color: '#22c55e',
    fontSize: 8,
    marginRight: 6,
  },
  headerTitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  logCount: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  logList: {
    flex: 1,
  },
  logListContent: {
    padding: 8,
    paddingBottom: 16,
  },
  emptyText: {
    color: '#475569',
    fontSize: 11,
    padding: 12,
    fontStyle: 'italic',
  },
  logEntry: {
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#0a0a0a',
    paddingBottom: 4,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  timestamp: {
    color: '#475569',
    fontSize: 8,
    fontFamily: 'monospace',
  },
  sourceTag: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  logMessage: {
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 15,
  },
});
