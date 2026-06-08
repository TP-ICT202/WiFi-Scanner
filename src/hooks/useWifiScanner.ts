import { useState, useEffect, useCallback, useRef } from 'react';
import {
  WifiNetwork,
  WifiScanConfig,
  ConsoleLog,
  ConnectResult,
  PermissionsState,
  ConnectionStatus,
} from '../types';
import wifiScanner from '../services/wifiScanner';
import { formatTime, generateId, getSignalPercentage } from '../utils/wifiUtils';

interface UseWifiScannerReturn {
  networks: WifiNetwork[];
  connectedNetwork: WifiNetwork | null;
  connectingNetwork: WifiNetwork | null;
  isScanning: boolean;
  logs: ConsoleLog[];
  permissions: PermissionsState;
  isModuleAvailable: boolean;
  addLog: (level: ConsoleLog['level'], message: string, source: ConsoleLog['source']) => void;
  requestPermissions: () => Promise<boolean>;
  startScan: (config?: WifiScanConfig) => void;
  stopScan: () => void;
  refreshScan: () => void;
  connectToNetwork: (ssid: string, password?: string) => Promise<ConnectResult>;
  disconnect: () => void;
}

export function useWifiScanner(): UseWifiScannerReturn {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [connectedNetwork, setConnectedNetwork] = useState<WifiNetwork | null>(null);
  const [connectingNetwork, setConnectingNetwork] = useState<WifiNetwork | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [permissions, setPermissions] = useState<PermissionsState>({
    fineLocation: 'denied',
    coarseLocation: 'denied',
    wifiState: 'granted',
  });

  const networksRef = useRef<WifiNetwork[]>([]);
  const listenersRef = useRef<{ remove: () => void }[]>([]);
  const isModuleAvailable = wifiScanner.isModuleAvailable();

  const addLog = useCallback(
    (level: ConsoleLog['level'], message: string, source: ConsoleLog['source']) => {
      const log: ConsoleLog = {
        id: generateId(),
        timestamp: formatTime(),
        level,
        message,
        source,
      };
      setLogs(prev => [log, ...prev].slice(0, 100));
    },
    [],
  );

  const requestPermissions = useCallback(async () => {
    addLog('info', 'Requesting location permissions for Wi-Fi scanning...', 'JSBridge');
    const granted = await wifiScanner.requestPermissions();
    if (granted) {
      setPermissions(prev => ({
        ...prev,
        fineLocation: 'granted',
        coarseLocation: 'granted',
      }));
      addLog('success', 'Location permissions granted successfully', 'JSBridge');
    } else {
      setPermissions(prev => ({
        ...prev,
        fineLocation: 'denied',
        coarseLocation: 'denied',
      }));
      addLog('warn', 'Location permissions denied by user', 'JSBridge');
    }
    return granted;
  }, [addLog]);

  const startScan = useCallback(
    (config?: WifiScanConfig) => {
      addLog(
        'info',
        `Starting Wi-Fi scan (interval: ${config?.scanIntervalMs ?? 10000}ms, threshold: ${config?.rssiThreshold ?? -90}dBm)`,
        'JSBridge',
      );
      addLog('info', 'Kotlin: registering WifiManager BroadcastReceiver', 'Kotlin');
      addLog('info', 'Swift: initializing NEHotspotConfigurationManager', 'Swift');
      wifiScanner.startScan(config);
      setIsScanning(true);
    },
    [addLog],
  );

  const stopScan = useCallback(() => {
    wifiScanner.stopScan();
    setIsScanning(false);
    addLog('info', 'Kotlin: BroadcastReceiver detached, scan stopped', 'Kotlin');
    addLog('info', 'Swift: GCD queue cancelled', 'Swift');
    addLog('info', 'Wi-Fi scan stopped', 'JSBridge');
  }, [addLog]);

  const refreshScan = useCallback(() => {
    addLog('info', 'Manual scan refresh triggered', 'JSBridge');
    wifiScanner.stopScan();
    setTimeout(() => {
      wifiScanner.startScan();
    }, 300);
  }, [addLog]);

  const connectToNetwork = useCallback(
    async (ssid: string, password?: string): Promise<ConnectResult> => {
      addLog('info', `Connecting to "${ssid}"...`, 'JSBridge');
      addLog('info', `Kotlin: dispatching WifiNetworkSpecifier for ${ssid}`, 'Kotlin');
      addLog('info', `Swift: applying NEHotspotConfiguration for ${ssid}`, 'Swift');

      const network = networksRef.current.find(n => n.ssid === ssid);
      if (network) {
        setConnectingNetwork(network);
      }

      const result = await wifiScanner.connect(ssid, password);
      setConnectingNetwork(null);

      if (result.success) {
        const net =
          network ??
          ({
            ssid,
            bssid: '',
            rssi: -50,
            frequency: 0,
            channel: 0,
            security: password ? 'WPA2-PSK' : 'OPEN',
          } as WifiNetwork);
        setConnectedNetwork(net);
        addLog('success', `Connected to "${ssid}" - DHCP lease acquired`, 'Kotlin');
        addLog('success', `NEHotspotConfiguration linked successfully`, 'Swift');
      } else {
        addLog('error', `Failed to connect to "${ssid}": ${result.message}`, 'Kotlin');
        addLog('error', `${result.message}`, 'Swift');
      }
      addLog(result.success ? 'success' : 'error', result.message, 'JSBridge');
      return result;
    },
    [addLog],
  );

  const disconnect = useCallback(() => {
    if (connectedNetwork) {
      addLog('info', `Disconnecting from "${connectedNetwork.ssid}"`, 'JSBridge');
      wifiScanner.disconnect();
      setConnectedNetwork(null);
    }
  }, [connectedNetwork, addLog]);

  useEffect(() => {
    const listSub = wifiScanner.onWifiListUpdated((nets: WifiNetwork[]) => {
      const sorted = [...nets].sort((a, b) => b.rssi - a.rssi);
      networksRef.current = sorted;
      setNetworks(sorted);
      addLog('info', `onWifiListUpdated: ${sorted.length} networks found`, 'JSBridge');
    });

    const statusSub = wifiScanner.onConnectionStatusChanged((status: ConnectionStatus) => {
      addLog(
        status.connected ? 'success' : 'warn',
        `Connection status: ${status.ssid} -> ${status.connected ? 'connected' : 'disconnected'}`,
        'JSBridge',
      );
    });

    listenersRef.current = [listSub, statusSub];

    return () => {
      listenersRef.current.forEach(l => l.remove());
      wifiScanner.stopScan();
    };
  }, [addLog]);

  return {
    networks,
    connectedNetwork,
    connectingNetwork,
    isScanning,
    logs,
    permissions,
    isModuleAvailable,
    addLog,
    requestPermissions,
    startScan,
    stopScan,
    refreshScan,
    connectToNetwork,
    disconnect,
  };
}
