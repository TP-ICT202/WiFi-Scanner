import { WifiNetwork } from '../types';

export function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour12: false });
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function getSignalPercentage(rssi: number): number {
  const min = -95;
  const max = -30;
  if (rssi <= min) return 0;
  if (rssi >= max) return 100;
  return Math.round(((rssi - min) / (max - min)) * 100);
}

export function getWiFiSpeed(rssi: number, frequency: number): string {
  const is5GHz = frequency > 5000;
  if (is5GHz) {
    if (rssi >= -45) return '1.2 Gbps';
    if (rssi >= -55) return '866 Mbps';
    if (rssi >= -65) return '650 Mbps';
    if (rssi >= -75) return '433 Mbps';
    if (rssi >= -85) return '150 Mbps';
    return '54 Mbps';
  }
  if (rssi >= -45) return '300 Mbps';
  if (rssi >= -55) return '216 Mbps';
  if (rssi >= -65) return '144 Mbps';
  if (rssi >= -75) return '72 Mbps';
  return '11 Mbps';
}

export function getChannelFromFrequency(freq: number): number {
  if (freq >= 2412 && freq <= 2484) return Math.floor((freq - 2407) / 5);
  if (freq >= 5170 && freq <= 5825) return Math.floor((freq - 5000) / 5);
  return 0;
}

export function getSecurityType(capabilities: string): WifiNetwork['security'] {
  if (capabilities.includes('WPA3')) return 'WPA3-PSK';
  if (capabilities.includes('WPA2')) return 'WPA2-PSK';
  if (capabilities.includes('WEP')) return 'WEP';
  return 'OPEN';
}

export function getSignalColor(percentage: number): string {
  if (percentage > 70) return '#22c55e';
  if (percentage > 45) return '#f59e0b';
  return '#ef4444';
}
