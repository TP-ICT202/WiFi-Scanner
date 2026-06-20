import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppScreen } from '../types';

interface BottomNavProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  theme: any;
}

const tabs: { key: AppScreen; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'scan', label: 'Scan', icon: '📡' },
  { key: 'settings', label: 'Config', icon: '⚙️' },
];

export default function BottomNav({ activeScreen, onNavigate, theme }: BottomNavProps) {
  return (
    <View style={[styles.container, { backgroundColor: '#1e293b', borderTopColor: '#334155' }]}>
      {tabs.map(tab => {
        const isActive = activeScreen === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onNavigate(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon]}>{tab.icon}</Text>
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? '#3b82f6' : '#64748b',
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {tab.label}
            </Text>
            {isActive && <View style={[styles.activeBar, { backgroundColor: '#3b82f6' }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
  activeBar: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: 40,
    borderRadius: 1,
  },
});
