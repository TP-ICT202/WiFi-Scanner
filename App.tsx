import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { AppScreen } from './src/types';
import { useWifiScanner } from './src/hooks/useWifiScanner';
import { COLORS } from './src/constants/theme';
import HomeScreen from './src/screens/HomeScreen';
import ScanScreen from './src/screens/ScanScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BottomNav from './src/components/BottomNav';

export default function App() {
  const isDark = useColorScheme() === 'dark';
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home');

  const scanner = useWifiScanner();

  const theme = {
    isDark: true,
    colors: {
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
      border: '#334155',
      primary: '#3b82f6',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return (
          <HomeScreen
            scanner={scanner}
            theme={theme}
            onNavigate={setActiveScreen}
          />
        );
      case 'scan':
        return (
          <ScanScreen scanner={scanner} theme={theme} />
        );
      case 'settings':
        return (
          <SettingsScreen scanner={scanner} theme={theme} />
        );
      default:
        return (
          <HomeScreen
            scanner={scanner}
            theme={theme}
            onNavigate={setActiveScreen}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <BottomNav
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
