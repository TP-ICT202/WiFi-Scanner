import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import { WifiNetwork, WifiScanConfig, ConnectResult, ConnectionStatus } from '../types';

const { WifiScanModule } = NativeModules;

export interface WifiScannerInterface {
  requestPermissions(): Promise<boolean>;
  startScan(config?: WifiScanConfig): void;
  stopScan(): void;
  connect(ssid: string, password?: string): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  isWifiEnabled(): Promise<boolean>;
  setWifiEnabled(enabled: boolean): Promise<boolean>;
  onWifiListUpdated(callback: (networks: WifiNetwork[]) => void): { remove: () => void };
  onConnectionStatusChanged(callback: (status: ConnectionStatus) => void): { remove: () => void };
}

class WifiScannerService implements WifiScannerInterface {
  private eventEmitter: NativeEventEmitter | null = null;
  private listeners: { remove: () => void }[] = [];

  constructor() {
    if (WifiScanModule) {
      this.eventEmitter = new NativeEventEmitter(WifiScanModule);
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION as string,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION as string,
        ];
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        const fineGranted =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const coarseGranted =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;
        return fineGranted || coarseGranted;
      } catch {
        return false;
      }
    }
    if (Platform.OS === 'ios') {
      const result = await WifiScanModule?.requestPermissions();
      return result ?? true;
    }
    return false;
  }

  startScan(config: WifiScanConfig = {}): void {
    if (!WifiScanModule) {
      console.warn('[WifiScanner] Native module not available');
      return;
    }
    const scanIntervalMs = config.scanIntervalMs ?? 10000;
    const rssiThreshold = config.rssiThreshold ?? -90;
    WifiScanModule.startScan(scanIntervalMs, rssiThreshold);
  }

  stopScan(): void {
    WifiScanModule?.stopScan();
  }

  async connect(ssid: string, password?: string): Promise<ConnectResult> {
    try {
      const result = await WifiScanModule?.connectToNetwork(ssid, password ?? '');
      return result ?? { success: false, message: 'Module unavailable' };
    } catch (error: any) {
      return { success: false, message: error?.message ?? 'Connection failed' };
    }
  }

  async disconnect(): Promise<void> {
    await WifiScanModule?.disconnect();
  }

  onWifiListUpdated(callback: (networks: WifiNetwork[]) => void): { remove: () => void } {
    if (!this.eventEmitter) {
      return { remove: () => {} };
    }
    const subscription = this.eventEmitter.addListener('onWifiListUpdated', callback);
    const entry = { remove: () => subscription.remove() };
    this.listeners.push(entry);
    return entry;
  }

  onConnectionStatusChanged(
    callback: (status: ConnectionStatus) => void,
  ): { remove: () => void } {
    if (!this.eventEmitter) {
      return { remove: () => {} };
    }
    const subscription = this.eventEmitter.addListener('onConnectionStatusChanged', callback);
    const entry = { remove: () => subscription.remove() };
    this.listeners.push(entry);
    return entry;
  }

  cleanup(): void {
    this.listeners.forEach(l => l.remove());
    this.listeners = [];
  }

  async isWifiEnabled(): Promise<boolean> {
    try {
      const result = await WifiScanModule?.isWifiEnabled();
      return result ?? false;
    } catch {
      return false;
    }
  }

  async setWifiEnabled(enabled: boolean): Promise<boolean> {
    try {
      const result = await WifiScanModule?.setWifiEnabled(enabled);
      return result ?? false;
    } catch {
      return false;
    }
  }

  async setLastNetwork(ssid: string, password: string): Promise<void> {
    await WifiScanModule?.setLastNetwork(ssid, password);
  }

  async getLastNetwork(): Promise<{ ssid: string; password: string } | null> {
    try {
      return (await WifiScanModule?.getLastNetwork()) ?? null;
    } catch {
      return null;
    }
  }

  async clearLastNetwork(): Promise<void> {
    await WifiScanModule?.clearLastNetwork();
  }

  isModuleAvailable(): boolean {
    return WifiScanModule != null;
  }
}

export const wifiScanner = new WifiScannerService();
export default wifiScanner;
