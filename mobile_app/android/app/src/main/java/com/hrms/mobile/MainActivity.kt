package com.hrms.mobile

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.hrms.mobile.ui.screens.*
import com.hrms.mobile.ui.theme.HRMSTheme
import com.hrms.mobile.viewmodels.*
import com.hrms.mobile.services.*
import com.hrms.mobile.utils.*

class MainActivity : ComponentActivity() {
    
    private lateinit var biometricAuth: BiometricAuth
    private lateinit var locationManager: LocationManager
    private lateinit var notificationManager: NotificationManager
    private lateinit var offlineSyncManager: OfflineSyncManager
    private lateinit var networkManager: NetworkManager
    
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        handlePermissionResults(permissions)
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        initializeServices()
        requestPermissions()
        
        setContent {
            HRMSTheme {
                Surface(
                    modifier = Modifier.fillMaxSize,
                    color = MaterialTheme.colorScheme.background
                ) {
                    HRMSApp()
                }
            }
        }
    }
    
    private fun initializeServices() {
        biometricAuth = BiometricAuth(this)
        locationManager = LocationManager(this)
        notificationManager = NotificationManager(this)
        offlineSyncManager = OfflineSyncManager(this)
        networkManager = NetworkManager(this)
        
        // Initialize services
        biometricAuth.initialize()
        locationManager.initialize()
        notificationManager.initialize()
        offlineSyncManager.initialize()
        networkManager.initialize()
    }
    
    private fun requestPermissions() {
        val permissions = arrayOf(
            Manifest.permission.INTERNET,
            Manifest.permission.ACCESS_NETWORK_STATE,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.CAMERA,
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.VIBRATE,
            Manifest.permission.WAKE_LOCK,
            Manifest.permission.FOREGROUND_SERVICE,
            Manifest.permission.POST_NOTIFICATIONS
        )
        
        permissionLauncher.launch(permissions)
    }
    
    private fun handlePermissionResults(permissions: Map<String, Boolean>) {
        permissions.forEach { (permission, granted) ->
            when (permission) {
                Manifest.permission.ACCESS_FINE_LOCATION -> {
                    if (granted) {
                        locationManager.startLocationUpdates()
                    }
                }
                Manifest.permission.CAMERA -> {
                    if (granted) {
                        // Camera permission granted
                    }
                }
                Manifest.permission.POST_NOTIFICATIONS -> {
                    if (granted) {
                        notificationManager.requestNotificationPermission()
                    }
                }
            }
        }
    }
    
    override fun onResume() {
        super.onResume()
        offlineSyncManager.startSync()
    }
    
    override fun onPause() {
        super.onPause()
        offlineSyncManager.pauseSync()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        offlineSyncManager.cleanup()
        locationManager.cleanup()
    }
}

@Composable
fun HRMSApp() {
    val navController = rememberNavController()
    
    // ViewModels
    val authViewModel: AuthViewModel = viewModel()
    val dashboardViewModel: DashboardViewModel = viewModel()
    val attendanceViewModel: AttendanceViewModel = viewModel()
    val leaveViewModel: LeaveViewModel = viewModel()
    val payrollViewModel: PayrollViewModel = viewModel()
    val profileViewModel: ProfileViewModel = viewModel()
    val settingsViewModel: SettingsViewModel = viewModel()
    
    // Check authentication state
    val isAuthenticated by authViewModel.isAuthenticated.collectAsState()
    
    LaunchedEffect(isAuthenticated) {
        if (isAuthenticated) {
            navController.navigate("dashboard") {
                popUpTo("login") { inclusive = true }
            }
        } else {
            navController.navigate("login") {
                popUpTo("dashboard") { inclusive = true }
            }
        }
    }
    
    NavHost(
        navController = navController,
        startDestination = if (isAuthenticated) "dashboard" else "login"
    ) {
        composable("login") {
            LoginScreen(
                viewModel = authViewModel,
                onLoginSuccess = {
                    navController.navigate("dashboard") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }
        
        composable("dashboard") {
            DashboardScreen(
                viewModel = dashboardViewModel,
                onNavigateToAttendance = {
                    navController.navigate("attendance")
                },
                onNavigateToLeave = {
                    navController.navigate("leave")
                },
                onNavigateToPayroll = {
                    navController.navigate("payroll")
                },
                onNavigateToProfile = {
                    navController.navigate("profile")
                }
            )
        }
        
        composable("attendance") {
            AttendanceScreen(
                viewModel = attendanceViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        composable("leave") {
            LeaveScreen(
                viewModel = leaveViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        composable("payroll") {
            PayrollScreen(
                viewModel = payrollViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        composable("profile") {
            ProfileScreen(
                viewModel = profileViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToSettings = {
                    navController.navigate("settings")
                }
            )
        }
        
        composable("settings") {
            SettingsScreen(
                viewModel = settingsViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onLogout = {
                    authViewModel.logout()
                    navController.navigate("login") {
                        popUpTo("dashboard") { inclusive = true }
                    }
                }
            )
        }
    }
}
