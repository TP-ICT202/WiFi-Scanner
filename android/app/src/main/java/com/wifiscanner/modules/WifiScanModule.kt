package com.wifiscanner.modules

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.os.Handler
import android.os.Looper
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
    fun connectToNetwork(ssid: String, password: String, promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
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

            connectivityManager.requestNetwork(request, object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
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
                    promise.reject("CONNECTION_FAILED", "Failed to connect to $ssid")
                }

                override fun onLost(network: Network) {
                    val statusMap = Arguments.createMap()
                    statusMap.putString("ssid", ssid)
                    statusMap.putBoolean("connected", false)
                    sendEvent("onConnectionStatusChanged", statusMap)
                }
            })
        } else {
            val wifiConfig = android.net.wifi.WifiConfiguration().apply {
                SSID = "\"$ssid\""
                if (password.isNotEmpty()) {
                    preSharedKey = "\"$password\""
                } else {
                    allowedKeyManagement.set(android.net.wifi.WifiConfiguration.AuthAlgorithm.OPEN)
                }
            }
            val netId = wifiManager.addNetwork(wifiConfig)
            wifiManager.disconnect()
            wifiManager.enableNetwork(netId, true)
            val success = wifiManager.reconnect()
            if (success) {
                val map = Arguments.createMap()
                map.putBoolean("success", true)
                map.putString("message", "Connected to $ssid")
                promise.resolve(map)
            } else {
                promise.reject("LEGACY_CONNECT_FAILED", "Could not connect to $ssid")
            }
        }
    }

    @ReactMethod
    fun disconnect() {
        wifiManager.disconnect()
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
