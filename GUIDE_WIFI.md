# GUIDE_WIFI — Fonctionnement détaillé du scan & connexion Wi-Fi

---

## Table des matières

1. [Architecture du projet](#1-architecture-du-projet)
2. [Où est importé le module natif Kotlin ?](#2-où-est-importé-le-module-natif-kotlin-)
3. [Comment le scan Wi-Fi fonctionne-t-il ?](#3-comment-le-scan-wi-fi-fonctionne-t-il-)
   - [3.1 Déclenchement depuis l'UI](#31-déclenchement-depuis-lui)
   - [3.2 Service JS — pont vers le natif](#32-service-js--pont-vers-le-natif)
   - [3.3 Module Kotlin — le scan Android](#33-module-kotlin--le-scan-android)
   - [3.4 Remontée des résultats vers JS](#34-remontée-des-résultats-vers-js)
4. [Comment la connexion est-elle gérée ?](#4-comment-la-connexion-est-elle-gérée-)
   - [4.1 Dialogue de mot de passe](#41-dialogue-de-mot-de-passe)
   - [4.2 Connexion moderne (Android 10+)](#42-connexion-moderne-android-10)
   - [4.3 Connexion legacy (Android < 10)](#43-connexion-legacy-android--10)
   - [4.4 Sauvegarde et auto-reconnect](#44-sauvegarde-et-auto-reconnect)
   - [4.5 Déconnexion](#45-déconnexion)
5. [Comment l'application fonctionne-t-elle ?](#5-comment-lapplication-fonctionne-t-elle-)
   - [5.1 Point d'entrée App.tsx](#51-point-dentrée-apptsx)
   - [5.2 Le Hook central useWifiScanner](#52-le-hook-central-usewifiscanner)
   - [5.3 Les écrans](#53-les-écrans)
   - [5.4 Actions utilisateur](#54-actions-utilisateur)
6. [Questions & Réponses](#6-questions--réponses)
   - [Q1 : Quels permissions sont nécessaires ?](#q1--quels-permissions-sont-nécessaires-)
   - [Q2 : Pourquoi deux chemins de connexion ?](#q2--pourquoi-deux-chemins-de-connexion-)
   - [Q3 : Comment le Wi-Fi est-il activé/désactivé ?](#q3--comment-le-wi-fi-est-il-activédésactivé-)
   - [Q4 : Comment fonctionne l'auto-reconnect ?](#q4--comment-fonctionne-lauto-reconnect-)
   - [Q5 : Que se passe-t-il sur iOS ?](#q5--que-se-passe-t-il-sur-ios-)
   - [Q6 : Où sont définis les types Wi-Fi ?](#q6--où-sont-définis-les-types-wi-fi-)
   - [Q7 : Comment le QR Code de partage est généré ?](#q7--comment-le-qr-code-de-partage-est-généré-)

---

## 1. Architecture du projet

```
App.tsx                              ← Point d'entrée : initialise le hook + navigation
├── useWifiScanner() [hooks/]         ← Hook React : état global + actions
│   └── wifiScanner [services/]       ← Service JS (import relatif: '../services/wifiScanner')
│       └── NativeModules.WifiScanModule ← Pont React Native → Kotlin / Swift
├── HomeScreen                       ← Accueil : résumé connexion
├── ScanScreen                       ← Scan : liste, toggle Wi-Fi, recherche
├── SettingsScreen                   ← Config : permissions, logs natifs
├── BottomNav                        ← Navigation basse 3 onglets
├── components/
│   ├── WifiNetworkCard              ← Carte réseau dans la liste
│   ├── ConnectedNetworkCard         ← Carte détaillée du réseau connecté
│   ├── ConnectionDialogue           ← Popup mot de passe
│   ├── LogConsole                   ← Console de logs
│   └── PermissionCard              ← État des permissions
├── android/app/src/main/java/.../
│   └── WifiScanModule.kt           ← Module natif KOTLIN (WifiManager API)
└── ios/WifiScanner/
    └── WifiScanModule.swift         ← Module natif SWIFT (NEHotspotConfiguration)
```

> **Tous les imports TypeScript sont en relatif** (`'../types'`, `'../services/wifiScanner'`), pas depuis un paquet npm. Le module natif Kotlin/Swift est enregistré manuellement dans `MainApplication.kt` via `WifiScanPackage` et résolu en JS par `NativeModules.WifiScanModule`.

---

## 2. Où est importé le module natif Kotlin ?

Le module Kotlin **n'est pas importé explicitement** dans le code JS. React Native utilise son système de **NativeModules** qui résout automatiquement le module par son nom.

**Côté JS (service) :** `src/services/wifiScanner.ts:4`
```ts
const { WifiScanModule } = NativeModules;
```

**Import du service et des types dans les hooks/composants :**
```ts
// src/hooks/useWifiScanner.ts
import wifiScanner from '../services/wifiScanner';  // ← import relatif
import { WifiNetwork, ConnectionStatus } from '../types';  // ← import relatif
```

Tous les fichiers utilisent des **chemins relatifs** (`../types`, `../services/wifiScanner`). Aucun paquet npm externe n'est utilisé pour le module Wi-Fi.

**Côté Kotlin :** `WifiScanModule.kt:31,44`
```kotlin
class WifiScanModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WifiScanModule"
}
```

Le nom `"WifiScanModule"` dans `getName()` est la clé que RN utilise pour associer le module natif à `NativeModules.WifiScanModule` côté JS.

**Enregistrement du package :** `WifiScanPackage.kt:8-15`
```kotlin
class WifiScanPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(WifiScanModule(reactContext))   // ← enregistre le module
    }
}
```

**Dans l'application :** `MainApplication.kt` (extrait)
```kotlin
import com.wifiscanner.modules.WifiScanPackage

override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(WifiScanPackage())   // ← ajouté manuellement aux packages
    }
```

---

## 3. Comment le scan Wi-Fi fonctionne-t-il ?

### 3.1 Déclenchement depuis l'UI

L'utilisateur appuie sur le bouton **▶** (lire) dans `ScanScreen.tsx:165-176` :

```tsx
<TouchableOpacity
  onPress={() =>
    isScanning
      ? stopScan()
      : startScan({ scanIntervalMs: 10000, rssiThreshold: -90 })
  }
>
```

`startScan` est un callback récupéré depuis le hook `useWifiScanner`.

### 3.2 Service JS — pont vers le natif

`src/services/wifiScanner.ts:4,54-62`
```ts
const { WifiScanModule } = NativeModules;  // ← récupère le module natif enregistré

startScan(config: WifiScanConfig = {}): void {
    const scanIntervalMs = config.scanIntervalMs ?? 10000;
    const rssiThreshold = config.rssiThreshold ?? -90;
    WifiScanModule.startScan(scanIntervalMs, rssiThreshold);
    //                  ↑ appel direct vers le module natif Kotlin/Swift
}
```

> **Note :** Le service `wifiScanner.ts` est importé dans les hooks via **chemin relatif** (`'../services/wifiScanner'`), pas via un paquet npm. Voir section [6.Q8](#q8--pourquoi-les-imports-sont-en-relatif-et-non-depuis-un-paquet-npm-) pour les détails.

La méthode `startScan(scanIntervalMs, rssiThreshold)` est appelée sur le module natif avec 2 paramètres :
- **scanIntervalMs** : intervalle entre chaque scan (ms)
- **rssiThreshold** : seuil de signal minimum (dBm)

### 3.3 Module Kotlin — le scan Android

`WifiScanModule.kt:64-86`

```kotlin
@ReactMethod
fun startScan(scanIntervalMs: Int, rssiThreshold: Int) {
    if (isScanning) return
    this.rssiThreshold = rssiThreshold
    isScanning = true

    // 1. Enregistre un BroadcastReceiver pour écouter les résultats
    val filter = IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
    reactApplicationContext.registerReceiver(scanReceiver, filter)

    // 2. Crée un Runnable périodique avec Handler
    scanHandler = Handler(Looper.getMainLooper())
    scanRunnable = object : Runnable {
        override fun run() {
            if (hasPermissions()) {
                val scanSuccess = wifiManager.startScan()  // ← déclenche le scan
                if (!scanSuccess) {
                    sendEvent("onScanError", "Scan initiation failed")
                }
            }
            scanHandler?.postDelayed(this, scanIntervalMs.toLong()) // ← répète
        }
    }
    scanHandler?.post(scanRunnable!!)
}
```

**Explication :**
1. `wifiManager.startScan()` — méthode Android native qui demande au système d'effectuer un scan des réseaux Wi-Fi environnants
2. Le résultat arrive **asynchrone** via un **BroadcastReceiver** qui écoute `SCAN_RESULTS_AVAILABLE_ACTION`
3. Le `Handler` + `Runnable` crée une boucle périodique qui répète le scan toutes les `scanIntervalMs` millisecondes

**Le BroadcastReceiver :** `WifiScanModule.kt:46-53`
```kotlin
private val scanReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val success = intent.getBooleanExtra(
            WifiManager.EXTRA_RESULTS_UPDATED, false
        )
        if (success) {
            sendScanResults()  // ← envoie les résultats vers JS
        }
    }
}
```

### 3.4 Remontée des résultats vers JS

`WifiScanModule.kt:333-353` — `sendScanResults()`

```kotlin
private fun sendScanResults() {
    if (!hasPermissions()) return

    val results: List<ScanResult> = wifiManager.scanResults  // ← liste brute Android
    val networkList: WritableArray = Arguments.createArray()

    for (result in results) {
        if (result.level < rssiThreshold) continue  // ← filtre par signal

        val map = Arguments.createMap()
        map.putString("ssid", result.SSID)
        map.putString("bssid", result.BSSID)
        map.putInt("rssi", result.level)
        map.putInt("frequency", result.frequency)
        map.putInt("channel", getChannelFromFrequency(result.frequency))
        map.putString("security", getSecurityType(result.capabilities))
        networkList.pushMap(map)
    }

    sendEvent("onWifiListUpdated", networkList)  // ← événement vers JS
}
```

**Types de sécurité détectés :** `WifiScanModule.kt:376-383`
```kotlin
private fun getSecurityType(capabilities: String): String = when {
    capabilities.contains("WPA3") -> "WPA3-PSK"
    capabilities.contains("WPA2") -> "WPA2-PSK"
    capabilities.contains("WEP") -> "WEP"
    else -> "OPEN"
}
```

**Canal calculé depuis la fréquence :** `WifiScanModule.kt:368-374`
```kotlin
private fun getChannelFromFrequency(freq: Int): Int = when {
    freq in 2412..2484 -> (freq - 2407) / 5   // 2.4 GHz : canaux 1-13
    freq in 5170..5825 -> (freq - 5000) / 5   // 5 GHz   : canaux 34-165
    else -> 0
}
```

**Côté JS**, l'événement `onWifiListUpdated` est reçu : `wifiScanner.ts:81-89`
```ts
onWifiListUpdated(callback) {
    const subscription = this.eventEmitter.addListener('onWifiListUpdated', callback);
    return { remove: () => subscription.remove() };
}
```

**Dans le hook :** `useWifiScanner.ts:213-218`
```ts
const listSub = wifiScanner.onWifiListUpdated((nets) => {
    const sorted = [...nets].sort((a, b) => b.rssi - a.rssi);
    networksRef.current = sorted;
    setNetworks(sorted);
});
```

**Affichage dans ScanScreen :** `ScanScreen.tsx:208-215`
```tsx
{filteredNetworks.map((net) => (
    <WifiNetworkCard
        key={net.bssid}
        network={net}
        isConnected={connectedNetwork?.bssid === net.bssid}
        onPress={handleNetworkPress}
        theme={theme}
    />
))}
```

---

## 4. Comment la connexion est-elle gérée ?

### 4.1 Dialogue de mot de passe

Quand l'utilisateur appuie sur un réseau **sécurisé**, `ScanScreen.tsx:57-60` :
```tsx
if (network.security === 'OPEN') {
    connectToNetwork(network.ssid);
} else {
    setSelectedNetwork(network);
    setShowDialogue(true);  // ← ouvre le popup
}
```

Le composant `ConnectionDialogue.tsx` affiche une `Modal` avec un champ `TextInput secureTextEntry` :
```tsx
<TextInput
    secureTextEntry
    placeholder="Enter Wi-Fi password..."
    value={password}
    onChangeText={setPassword}
/>
```

Quand l'utilisateur valide, `handleConnect` appelle `onConnect(ssid, password)` :
`ConnectionDialogue.tsx:33-43`
```tsx
const handleConnect = () => {
    if (password.trim()) {
        onConnect(network.ssid, password.trim());
    }
};
```

### 4.2 Connexion moderne (Android 10+)

`WifiScanModule.kt:128-192` — `connectModern()`

Utilisée quand `Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q (29)`.

```kotlin
private fun connectModern(ssid: String, password: String, promise: Promise) {
    // 1. Crée un WifiNetworkSpecifier (API 29+)
    val specifier = WifiNetworkSpecifier.Builder()
        .setSsid(ssid)
        .apply {
            if (password.isNotEmpty()) setWpa2Passphrase(password)
        }
        .build()

    // 2. Crée une requête réseau avec ce specifier
    val request = NetworkRequest.Builder()
        .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
        .setNetworkSpecifier(specifier)
        .build()

    // 3. Demande au ConnectivityManager d'établir la connexion
    val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            connectivityManager.bindProcessToNetwork(network)
            // Résout la promesse JS
            promise.resolve(map)
            sendEvent("onConnectionStatusChanged", statusMap)
        }

        override fun onUnavailable() {
            promise.reject("CONNECTION_FAILED", "Failed to connect to $ssid")
        }

        override fun onLost(network: Network) {
            sendEvent("onConnectionStatusChanged", disconnectedMap)
        }
    }
    connectivityManager.requestNetwork(request, callback)
}
```

**Explication :**
- `WifiNetworkSpecifier` : introduit en Android 10, il permet de spécifier le réseau Wi-Fi auquel se connecter
- Le système affiche une boîte de dialogue à l'utilisateur pour approbation
- `onAvailable()` est appelé quand la connexion est établie
- `WifiNetworkSuggestion` (lignes 178-191) ajoute le réseau aux suggestions système pour **persistance** (le téléphone se souvient du réseau)

### 4.3 Connexion legacy (Android < 10)

`WifiScanModule.kt:195-279` — `connectLegacy()`

Utilisée sur les appareils Android 8.1/9.0 (dont SDK 27, comme le téléphone de test).

```kotlin
private fun connectLegacy(ssid: String, password: String, promise: Promise) {
    // 1. Supprime une éventuelle config existante pour le même SSID
    val existing = wifiManager.configuredNetworks
        ?.find { it.SSID == "\"$ssid\"" }
    if (existing != null) {
        wifiManager.removeNetwork(existing.networkId)
        wifiManager.saveConfiguration()
    }

    // 2. Crée une configuration réseau
    val wifiConfig = WifiConfiguration().apply {
        SSID = "\"$ssid\""
        if (password.isNotEmpty()) {
            preSharedKey = "\"$password\""
        } else {
            allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE)
        }
        priority = 99999
        status = WifiConfiguration.Status.ENABLED
    }

    val netId = wifiManager.addNetwork(wifiConfig)
    wifiManager.saveConfiguration()

    // 3. Écoute l'événement NETWORK_STATE_CHANGED
    val connectReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val networkInfo = intent.getParcelableExtra<NetworkInfo>(
                WifiManager.EXTRA_NETWORK_INFO
            )
            if (networkInfo.isConnected && wifiInfo.ssid == "\"$ssid\"") {
                // Connexion physique réussie !
                promise.resolve(map)
                sendEvent("onConnectionStatusChanged", statusMap)
            }
        }
    }
    reactApplicationContext.registerReceiver(connectReceiver, connectFilter)

    // 4. Déconnecte le réseau actuel puis active le nouveau
    wifiManager.disconnect()
    Handler(Looper.getMainLooper()).postDelayed({
        wifiManager.enableNetwork(netId, true)
    }, 600)  // ← attend 600ms que la déconnexion se termine
}
```

**Pourquoi cette approche ?**
- En Android < 10, `WifiNetworkSpecifier` n'existe pas
- On utilise `WifiConfiguration` + `addNetwork()` + `enableNetwork()`
- Au lieu de supposer que `enableNetwork()` a réussi, on **écoute réellement** l'événement `NETWORK_STATE_CHANGED_ACTION` pour confirmer que le téléphone est physiquement connecté
- Timeout de 15 secondes si la connexion échoue

### 4.4 Sauvegarde et auto-reconnect

**Sauvegarde côté natif (SharedPreferences) :** `WifiScanModule.kt:282-307`

```kotlin
@ReactMethod
fun setLastNetwork(ssid: String, password: String) {
    reactApplicationContext
        .getSharedPreferences("wifi_scanner", Context.MODE_PRIVATE)
        .edit()
        .putString("last_ssid", ssid)
        .putString("last_password", password)
        .apply()
}

@ReactMethod
fun getLastNetwork(promise: Promise) {
    val prefs = reactApplicationContext
        .getSharedPreferences("wifi_scanner", Context.MODE_PRIVATE)
    val ssid = prefs.getString("last_ssid", null) ?: return promise.resolve(null)
    promise.resolve(mapOf("ssid" to ssid, "password" to prefs.getString(...)))
}
```

**Appel côté JS :** `useWifiScanner.ts:193`
```ts
if (result.success) {
    wifiScanner.setLastNetwork(ssid, password ?? '');  // ← sauvegarde
}
```

**Auto-reconnect au démarrage :** `useWifiScanner.ts:63-70`
```ts
useEffect(() => {
    wifiScanner.isWifiEnabled().then(enabled => {
        setWifiEnabled(enabled);
        if (enabled) {
            setTimeout(() => autoReconnect(), 3000);  // ← 3s après démarrage
        }
    });
}, [autoReconnect]);
```

**Auto-reconnect après activation Wi-Fi :** `useWifiScanner.ts:100-111`
```ts
const toggleWifi = useCallback(async (enabled) => {
    if (result && enabled) {
        setTimeout(() => autoReconnect(), 2000);  // ← 2s après activation
    }
});
```

### 4.5 Déconnexion

**JS → Hook :** `useWifiScanner.ts:204-211`
```ts
const disconnect = useCallback(() => {
    wifiScanner.disconnect();
    setConnectedNetwork(null);
    wifiScanner.clearLastNetwork();  // ← efface le réseau sauvegardé
});
```

**Natif Kotlin :** `WifiScanModule.kt:320-327`
```kotlin
fun disconnect() {
    wifiManager.disconnect()
    activeNetworkCallback?.let { callback ->
        connectivityManager.unregisterNetworkCallback(callback)
    }
    activeNetworkCallback = null
}
```

**Côté iOS :** `WifiScanModule.swift:154-157`
```swift
func disconnect() {
    NEHotspotConfigurationManager.shared.removeConfiguration(forSSID: "")
}
```

---

## 5. Comment l'application fonctionne-t-elle ?

### 5.1 Point d'entrée App.tsx

`App.tsx` est le composant racine. Il :

1. **Initialise le hook** `useWifiScanner()` (ligne 21) qui centralise tout l'état
2. **Définit le thème** dark (lignes 23-36) avec couleurs : fond `#0f172a`, surface `#1e293b`, texte `#f8fafc`
3. **Gère la navigation** par `activeScreen` state (ligne 19) : `'home' | 'scan' | 'settings'`
4. **Rend l'écran actif** via `renderScreen()` (ligne 38) qui switch sur les 3 écrans
5. **Affiche la BottomNav** (ligne 73) pour changer d'écran

```tsx
export default function App() {
    const [activeScreen, setActiveScreen] = useState<AppScreen>('home');
    const scanner = useWifiScanner();
    // ...
    return (
        <SafeAreaView>
            <StatusBar />
            {renderScreen()}        {/* ← l'écran actif */}
            <BottomNav ... />        {/* ← barre de navigation */}
        </SafeAreaView>
    );
}
```

### 5.2 Le Hook central useWifiScanner

Fichier : `src/hooks/useWifiScanner.ts`

C'est un **custom hook React** qui encapsule toute la logique métier :

| Élément | Type | Rôle |
|---|---|---|
| `networks` | `WifiNetwork[]` | Liste des réseaux scannés |
| `connectedNetwork` | `WifiNetwork \| null` | Réseau actuellement connecté |
| `isScanning` | `boolean` | État du scan en cours |
| `wifiEnabled` | `boolean` | État du Wi-Fi (on/off) |
| `logs` | `ConsoleLog[]` | Historique des logs (100 max) |
| `permissions` | `PermissionsState` | État des permissions |
| `startScan()` | callback | Lance le scan périodique |
| `connectToNetwork()` | callback | Connecte à un réseau |
| `disconnect()` | callback | Déconnecte |
| `toggleWifi()` | callback | Active/désactive le Wi-Fi |

### 5.3 Les écrans

| Écran | Fichier | Fonctionnalités |
|---|---|---|
| **Home** | `HomeScreen.tsx` | Bannière, carte réseau connecté / état déconnecté, stats (Wi-Fi ON, découverts), actions rapides |
| **Scan** | `ScanScreen.tsx` | Toggle Wi-Fi, carte réseau connecté (détails), avertissements, barre recherche, boutons scan, liste réseaux |
| **Settings** | `SettingsScreen.tsx` | 3 onglets : Permissions, Network Config, About + console logs |

### 5.4 Actions utilisateur

```
[Scan] Appui sur Switch Wi-Fi
    → toggleWifi() [hook:100]
    → wifiScanner.setWifiEnabled(enabled) [service:117]
    → WifiScanModule.setWifiEnabled(enabled) [Kotlin:109]
    → wifiManager.setWifiEnabled(enabled) [Android API]
    ← résultat booléen → mise à jour UI + log

[Scan] Appui sur ▶ (Scan)
    → startScan() [hook:134]
    → wifiScanner.startScan(config) [service:54]
    → WifiScanModule.startScan(interval, threshold) [Kotlin:65]
    → Handler + Runnable + wifiManager.startScan() [boucle périodique]
    → BroadcastReceiver → sendScanResults()
    → EventEmitter 'onWifiListUpdated' → JS → setNetworks()

[Scan] Appui sur un réseau
    → handleNetworkPress() [ScanScreen:52]
    → si OPEN : connectToNetwork(ssid)
    → si sécurisé : modal password → connectToNetwork(ssid, password)
    → wifiScanner.connect(ssid, password) [service:68]
    → WifiScanModule.connectToNetwork(ssid, password, promise) [Kotlin:119]
    → connectModern() ou connectLegacy()
    ← promesse résolue → setConnectedNetwork() + log
    ← sauvegarde du réseau (SharedPreferences) pour auto-reconnect

[Home/Scan] Appui sur "Se Déconnecter"
    → disconnect() [hook:204]
    → wifiScanner.disconnect() [service:77]
    → WifiScanModule.disconnect() [Kotlin:321]
    → wifiManager.disconnect() + unregisterNetworkCallback()
    → clearLastNetwork() [supprime les identifiants sauvegardés]
```

---

## 6. Questions & Réponses

### Q1 : Quels permissions sont nécessaires ?

**Déclarées dans** `AndroidManifest.xml:3-8` :

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.NEARBY_WIFI_DEVICES" />
```

**Demandées au runtime** dans `wifiScanner.ts:29-42` :
```ts
const permissions = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
];
const granted = await PermissionsAndroid.requestMultiple(permissions);
```

> **Pourquoi `ACCESS_FINE_LOCATION` ?** Depuis Android 6, le scan Wi-Fi nécessite la localisation précise (même si on ne l'utilise pas pour géolocaliser l'utilisateur). C'est une exigence du système Android.

---

### Q2 : Pourquoi deux chemins de connexion ?

Android a changé son API Wi-Fi à partir de la version 10 (API 29) :

| Aspect | Legacy (API < 29) | Moderne (API ≥ 29) |
|---|---|---|
| **Classe principale** | `WifiConfiguration` + `WifiManager` | `WifiNetworkSpecifier` + `ConnectivityManager` |
| **Configuration** | `addNetwork()` + `enableNetwork()` | `requestNetwork()` avec specifier |
| **Persistance** | `saveConfiguration()` | `WifiNetworkSuggestion` |
| **Dialogue utilisateur** | Aucun (connexion directe) | Boîte de dialogue système |
| **Disponible depuis** | Android 1.0 | Android 10 (Q) |
| **Déprécié depuis** | Android 10 (Q) | Toujours actif |

**Dans le code :** `WifiScanModule.kt:119-126`
```kotlin
@ReactMethod
fun connectToNetwork(ssid: String, password: String, promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        connectModern(ssid, password, promise)      // API 29+
    } else {
        connectLegacy(ssid, password, promise)       // API < 29
    }
}
```

---

### Q3 : Comment le Wi-Fi est-il activé/désactivé ?

**Android :** `WifiScanModule.kt:100-116`
```kotlin
@ReactMethod
fun setWifiEnabled(enabled: Boolean, promise: Promise) {
    val result = wifiManager.setWifiEnabled(enabled)  // API Android native
    promise.resolve(result)
}
```

**iOS :** `WifiScanModule.swift:140-152`
```swift
func setWifiEnabled(_ enabled, resolver resolve, rejecter reject) {
    if enabled {
        UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!)
    }
    reject("WIFI_TOGGLE_UNAVAILABLE",
           "iOS does not support programmatic WiFi toggle", nil)
}
```

> **Pourquoi iOS ne peut pas ?** Apple ne fournit pas d'API publique pour activer/désactiver le Wi-Fi. L'application redirige vers les Réglages système.

---

### Q4 : Comment fonctionne l'auto-reconnect ?

1. **Sauvegarde** : après une connexion réussie, `setLastNetwork(ssid, password)` est appelé
2. **Stockage natif** : les identifiants sont stockés dans `SharedPreferences` (Android) ou `UserDefaults` (iOS)
3. **Au démarrage** : `useEffect` dans le hook vérifie si Wi-Fi est ON et rappelle `autoReconnect()` après 3s
4. **Au toggle ON** : `toggleWifi(true)` déclenche `autoReconnect()` après 2s
5. **À la déconnexion** : `clearLastNetwork()` efface les identifiants

```ts
// useWifiScanner.ts:72-98
const autoReconnect = useCallback(async () => {
    const saved = await wifiScanner.getLastNetwork();
    if (saved?.ssid) {
        const result = await wifiScanner.connect(saved.ssid, saved.password);
        if (result.success) {
            // Réseau reconnecté avec succès !
        }
    }
});
```

---

### Q5 : Que se passe-t-il sur iOS ?

iOS a des restrictions plus strictes :

| Fonctionnalité | iOS | Android |
|---|---|---|
| **Scan** | Retourne uniquement le réseau connecté (pas de scan visible) | Scan complet via `WifiManager.startScan()` |
| **Connexion** | `NEHotspotConfigurationManager.apply()` | `WifiNetworkSpecifier` ou `addNetwork()` |
| **Toggle Wi-Fi** | Redirection vers Réglages | `wifiManager.setWifiEnabled()` |
| **Permissions** | `CLLocationManager.requestWhenInUseAuthorization()` | `PermissionsAndroid.requestMultiple()` |

**Code iOS Swift :** `WifiScanModule.swift:104-129`
```swift
func connectToNetwork(_ ssid, password, resolver resolve, rejecter reject) {
    let config = NEHotspotConfiguration(ssid: ssid)
    if !password.isEmpty {
        config.password = password
        config.isWPA2 = true
    }
    NEHotspotConfigurationManager.shared.apply(config) { error in
        if let error = error { reject(...) }
        else { resolve(["success": true]) }
    }
}
```

---

### Q6 : Où sont définis les types Wi-Fi ?

Tous les types sont définis dans `src/types/index.ts` et importés via **chemin relatif** :

```ts
// Exemple : import depuis un composant
import { WifiNetwork } from '../types';      // ← chemin relatif
import { AppScreen } from '../types';         // ← chemin relatif
```

Fichier `src/types/index.ts` :
```ts
export interface WifiNetwork {
  ssid: string;           // Nom du réseau
  bssid: string;          // Adresse MAC du point d'accès
  rssi: number;           // Puissance du signal (dBm, ex: -65)
  frequency: number;      // Fréquence (MHz, ex: 2412 ou 5180)
  channel: number;        // Canal (ex: 1, 6, 11, 36)
  security: 'WPA3-PSK' | 'WPA2-PSK' | 'WEP' | 'OPEN';
}

export interface ConnectResult {
  success: boolean;
  message: string;
}

export interface ConnectionStatus {
  ssid: string;
  connected: boolean;
  bssid?: string;
}

export type AppScreen = 'home' | 'scan' | 'settings';
export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable';
export interface PermissionsState { fineLocation: PermissionStatus; coarseLocation: PermissionStatus; wifiState: PermissionStatus; }
export interface ConsoleLog { id: string; timestamp: string; level: 'info'|'warn'|'error'|'success'; message: string; source: 'Kotlin'|'Swift'|'JSBridge'|'System'; }
```

**Tous les fichiers du projet** qui utilisent ces types les importent depuis `'../types'` (chemin relatif).

---

### Q8 : Pourquoi les imports sont en relatif et non depuis un paquet npm ?

**Réponse :** À l'origine, un paquet local `react-native-wifi-scanner` a été créé dans `/tmp/opencode/rn-wifi-scanner-pkg` pour encapsuler le service JS + les types. Il a été installé via :

```json
// package.json (historique)
"react-native-wifi-scanner": "file:../../../../tmp/opencode/rn-wifi-scanner-pkg"
```

Et importé comme ceci :

```ts
// Import historique (plus utilisé)
import { WifiNetwork } from 'react-native-wifi-scanner';
import wifiScanner from 'react-native-wifi-scanner';
```

**Problème rencontré :** Metro (le bundler React Native) ne résout pas correctement les fichiers `.ts` à travers les **symlinks** créés par `npm install file:`. Le paquet était un lien symbolique vers `/tmp/opencode/rn-wifi-scanner-pkg`, et Metro ne pouvait pas résoudre les dépendances de Babel (`@babel/runtime`) depuis ce chemin externe.

**Solution adoptée :** Revenir à des **imports relatifs** classiques, qui fonctionnent de manière fiable avec Metro :

```ts
// Import actuel (utilisé partout)
import { WifiNetwork } from '../types';          // depuis src/types/index.ts
import wifiScanner from '../services/wifiScanner';  // depuis src/services/wifiScanner.ts
```

**Avantages des imports relatifs :**
- Pas de configuration Metro supplémentaire (`watchFolders`, `nodeModulesPaths`)
- Pas de problème de résolution de symlink
- Fonctionne immédiatement avec `npx react-native bundle`
- Types et services toujours dans le projet, pas besoin d'un paquet externe

> **Le paquet npm n'a pas été publié** sur le registre npm. Il est resté local et son utilisation a été abandonnée au profit des imports relatifs plus fiables.

---

### Q7 : Comment le QR Code de partage est généré ?

Dans `ConnectedNetworkCard.tsx:12-14` :

```ts
const qrCodeString =
    `WIFI:S:${network.ssid};T:${network.security === 'OPEN' ? 'nopass' : 'WPA'};P:;B:${network.bssid};`;
```

**Format standard** `WIFI:S:<ssid>;T:<type>;P:<password>;B:<bssid>;;`
- `S` = SSID (nom du réseau)
- `T` = Type d'authentification (`WPA`, `WEP`, `nopass`)
- `P` = Mot de passe (non inclus ici)
- `B` = BSSID (adresse MAC)

L'utilisateur scanne ce QR Code avec l'appareil photo de son téléphone pour se connecter automatiquement au réseau.

---

## Annexe : Dépendances clés

| Dépendance | Version | Usage |
|---|---|---|
| `react-native` | 0.79.2 | Framework |
| — | — | Pas de paquet externe pour le Wi-Fi : le module natif est codé directement dans le projet |

**Modules natifs internes :**
| Fichier | Langage | Emplacement |
|---|---|---|
| `WifiScanModule.kt` | Kotlin | `android/app/src/main/java/com/wifiscanner/modules/` |
| `WifiScanPackage.kt` | Kotlin | `android/app/src/main/java/com/wifiscanner/modules/` |
| `WifiScanModule.swift` | Swift | `ios/WifiScanner/` |
| `WifiScanModule.m` | Obj-C | `ios/WifiScanner/` |

**Service JS et types (imports relatifs) :**
| Fichier | Contenu | Importé par |
|---|---|---|
| `src/services/wifiScanner.ts` | Interface + classe `WifiScannerService` + singleton `wifiScanner` | `'../services/wifiScanner'` |
| `src/types/index.ts` | Interfaces `WifiNetwork`, `ConnectResult`, `ConnectionStatus`, etc. | `'../types'` |

**Build Android :**
```bash
cd android && ./gradlew assembleRelease
```

**APK généré :** `android/app/build/outputs/apk/release/app-release.apk`
