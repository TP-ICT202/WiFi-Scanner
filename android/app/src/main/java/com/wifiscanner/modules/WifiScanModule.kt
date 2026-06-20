package com.wifiscanner.modules

import android.Manifest
import android.content.Context
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.ScanResult
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter

class WifiScanModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val wifiManager: WifiManager =
        reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    private val connectivityManager: ConnectivityManager =
        reactContext.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private var scanHandler: Handler? = null
    private var scanRunnable: Runnable? = null
    private var rssiThreshold: Int = -90
    private var isScanning = false
    private var activeNetworkCallback: ConnectivityManager.NetworkCallback? = null

    override fun getName(): String = "WifiScanModule"

    private val scanReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val success = intent.getBooleanExtra(WifiManager.EXTRA_RESULTS_UPDATED, false)
            if (success) {
                sendScanResults()
            }
        }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            promise.resolve(true)
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun startScan(scanIntervalMs: Int, rssiThreshold: Int) {
        if (isScanning) return
        this.rssiThreshold = rssiThreshold
        isScanning = true

        val filter = IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
        reactApplicationContext.registerReceiver(scanReceiver, filter)

        scanHandler = Handler(Looper.getMainLooper())
        scanRunnable = object : Runnable {
            override fun run() {
                if (hasPermissions()) {
                    val scanSuccess = wifiManager.startScan()
                    if (!scanSuccess) {
                        sendEvent("onScanError", "Scan initiation failed")
                    }
                }
                scanHandler?.postDelayed(this, scanIntervalMs.toLong())
            }
        }
        scanHandler?.post(scanRunnable!!)
    }

    @ReactMethod
    fun stopScan() {
        isScanning = false
        try {
            reactApplicationContext.unregisterReceiver(scanReceiver)
        } catch (_: Exception) {
        }
        scanHandler?.removeCallbacksAndMessages(null)
        scanHandler = null
        scanRunnable = null
    }

    @ReactMethod
    fun isWifiEnabled(promise: Promise) {
        try {
            promise.resolve(wifiManager.isWifiEnabled)
        } catch (e: Exception) {
            promise.reject("WIFI_STATE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setWifiEnabled(enabled: Boolean, promise: Promise) {
        try {
            val result = wifiManager.setWifiEnabled(enabled)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("WIFI_TOGGLE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun connectToNetwork(ssid: String, password: String, promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            connectModern(ssid, password, promise)
        } else {
            connectLegacy(ssid, password, promise)
        }
    }

    private fun connectModern(ssid: String, password: String, promise: Promise) {
        // 1. Remove any previous network callback to avoid leak
        activeNetworkCallback?.let { connectivityManager.unregisterNetworkCallback(it) }
        activeNetworkCallback = null

        val specifier = WifiNetworkSpecifier.Builder()
            .setSsid(ssid)
            .apply {
                if (password.isNotEmpty()) {
                    setWpa2Passphrase(password)
                }
            }
            .build()

        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .setNetworkSpecifier(specifier)
            .build()

        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.d("WifiScanModule", "onAvailable: trying to connect to $ssid")
                connectivityManager.bindProcessToNetwork(network)
                val map = Arguments.createMap()
                map.putBoolean("success", true)
                map.putString("message", "Connected to $ssid")
                promise.resolve(map)

                val statusMap = Arguments.createMap()
                statusMap.putString("ssid", ssid)
                statusMap.putBoolean("connected", true)
                sendEvent("onConnectionStatusChanged", statusMap)
            }

            override fun onUnavailable() {
                Log.d("WifiScanModule", "onUnavailable: could not connect to $ssid")
                promise.reject("CONNECTION_FAILED", "Failed to connect to $ssid")
            }

            override fun onLost(network: Network) {
                Log.d("WifiScanModule", "onLost: disconnected from $ssid")
                val statusMap = Arguments.createMap()
                statusMap.putString("ssid", ssid)
                statusMap.putBoolean("connected", false)
                sendEvent("onConnectionStatusChanged", statusMap)
            }
        }
        activeNetworkCallback = callback
        connectivityManager.requestNetwork(request, callback)

        // WifiNetworkSuggestion — persists network in user's Wi-Fi list
        try {
            val suggestionBuilder = android.net.wifi.WifiNetworkSuggestion.Builder()
                .setSsid(ssid)
            if (password.isNotEmpty()) {
                suggestionBuilder.setWpa2Passphrase(password)
            }
            val suggestion = suggestionBuilder.build()
            val status = wifiManager.addNetworkSuggestions(listOf(suggestion))
            if (status != WifiManager.STATUS_NETWORK_SUGGESTIONS_SUCCESS) {
                Log.d("WifiScanModule", "WifiNetworkSuggestion returned $status")
            }
        } catch (e: Exception) {
            Log.d("WifiScanModule", "WifiNetworkSuggestion error: ${e.message}")
        }
    }

    private fun connectLegacy(ssid: String, password: String, promise: Promise) {
        var resolved = false
        try {
            // Remove existing config for same SSID
            val existing = wifiManager.configuredNetworks
                ?.find { it.SSID == "\"$ssid\"" }
            if (existing != null) {
                wifiManager.removeNetwork(existing.networkId)
                wifiManager.saveConfiguration()
            }

            // Create network configuration
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
            if (netId == -1) {
                promise.reject("LEGACY_ADD_FAILED", "addNetwork returned -1 for $ssid")
                return
            }
            wifiManager.saveConfiguration()

            // Monitor actual connection via broadcast
            val connectFilter = IntentFilter(WifiManager.NETWORK_STATE_CHANGED_ACTION)
            val connectReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    val networkInfo = intent.getParcelableExtra<android.net.NetworkInfo>(
                        WifiManager.EXTRA_NETWORK_INFO
                    )
                    if (networkInfo != null && networkInfo.isConnected && !resolved) {
                        val wifiInfo = wifiManager.connectionInfo
                        if (wifiInfo != null && wifiInfo.ssid == "\"$ssid\"") {
                            resolved = true
                            try { reactApplicationContext.unregisterReceiver(this) } catch (_: Exception) {}
                            Log.d("WifiScanModule", "Legacy connect: physically connected to $ssid")

                            val map = Arguments.createMap()
                            map.putBoolean("success", true)
                            map.putString("message", "Connected to $ssid")
                            promise.resolve(map)

                            val statusMap = Arguments.createMap()
                            statusMap.putString("ssid", ssid)
                            statusMap.putBoolean("connected", true)
                            sendEvent("onConnectionStatusChanged", statusMap)
                        }
                    }
                }
            }
            reactApplicationContext.registerReceiver(connectReceiver, connectFilter)

            // Initiate connection: disconnect current, then enable target with delay
            wifiManager.disconnect()
            Handler(Looper.getMainLooper()).postDelayed({
                val enabled = wifiManager.enableNetwork(netId, true)
                Log.d("WifiScanModule", "Legacy enableNetwork($netId, true) = $enabled")
                if (!enabled && !resolved) {
                    resolved = true
                    try { reactApplicationContext.unregisterReceiver(connectReceiver) } catch (_: Exception) {}
                    promise.reject("LEGACY_ENABLE_FAILED", "enableNetwork returned false for $ssid")
                }
            }, 600)

            // 15-second timeout
            Handler(Looper.getMainLooper()).postDelayed({
                if (!resolved) {
                    resolved = true
                    try { reactApplicationContext.unregisterReceiver(connectReceiver) } catch (_: Exception) {}
                    promise.reject("CONNECT_TIMEOUT", "Connection to $ssid timed out")
                }
            }, 15000)
        } catch (e: Exception) {
            if (!resolved) {
                resolved = true
                promise.reject("LEGACY_CONNECT_FAILED", "${e.message}")
            }
        }
    }

    @ReactMethod
    fun setLastNetwork(ssid: String, password: String) {
        reactApplicationContext
            .getSharedPreferences("wifi_scanner", Context.MODE_PRIVATE)
            .edit()
            .putString("last_ssid", ssid)
            .putString("last_password", password)
            .apply()
        Log.d("WifiScanModule", "Saved last network: $ssid")
    }

    @ReactMethod
    fun getLastNetwork(promise: Promise) {
        val prefs = reactApplicationContext
            .getSharedPreferences("wifi_scanner", Context.MODE_PRIVATE)
        val ssid = prefs.getString("last_ssid", null)
        if (ssid != null) {
            val password = prefs.getString("last_password", "") ?: ""
            val map = Arguments.createMap()
            map.putString("ssid", ssid)
            map.putString("password", password)
            promise.resolve(map)
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun clearLastNetwork() {
        reactApplicationContext
            .getSharedPreferences("wifi_scanner", Context.MODE_PRIVATE)
            .edit()
            .remove("last_ssid")
            .remove("last_password")
            .apply()
        Log.d("WifiScanModule", "Cleared saved network")
    }

    @ReactMethod
    fun disconnect() {
        wifiManager.disconnect()
        activeNetworkCallback?.let { callback ->
            try { connectivityManager.unregisterNetworkCallback(callback) } catch (_: Exception) {}
        }
        activeNetworkCallback = null
    }

    private fun addLog(message: String) {
        android.util.Log.d("WifiScanModule", message)
    }

    private fun sendScanResults() {
        if (!hasPermissions()) return

        val results: List<ScanResult> = wifiManager.scanResults
        val networkList: WritableArray = Arguments.createArray()

        for (result in results) {
            if (result.level < rssiThreshold) continue

            val map = Arguments.createMap()
            map.putString("ssid", result.SSID)
            map.putString("bssid", result.BSSID)
            map.putInt("rssi", result.level)
            map.putInt("frequency", result.frequency)
            map.putInt("channel", getChannelFromFrequency(result.frequency))
            map.putString("security", getSecurityType(result.capabilities))
            networkList.pushMap(map)
        }

        sendEvent("onWifiListUpdated", networkList)
    }

    private fun sendEvent(eventName: String, params: Any?) {
        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun hasPermissions(): Boolean {
        return ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun getChannelFromFrequency(freq: Int): Int {
        return when {
            freq in 2412..2484 -> (freq - 2407) / 5
            freq in 5170..5825 -> (freq - 5000) / 5
            else -> 0
        }
    }

    private fun getSecurityType(capabilities: String): String {
        return when {
            capabilities.contains("WPA3") -> "WPA3-PSK"
            capabilities.contains("WPA2") -> "WPA2-PSK"
            capabilities.contains("WEP") -> "WEP"
            else -> "OPEN"
        }
    }
}
