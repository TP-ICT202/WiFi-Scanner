# GUIDE_Scanner — Application Wi-Fi Scanner & Connector

Application React Native (0.79.2) de **scan, connexion et gestion** des réseaux Wi-Fi via des modules natifs Kotlin (Android) et Swift (iOS).

---

## Sommaire

1. [Architecture générale](#1-architecture-générale)
2. [Fonctionnalités et code](#2-fonctionnalités-et-code)
   - [2.1 Scan des réseaux Wi-Fi](#21-scan-des-réseaux-wi-fi)
   - [2.2 Connexion à un réseau](#22-connexion-à-un-réseau)
   - [2.3 Déconnexion](#23-déconnexion)
   - [2.4 Allumer / Éteindre le Wi-Fi](#24-allumer--éteindre-le-wi-fi)
   - [2.5 Affichage du réseau connecté](#25-affichage-du-réseau-connecté)
   - [2.6 Filtre par SSID](#26-filtre-par-ssid)
   - [2.7 Carte réseau (WifiNetworkCard)](#27-carte-réseau-wifinetworkcard)
   - [2.8 Dialogue de mot de passe](#28-dialogue-de-mot-de-passe)
   - [2.9 Gestion des permissions](#29-gestion-des-permissions)
   - [2.10 Console de logs natifs](#210-console-de-logs-natifs)
   - [2.11 Page d'accueil (Home)](#211-page-daccueil-home)
   - [2.12 Page de configuration (Settings)](#212-page-de-configuration-settings)
   - [2.13 Navigation par onglets (BottomNav)](#213-navigation-par-onglets-bottomnav)
3. [Hooks et état global](#3-hooks-et-état-global)
4. [Service JS de pont natif](#4-service-js-de-pont-natif)
5. [Module natif Android (Kotlin)](#5-module-natif-android-kotlin)
6. [Module natif iOS (Swift)](#6-module-natif-ios-swift)

---

## 1. Architecture générale

```
App.tsx                          ← Point d'entrée, état activeScreen, rendu des écrans
├── useWifiScanner()             ← Hook central : toute la logique métier
│   └── wifiScanner.ts           ← Service JS : interface avec le module natif
│       ├── NativeModules.WifiScanModule  ← Kotlin (Android)
│       └── NativeModules.WifiScanModule  ← Swift (iOS)
├── HomeScreen                   ← Accueil : résumé connexion, actions rapides
├── ScanScreen                   ← Scan : liste des réseaux, toggle, recherche
├── SettingsScreen               ← Configuration : permissions, logs, infos
├── BottomNav                    ← Barre de navigation basse à 3 onglets
├── components/
│   ├── ConnectedNetworkCard      ← Carte détails du réseau connecté
│   ├── WifiNetworkCard           ← Carte d'un réseau dans la liste
│   ├── ConnectionDialogue       ← Popup de saisie du mot de passe
│   ├── LogConsole               ← Afficheur de logs natifs
│   └── PermissionCard           ← Résumé des permissions
└── utils/wifiUtils.ts           ← Fonctions utilitaires (signal, vitesse, etc.)
```

**Fichier** | **Rôle**
--- | ---
`App.tsx` : 19-21 | `useState<AppScreen>('home')` + `useWifiScanner()` : état de navigation et hook partagé
`App.tsx` : 38-65 | `renderScreen()` switch : rend `HomeScreen`, `ScanScreen` ou `SettingsScreen`
`App.tsx` : 73-77 | `<BottomNav>` rendu sous les écrans

---

## 2. Fonctionnalités et code

### 2.1 Scan des réseaux Wi-Fi

**Déclenchement :** Bouton ▶ dans `ScanScreen.tsx`

| Étape | Fichier : Ligne | Code |
|---|---|---|
| **UI** bouton scan | `ScanScreen.tsx` : 165-176 | `onPress={() => startScan(...)}` |
| **Hook** startScan | `useWifiScanner.ts` : 100-113 | `wifiScanner.startScan(config); setIsScanning(true)` |
| **Service JS** startScan | `wifiScanner.ts` : 54-61 | `WifiScanModule.startScan(scanIntervalMs, rssiThreshold)` |
| **Natif Kotlin** startScan | `WifiScanModule.kt` : 63-85 | Enregistre `BroadcastReceiver` pour `SCAN_RESULTS_AVAILABLE_ACTION`, lance `Handler` + `Runnable` périodique |
| **Natif Kotlin** scanReceiver | `WifiScanModule.kt` : 45-49 | `onReceive` → appelle `sendScanResults()` |
| **Natif Kotlin** sendScanResults | `WifiScanModule.kt` : 294-315 | Parcourt `wifiManager.scanResults`, filtre par `rssiThreshold`, envoie `onWifiListUpdated` à JS |
| **Appel JS** onWifiListUpdated | `wifiScanner.ts` : 81-89 | `eventEmitter.addListener('onWifiListUpdated', callback)` |
| **Hook** écoute | `useWifiScanner.ts` : 178-183 | Met à jour `networks` state et `networksRef` |
| **Affichage** | `ScanScreen.tsx` : 208-220 | `.map()` → `<WifiNetworkCard>` pour chaque réseau |

### 2.2 Connexion à un réseau

| Étape | Fichier : Ligne | Code |
|---|---|---|
| **UI** appui sur carte | `ScanScreen.tsx` : 52-62 | `handleNetworkPress()` : si OPEN → `connectToNetwork(ssid)`, sinon → dialogue password |
| **UI** dialogue password | `ConnectionDialogue.tsx` : 33-43 | `handleConnect(ssid, password)` → `onConnect(ssid, password)` |
| **Hook** connectToNetwork | `useWifiScanner.ts` : 131-167 | Appelle `wifiScanner.connect(ssid, password)`, met à jour `connectingNetwork` / `connectedNetwork` |
| **Service JS** connect | `wifiScanner.ts` : 68-74 | `WifiScanModule.connectToNetwork(ssid, password)` |
| **Natif Kotlin** connectToNetwork | `WifiScanModule.kt` : 118-125 | Dispatch : `connectModern()` (API ≥ 29) ou `connectLegacy()` |

#### Connexion moderne (API 29+ / Android 10+)

| Étape | Fichier : Ligne | Code |
|---|---|---|
| `connectModern()` | `WifiScanModule.kt` : 127-192 | Crée `WifiNetworkSpecifier` + `NetworkRequest` + `NetworkCallback` |
| `onAvailable` | `WifiScanModule.kt` : 147-158 | `bindProcessToNetwork()` → résout `promise.resolve()` + envoie `onConnectionStatusChanged` |
| `WifiNetworkSuggestion` | `WifiScanModule.kt` : 178-191 | Ajoute le réseau aux suggestions système pour persistance |

#### Connexion legacy (API < 29 / Android 8.1)

| Étape | Fichier : Ligne | Code |
|---|---|---|
| `connectLegacy()` | `WifiScanModule.kt` : 194-277 | Supprime config existante → `addNetwork()` → `saveConfiguration()` |
| BroadcastReceiver connexion | `WifiScanModule.kt` : 233-259 | Écoute `NETWORK_STATE_CHANGED_ACTION` ; quand `networkInfo.isConnected` et `wifiInfo.ssid` correspond → résout la promesse |
| Déclenchement | `WifiScanModule.kt` : 261-273 | `wifiManager.disconnect()` → attente 600ms → `enableNetwork(netId, true)` |
| Timeout | `WifiScanModule.kt` : 276-277 | 15 secondes max → rejette la promesse |

### 2.3 Déconnexion

| Étape | Fichier : Ligne | Code |
|---|---|---|
| **UI** bouton Se Déconnecter | `ConnectedNetworkCard.tsx` : 67 | `onPress={onDisconnect}` |
| **Hook** disconnect | `useWifiScanner.ts` : 169-175 | `wifiScanner.disconnect(); setConnectedNetwork(null)` |
| **Service JS** disconnect | `wifiScanner.ts` : 77-78 | `WifiScanModule?.disconnect()` |
| **Natif Kotlin** disconnect | `WifiScanModule.kt` : 281-288 | `wifiManager.disconnect()` + `unregisterNetworkCallback()` |

### 2.4 Allumer / Éteindre le Wi-Fi

| Étape | Fichier : Ligne | Code |
|---|---|---|
| **UI** Switch | `ScanScreen.tsx` : 112-117 | `<Switch value={wifiEnabled} onValueChange={toggleWifi} />` |
| **Hook** toggleWifi | `useWifiScanner.ts` : 69-77 | `wifiScanner.setWifiEnabled(enabled)` |
| **Service JS** setWifiEnabled | `wifiScanner.ts` : 117-123 | `WifiScanModule.setWifiEnabled(enabled)` |
| **Natif Kotlin** setWifiEnabled | `WifiScanModule.kt` : 108-113 | `wifiManager.setWifiEnabled(enabled)` |
| **Natif iOS** setWifiEnabled | `WifiScanModule.swift` : 140-152 | Ouvre les Réglages iOS (toggle programmatique impossible) |

### 2.5 Affichage du réseau connecté

Composant : `ConnectedNetworkCard.tsx`

**Position :**
- `ScanScreen.tsx` : 134-141 — sous "Wi-Fi Hardware", au-dessus des avertissements
- `HomeScreen.tsx` : 33-41 — remplace le statut "Current Link State" quand connecté

**Contenu :** (lignes `ConnectedNetworkCard.tsx`)

| Élément | Ligne | Détail |
|---|---|---|
| SSID + badge "Associated" | 33-43 | En-tête avec icône Wi-Fi |
| Adresse BSSID | 46-49 | Affichage monospace |
| Security | 51-54 | Type de sécurité (WPA2, OPEN...) |
| Sec (bande + canal) | 56-59 | Ex: "5 GHz · Ch 36" |
| Débit | 61-64 | Vitesse estimée + pourcentage signal |
| QR Code | 66-80 | `WIFI:S:SSID;T:WPA;P:;B:BSSID;` |
| Bouton Se Déconnecter | 82-86 | Appelle `onDisconnect` |

### 2.6 Filtre par SSID

| Étape | Fichier : Ligne | Code |
|---|---|---|
| **UI** TextInput | `ScanScreen.tsx` : 148-162 | Champ de recherche avec icône 🔍 + bouton ✕ |
| **Filtrage** | `ScanScreen.tsx` : 43-49 | `filteredNetworks = networks.filter(n => n.ssid.toLowerCase().includes(searchSsid.toLowerCase()))` |
| **Tri** | `ScanScreen.tsx` : 49 | `.sort((a, b) => b.rssi - a.rssi)` par puissance décroissante |

### 2.7 Carte réseau (WifiNetworkCard)

Composant : `WifiNetworkCard.tsx`

| Élément | Fichier : Ligne | Code |
|---|---|---|
| _Props_ | `WifiNetworkCard.tsx` : 6-12 | `{ network, isConnected, isConnecting, onPress, theme }` |
| Barres de signal | `WifiNetworkCard.tsx` : 110-131 | `WifiBars()` : 4 barres, hauteur variable selon `percentage` |
| SSID + badge | `WifiNetworkCard.tsx` : 54-63 | `Connected` (vert) ou `Connecting...` (jaune) |
| Métadonnées | `WifiNetworkCard.tsx` : 65-82 | `BSSID · bande · canal` + chip sécurité + chip % + vitesse |
| Icône cadenas | `WifiNetworkCard.tsx` : 90-93 | 🔓 pour OPEN, 🔒 pour sécurisé |
| Couleur carte | `WifiNetworkCard.tsx` : 36-41 | Bordure bleue `#3b82f6` si connecté |

### 2.8 Dialogue de mot de passe

Composant : `ConnectionDialogue.tsx`

| Élément | Fichier : Ligne | Code |
|---|---|---|
| _Props_ | `ConnectionDialogue.tsx` : 14-20 | `{ network, visible, onConnect, onCancel, theme }` |
| Modal | `ConnectionDialogue.tsx` : 28-32 | `<Modal visible={visible} transparent animationType="fade">` |
| Champ password | `ConnectionDialogue.tsx` : 79-93 | `<TextInput secureTextEntry>` |
| Bouton Connecter | `ConnectionDialogue.tsx` : 104-110 | `onPress → onConnect(ssid, password)` |
| Bouton Annuler | `ConnectionDialogue.tsx` : 111-117 | `onPress → onCancel()` |

### 2.9 Gestion des permissions

**Déclaration AndroidManifest :** `AndroidManifest.xml` : 3-8

| Permission | Ligne | Usage |
|---|---|---|
| `INTERNET` | 3 | Communication réseau |
| `ACCESS_FINE_LOCATION` | 4 | Requis pour le scan Wi-Fi (Android) |
| `ACCESS_COARSE_LOCATION` | 5 | Alternative localisation |
| `ACCESS_WIFI_STATE` | 6 | Lire l'état Wi-Fi |
| `CHANGE_WIFI_STATE` | 7 | Activer/désactiver le Wi-Fi |
| `NEARBY_WIFI_DEVICES` | 8 | Android 13+ |

**Demande runtime :**

| Étape | Fichier : Ligne | Code |
|---|---|---|
| **UI** bouton "Request" | `SettingsScreen.tsx` : 50-54 | `<PermissionCard ... onRequestPermissions={requestPermissions} />` |
| **Hook** requestPermissions | `useWifiScanner.ts` : 79-98 | Appelle `wifiScanner.requestPermissions()` |
| **Service JS** | `wifiScanner.ts` : 29-51 | `PermissionsAndroid.requestMultiple(...)` pour `FINE_LOCATION` + `COARSE_LOCATION` |

### 2.10 Console de logs natifs

Composant : `LogConsole.tsx`

| Élément | Fichier : Ligne | Code |
|---|---|---|
| _Props_ | `LogConsole.tsx` : 5-8 | `{ logs, theme }` |
| Affichage | `LogConsole.tsx` : 31-60 | `.map()` → chaque log avec couleur par niveau (info/success/warn/error) |
| Utilisation | `SettingsScreen.tsx` : 127 | `<LogConsole logs={logs} theme={theme} />` (uniquement dans Settings) |
| Logs format | `useWifiScanner.ts` : 49-61 | `{ id, timestamp, level, message, source }` — limité à 100 entrées |

### 2.11 Page d'accueil (Home)

Composant : `HomeScreen.tsx`

| Section | Lignes | Code |
|---|---|---|
| Bannière "WifiBridge" | 16-30 | Carte bleue avec titre, sous-titre et warning module natif |
| Réseau connecté | 33-41 | `connectedNetwork ? <ConnectedNetworkCard> : <statusCard>` |
| Stats : Wi-Fi ON / Discovered | 80-89 | Deux petites cartes en grille |
| Quick Actions | 92-114 | "Start Wi-Fi Scan" → navigue vers Scan, "Configure Settings" → navigue vers Settings |

### 2.12 Page de configuration (Settings)

Composant : `SettingsScreen.tsx`

| Section | Lignes | Code |
|---|---|---|
| Onglets : Permissions / Network Config / About | 20-46 | 3 `TouchableOpacity` avec `activeTab` state |
| Permissions | 49-55 | `<PermissionCard>` |
| Network Config | 57-95 | Infos statiques : intervalle, seuil RSSI, filtre SSID |
| About | 98-125 | Version, plateforme, bridge, license + liste de fonctionnalités |
| LogConsole | 127 | Logs natifs |

### 2.13 Navigation par onglets (BottomNav)

Composant : `BottomNav.tsx`

| Élément | Fichier : Ligne | Code |
|---|---|---|
| Tabs config | `BottomNav.tsx` : 11-16 | `[{ key: 'home', label: 'Home', icon: '🏠' }, ...]` |
| Rendu | `BottomNav.tsx` : 17-47 | Barre fixe en bas avec 3 onglets ; onglet actif surligné |
| Appel | `App.tsx` : 73-77 | `<BottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} theme={theme} />` |

---

## 3. Hook — `useWifiScanner()`

Fichier : `src/hooks/useWifiScanner.ts`

C'est le **cerveau de l'application**. Il encapsule toute la logique métier et expose l'état + les actions.

### États (useState)

| Variable | Type | Ligne | Initialisation |
|---|---|---|---|
| `networks` | `WifiNetwork[]` | 33 | `[]` |
| `connectedNetwork` | `WifiNetwork \| null` | 34 | `null` |
| `connectingNetwork` | `WifiNetwork \| null` | 35 | `null` |
| `isScanning` | `boolean` | 36 | `false` |
| `wifiEnabled` | `boolean` | 37 | `true` |
| `logs` | `ConsoleLog[]` | 38 | `[]` |
| `permissions` | `PermissionsState` | 39-43 | `{ fineLocation: 'denied', coarseLocation: 'denied', wifiState: 'granted' }` |

### Callbacks retournés

| Callback | Ligne | Action |
|---|---|---|
| `addLog(level, message, source)` | 49-61 | Ajoute un log avec timestamp + ID |
| `requestPermissions()` | 79-98 | Demande les permissions location |
| `startScan(config?)` | 100-113 | Lance le scan périodique |
| `stopScan()` | 115-121 | Arrête le scan |
| `refreshScan()` | 123-129 | Stop + redémarre après 300ms |
| `connectToNetwork(ssid, password?)` | 131-167 | Connecte au réseau + met à jour `connectedNetwork` |
| `disconnect()` | 169-175 | Déconnecte + vide `connectedNetwork` |
| `toggleWifi(enabled)` | 69-77 | Active/désactive le Wi-Fi |

### Effets (useEffect)

| Effet | Ligne | Code |
|---|---|---|
| Vérification initiale Wi-Fi | 63-67 | `wifiScanner.isWifiEnabled().then(setWifiEnabled)` au montage |
| Souscription événements | 177-199 | Écoute `onWifiListUpdated` + `onConnectionStatusChanged` ; nettoie au démontage |

---

## 4. Service JS — `wifiScanner.ts`

Fichier : `src/services/wifiScanner.ts`

Classe `WifiScannerService` qui fait le pont entre le hook React et le module natif.

| Méthode | Ligne | Module natif appelé |
|---|---|---|
| `requestPermissions()` | 29-51 | `PermissionsAndroid.requestMultiple()` (JS) + `WifiScanModule.requestPermissions()` (iOS) |
| `startScan(config)` | 54-61 | `WifiScanModule.startScan(scanIntervalMs, rssiThreshold)` |
| `stopScan()` | 64-65 | `WifiScanModule.stopScan()` |
| `connect(ssid, password?)` | 68-74 | `WifiScanModule.connectToNetwork(ssid, password)` |
| `disconnect()` | 77-78 | `WifiScanModule.disconnect()` |
| `isWifiEnabled()` | 108-114 | `WifiScanModule.isWifiEnabled()` |
| `setWifiEnabled(enabled)` | 117-123 | `WifiScanModule.setWifiEnabled(enabled)` |
| `onWifiListUpdated(cb)` | 81-89 | `NativeEventEmitter.addListener('onWifiListUpdated')` |
| `onConnectionStatusChanged(cb)` | 91-100 | `NativeEventEmitter.addListener('onConnectionStatusChanged')` |

---

## 5. Module natif Android (Kotlin)

Fichier : `android/.../modules/WifiScanModule.kt`

### Méthodes annotées `@ReactMethod`

| Méthode | Ligne | Description technique |
|---|---|---|
| `requestPermissions(promise)` | 54-61 | Résout `true` (permissions gérées côté JS) |
| `startScan(scanIntervalMs, rssiThreshold)` | 63-85 | Crée `Handler` + `Runnable` périodique. Enregistre `BroadcastReceiver` pour `WifiManager.SCAN_RESULTS_AVAILABLE_ACTION` |
| `stopScan()` | 87-97 | `unregisterReceiver`, `removeCallbacksAndMessages` |
| `isWifiEnabled(promise)` | 99-106 | Retourne `wifiManager.isWifiEnabled` |
| `setWifiEnabled(enabled, promise)` | 108-116 | `wifiManager.setWifiEnabled(enabled)` |
| `connectToNetwork(ssid, password, promise)` | 118-125 | Dispatch selon SDK : `connectModern()` ou `connectLegacy()` |
| `disconnect()` | 281-288 | `wifiManager.disconnect()` + `unregisterNetworkCallback` |

### Helpers privés

| Méthode | Ligne | Rôle |
|---|---|---|
| `connectModern()` | 127-192 | API 29+ : `WifiNetworkSpecifier` + `NetworkRequest` + `NetworkCallback.onAvailable` + `WifiNetworkSuggestion` |
| `connectLegacy()` | 194-277 | API < 29 : `WifiConfiguration` + `addNetwork` + `BroadcastReceiver` `NETWORK_STATE_CHANGED_ACTION` |
| `sendScanResults()` | 294-315 | Parcourt `wifiManager.scanResults`, construit `WritableArray`, émet `onWifiListUpdated` |
| `sendEvent()` | 316-319 | Émet un événement via `RCTDeviceEventEmitter` |
| `hasPermissions()` | 322-327 | Vérifie `ACCESS_FINE_LOCATION` |
| `getChannelFromFrequency()` | 329-335 | Calcule le canal Wi-Fi depuis la fréquence |
| `getSecurityType()` | 337-344 | Parse `capabilities` → `WPA3-PSK`, `WPA2-PSK`, `WEP`, `OPEN` |

---

## 6. Module natif iOS (Swift)

Fichier : `ios/WifiScanner/WifiScanModule.swift`

### Méthodes exposées à JS

| Méthode | Ligne | API iOS utilisée |
|---|---|---|
| `requestPermissions()` | 30-38 | `CLLocationManager.authorizationStatus()` |
| `startScan()` | 40-54 | `DispatchSourceTimer` + `CNCopySupportedInterfaces()` / `CNCopyCurrentNetworkInfo()` |
| `stopScan()` | 56-60 | `timer?.cancel()` |
| `connectToNetwork()` | 104-129 | `NEHotspotConfigurationManager.shared.apply(config)` |
| `isWifiEnabled()` | 131-138 | `CWFWiFiManager()` (toujours `nil` sur iOS — retourne `false`) |
| `setWifiEnabled()` | 140-152 | Ouvre `UIApplication.openSettingsURLString` (iOS ne permet pas le toggle programmatique) |
| `disconnect()` | 154-157 | `NEHotspotConfigurationManager.shared.removeConfiguration(forSSID:)` |

### Pont Obj-C (`WifiScanModule.m`)

| Macro | Ligne | Swift associé |
|---|---|---|
| `RCT_EXTERN_METHOD(requestPermissions:rejecter:)` | 9-10 | `requestPermissions(_:rejecter:)` |
| `RCT_EXTERN_METHOD(startScan:rssiThreshold:)` | 12-13 | `startScan(_:rssiThreshold:)` |
| `RCT_EXTERN_METHOD(connectToNetwork:password:resolver:rejecter:)` | 17-20 | `connectToNetwork(_:password:resolver:rejecter:)` |

---

## Types principaux

Fichier : `src/types/index.ts`

| Interface | Ligne | Champs |
|---|---|---|
| `WifiNetwork` | 1-8 | `ssid, bssid, rssi, frequency, channel, security` |
| `WifiScanConfig` | 10-13 | `scanIntervalMs?, rssiThreshold?` |
| `ConnectResult` | 15-17 | `success, message` |
| `PermissionsState` | 22-26 | `fineLocation, coarseLocation, wifiState` |
| `ConsoleLog` | 28-34 | `id, timestamp, level, message, source` |
| `ConnectionStatus` | 36-39 | `ssid, connected, bssid?` |
| `AppScreen` | 42 | `'home' \| 'scan' \| 'settings'` |

---

## Utilitaires

Fichier : `src/utils/wifiUtils.ts`

| Fonction | Ligne | Description |
|---|---|---|
| `formatTime()` | 3-6 | Heure actuelle format HH:MM:SS |
| `generateId()` | 8-10 | ID aléatoire pour les logs |
| `getSignalPercentage(rssi)` | 12-18 | Convertit RSSI (-95 à -30) en pourcentage (0-100) |
| `getWiFiSpeed(rssi, frequency)` | 20-35 | Estime le débit (Mbps/Gbps) selon RSSI et bande |
| `getChannelFromFrequency(freq)` | 37-41 | Calcule le canal depuis la fréquence (2.4/5 GHz) |
| `getSecurityType(capabilities)` | 43-48 | Parse les capabilities en type de sécurité |
| `getSignalColor(percentage)` | 50-53 | Vert (>70%), orange (>45%), rouge (≤45%) |
