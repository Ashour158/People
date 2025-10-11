package com.hrms.mobile.services

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.work.*
import com.hrms.mobile.database.HRMSDatabase
import com.hrms.mobile.database.entities.*
import com.hrms.mobile.network.APIService
import com.hrms.mobile.utils.NetworkUtils
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

class OfflineSyncManager(private val context: Context) {
    
    private val database = HRMSDatabase.getDatabase(context)
    private val apiService = APIService.getInstance()
    private val workManager = WorkManager.getInstance(context)
    
    private var isOnline = false
    private var syncJob: Job? = null
    
    enum class SyncStatus {
        IDLE, SYNCING, SUCCESS, FAILED, RETRYING
    }
    
    var syncStatus: SyncStatus = SyncStatus.IDLE
        private set
    
    var pendingChangesCount: Int = 0
        private set
    
    fun initialize() {
        setupNetworkMonitoring()
        setupPeriodicSync()
        startSync()
    }
    
    private fun setupNetworkMonitoring() {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        
        connectivityManager.registerNetworkCallback(networkRequest, object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                isOnline = true
                startSync()
            }
            
            override fun onLost(network: Network) {
                isOnline = false
                stopSync()
            }
        })
    }
    
    private fun setupPeriodicSync() {
        val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            15, TimeUnit.MINUTES
        ).setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
        ).build()
        
        workManager.enqueueUniquePeriodicWork(
            "periodic_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
    }
    
    fun startSync() {
        if (!isOnline) return
        
        syncJob?.cancel()
        syncJob = CoroutineScope(Dispatchers.IO).launch {
            performSync()
        }
    }
    
    fun stopSync() {
        syncJob?.cancel()
        syncStatus = SyncStatus.IDLE
    }
    
    fun forceSync() {
        if (!isOnline) return
        
        syncJob?.cancel()
        syncJob = CoroutineScope(Dispatchers.IO).launch {
            performSync(force = true)
        }
    }
    
    private suspend fun performSync(force: Boolean = false) {
        syncStatus = SyncStatus.SYNCING
        
        try {
            // Get pending changes
            val pendingChanges = getPendingChanges()
            
            if (pendingChanges.isEmpty() && !force) {
                syncStatus = SyncStatus.IDLE
                return
            }
            
            // Sync each type of data
            syncEmployees()
            syncAttendance()
            syncLeaveApplications()
            syncPayrollData()
            syncPerformanceData()
            
            syncStatus = SyncStatus.SUCCESS
            pendingChangesCount = 0
            
        } catch (e: Exception) {
            syncStatus = SyncStatus.FAILED
            handleSyncError(e)
        }
    }
    
    private suspend fun syncEmployees() {
        val employees = database.employeeDao().getPendingSyncEmployees()
        
        for (employee in employees) {
            try {
                val result = apiService.updateEmployee(employee.toEmployeeData())
                if (result.isSuccessful) {
                    employee.needsSync = false
                    database.employeeDao().updateEmployee(employee)
                }
            } catch (e: Exception) {
                // Handle error, keep needsSync = true
            }
        }
    }
    
    private suspend fun syncAttendance() {
        val attendanceRecords = database.attendanceDao().getPendingSyncAttendance()
        
        for (record in attendanceRecords) {
            try {
                val result = apiService.updateAttendance(record.toAttendanceData())
                if (result.isSuccessful) {
                    record.needsSync = false
                    database.attendanceDao().updateAttendance(record)
                }
            } catch (e: Exception) {
                // Handle error, keep needsSync = true
            }
        }
    }
    
    private suspend fun syncLeaveApplications() {
        val leaveApplications = database.leaveApplicationDao().getPendingSyncLeaveApplications()
        
        for (application in leaveApplications) {
            try {
                val result = apiService.updateLeaveApplication(application.toLeaveApplicationData())
                if (result.isSuccessful) {
                    application.needsSync = false
                    database.leaveApplicationDao().updateLeaveApplication(application)
                }
            } catch (e: Exception) {
                // Handle error, keep needsSync = true
            }
        }
    }
    
    private suspend fun syncPayrollData() {
        val payrollRecords = database.payrollDao().getPendingSyncPayroll()
        
        for (record in payrollRecords) {
            try {
                val result = apiService.updatePayroll(record.toPayrollData())
                if (result.isSuccessful) {
                    record.needsSync = false
                    database.payrollDao().updatePayroll(record)
                }
            } catch (e: Exception) {
                // Handle error, keep needsSync = true
            }
        }
    }
    
    private suspend fun syncPerformanceData() {
        val performanceRecords = database.performanceDao().getPendingSyncPerformance()
        
        for (record in performanceRecords) {
            try {
                val result = apiService.updatePerformance(record.toPerformanceData())
                if (result.isSuccessful) {
                    record.needsSync = false
                    database.performanceDao().updatePerformance(record)
                }
            } catch (e: Exception) {
                // Handle error, keep needsSync = true
            }
        }
    }
    
    private suspend fun getPendingChanges(): List<Any> {
        val pendingChanges = mutableListOf<Any>()
        
        pendingChanges.addAll(database.employeeDao().getPendingSyncEmployees())
        pendingChanges.addAll(database.attendanceDao().getPendingSyncAttendance())
        pendingChanges.addAll(database.leaveApplicationDao().getPendingSyncLeaveApplications())
        pendingChanges.addAll(database.payrollDao().getPendingSyncPayroll())
        pendingChanges.addAll(database.performanceDao().getPendingSyncPerformance())
        
        pendingChangesCount = pendingChanges.size
        return pendingChanges
    }
    
    private fun handleSyncError(error: Exception) {
        // Implement retry logic with exponential backoff
        CoroutineScope(Dispatchers.IO).launch {
            delay(5000) // Wait 5 seconds before retry
            if (isOnline) {
                syncStatus = SyncStatus.RETRYING
                performSync()
            }
        }
    }
    
    fun cleanup() {
        syncJob?.cancel()
        workManager.cancelAllWork()
    }
    
    // Background sync for WorkManager
    class SyncWorker(context: Context, workerParams: WorkerParameters) : Worker(context, workerParams) {
        override fun doWork(): Result {
            val syncManager = OfflineSyncManager(applicationContext)
            return try {
                runBlocking {
                    syncManager.performSync()
                }
                Result.success()
            } catch (e: Exception) {
                Result.retry()
            }
        }
    }
}

