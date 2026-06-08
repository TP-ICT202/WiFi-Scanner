export interface WifiNetwork {
  ssid: string;
  bssid: string;
  rssi: number;
  frequency: number;
  channel: number;
  security: 'WPA3-PSK' | 'WPA2-PSK' | 'WEP' | 'OPEN';
}

export interface WifiScanConfig {
  scanIntervalMs?: number;
  rssiThreshold?: number;
}

export interface ConnectResult {
  success: boolean;
  message: string;
}

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable';

export interface PermissionsState {
  fineLocation: PermissionStatus;
  coarseLocation: PermissionStatus;
  wifiState: PermissionStatus;
}

export interface ConsoleLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  source: 'Kotlin' | 'Swift' | 'JSBridge' | 'System';
}

export interface ConnectionStatus {
  ssid: string;
  connected: boolean;
  bssid?: string;
}

export type AppScreen = 'home' | 'scan' | 'settings' | 'logs';
