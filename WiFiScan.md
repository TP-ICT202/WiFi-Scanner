# WiFiScan

**React Native** application for scanning, displaying, and connecting to nearby Wi-Fi networks in real-time, with native bridges in **Kotlin** (Android) and **Swift** (iOS).

---

## Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Framework | React Native 0.79.2               |
| JS Engine | Hermes                            |
| Android   | Kotlin (WifiManager, ConnectivityManager) |
| iOS       | Swift (NEHotspotConfigurationManager)    |
| Bundler   | Metro 0.82.5                      |

---

## Project Structure

```
WiFi-Scan/
├── App.tsx                          # Root — navigation & theme
├── index.js                         # Entry point
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx           # Home — connection summary, quick actions
│   │   ├── ScanScreen.tsx           # Scan — network list, search, WiFi toggle
│   │   └── SettingsScreen.tsx       # Settings — permissions, config, native logs
│   ├── components/
│   │   ├── WifiNetworkCard.tsx      # Network card — signal, security, speed, disconnect
│   │   ├── ConnectionDialogue.tsx   # Password prompt for secured networks
│   │   ├── LogConsole.tsx           # Native bridge log viewer
│   │   ├── PermissionCard.tsx       # Permission status summary
│   │   └── BottomNav.tsx            # Bottom tab navigation bar
│   ├── hooks/
│   │   └── useWifiScanner.ts        # Central hook — state, side effects, bridge calls
│   ├── services/
│   │   └── wifiScanner.ts           # Native module JS wrapper
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces
│   ├── constants/
│   │   └── theme.ts                 # Color constants
│   └── utils/
│       └── wifiUtils.ts             # Signal %, color helpers
├── android/
│   └── app/src/main/java/com/wifiscanner/
│       ├── MainApplication.kt      # App entry — SoLoader init, feature flags fix
│       ├── MainActivity.kt         # ReactActivity
│       └── modules/
│           └── WifiScanModule.kt   # Native module — scan, connect, toggle WiFi
├── ios/
│   └── WifiScanner/
│       └── WifiScanModule.swift     # Native module — scan, connect (iOS)
└── WiFiScan.md                      # This file
```

---

## Features

### 1. Real-time Wi-Fi Scanning
- Periodic background scans via `WifiManager.startScan()` (Android) / `CNCopyCurrentNetworkInfo` + mock networks (iOS)
- Configurable scan interval and RSSI threshold
- Results streamed to JS via `RCTDeviceEventEmitter`
- Networks sorted by signal strength

### 2. Network Connection
- **Android Q+**: `WifiNetworkSpecifier` (immediate) + `WifiNetworkSuggestion` (persistent)
- **Android < Q**: `WifiConfiguration` + `enableNetwork()`
- **iOS**: `NEHotspotConfigurationManager.apply()`
- Open networks connect directly; secured networks prompt for password

### 3. Wi-Fi Toggle
- Enable / disable Wi-Fi radio via `WifiManager.setWifiEnabled()` (Android)
- iOS redirects to Settings (programmatic toggle not available)
- Real-time UI feedback with status dot + warning notice

### 4. Connection Management
- Connected network highlighted with blue border + "Connected" badge
- Disconnect button at the bottom of the connected network card
- Connection status events streamed to JS

### 5. Permissions
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` (required for Wi-Fi scanning on Android)
- `CHANGE_WIFI_STATE` (WiFi toggle)
- `NEARBY_WIFI_DEVICES` (Android 13+)
- Location permissions requested at runtime
- Visual warning if permissions are denied

### 6. Native Bridge Logger
- Log viewer available in Settings screen
- Logs from Kotlin, Swift, and JS bridge layers
- Color-coded by level (info, success, warn, error)

### 7. Dark Theme
- Persistent dark color scheme
- Consistent across all screens

---

## Native Bridge API

### `WifiScanModule` (Android — Kotlin)

| Method                        | Parameters                | Returns       | Description                      |
|-------------------------------|---------------------------|---------------|----------------------------------|
| `requestPermissions`          | —                         | `Promise`     | Request location permissions     |
| `startScan`                   | `scanIntervalMs, rssiThreshold` | —        | Start periodic scanning          |
| `stopScan`                    | —                         | —             | Stop scanning                    |
| `connectToNetwork`            | `ssid, password`          | `Promise`     | Connect to network               |
| `disconnect`                  | —                         | —             | Disconnect current network       |
| `isWifiEnabled`               | —                         | `Promise`     | Check if Wi-Fi is on             |
| `setWifiEnabled`              | `enabled`                 | `Promise`     | Enable/disable Wi-Fi             |

**Events emitted**: `onWifiListUpdated`, `onConnectionStatusChanged`, `onScanError`

### `WifiScanModule` (iOS — Swift)

| Method                        | Parameters                | Returns       | Description                      |
|-------------------------------|---------------------------|---------------|----------------------------------|
| `requestPermissions`          | —                         | `Promise`     | Request location permissions     |
| `startScan`                   | `scanIntervalMs, rssiThreshold` | —        | Start periodic scanning          |
| `stopScan`                    | —                         | —             | Stop scanning                    |
| `connectToNetwork`            | `ssid, password`          | `Promise`     | Connect via NEHotspotConfiguration |
| `disconnect`                  | —                         | —             | Remove hotspot configuration     |
| `isWifiEnabled`               | —                         | `Promise`     | Check Wi-Fi state (iOS limited)  |
| `setWifiEnabled`              | `enabled`                 | `Promise`     | Redirect to Settings             |

---

## Screens

| Screen   | Route         | Description                                    |
|----------|---------------|------------------------------------------------|
| **Home** | `home`        | Connection summary, quick-scan, navigate to Scan/Settings |
| **Scan** | `scan`        | Wi-Fi toggle, network list, search, auto-scan toggle, connect |
| **Settings** | `settings` | Permissions, scan configuration, about info, native logs |

---

## Building

```bash
# Android
cd android && ./gradlew assembleRelease

# iOS
cd ios && xcodebuild -workspace WifiScanner.xcworkspace -scheme WifiScanner -configuration Release
```

The APK is output to `android/app/build/outputs/apk/release/app-release.apk`.

---

## Troubleshooting

- **`libhermes_executor.so` crash**: Fixed by calling `SoLoader.init(this, OpenSourceMergedSoMapping)` first in `MainApplication.onCreate()`, before any React Native initialization.
- **`Theme.AppCompat` crash**: Fixed by using `Theme.AppCompat.DayNight.NoActionBar` in `styles.xml`.
- **`react` version mismatch**: Fixed by aligning `react@19.0.0` with the `react-native-renderer@19.0.0` shipped in RN 0.79.2.