// Extension functions to convert entities to data classes
private fun EmployeeEntity.toEmployeeData(): EmployeeData {
    return EmployeeData(
        id = id,
        firstName = firstName,
        lastName = lastName,
        email = email,
        phone = phone,
        department = department,
        position = position,
        hireDate = hireDate,
        salary = salary,
        isActive = isActive
    )
}

private fun AttendanceEntity.toAttendanceData(): AttendanceData {
    return AttendanceData(
        id = id,
        employeeId = employeeId,
        checkInTime = checkInTime,
        checkOutTime = checkOutTime,
        location = location,
        notes = notes
    )
}

private fun LeaveApplicationEntity.toLeaveApplicationData(): LeaveApplicationData {
    return LeaveApplicationData(
        id = id,
        employeeId = employeeId,
        leaveType = leaveType,
        startDate = startDate,
        endDate = endDate,
        reason = reason,
        status = status
    )
}

private fun PayrollEntity.toPayrollData(): PayrollData {
    return PayrollData(
        id = id,
        employeeId = employeeId,
        basicSalary = basicSalary,
        allowances = allowances,
        deductions = deductions,
        netSalary = netSalary,
        payPeriod = payPeriod
    )
}

private fun PerformanceEntity.toPerformanceData(): PerformanceData {
    return PerformanceData(
        id = id,
        employeeId = employeeId,
        goalId = goalId,
        rating = rating,
        comments = comments,
        reviewDate = reviewDate
    )
}
