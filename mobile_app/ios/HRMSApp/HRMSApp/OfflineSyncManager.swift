import Foundation
import CoreData
import Network

class OfflineSyncManager: ObservableObject {
    static let shared = OfflineSyncManager()
    
    @Published var isOnline: Bool = true
    @Published var syncStatus: SyncStatus = .idle
    @Published var pendingChanges: Int = 0
    
    private let networkMonitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")
    private let syncQueue = DispatchQueue(label: "SyncQueue", qos: .background)
    
    private var syncTimer: Timer?
    private var retryCount = 0
    private let maxRetries = 3
    
    enum SyncStatus {
        case idle
        case syncing
        case success
        case failed
        case retrying
    }
    
    private init() {
        setupNetworkMonitoring()
        setupAutoSync()
    }
    
    // MARK: - Network Monitoring
    private func setupNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isOnline = path.status == .satisfied
                if path.status == .satisfied {
                    self?.triggerSync()
                }
            }
        }
        networkMonitor.start(queue: queue)
    }
    
    // MARK: - Auto Sync Setup
    private func setupAutoSync() {
        // Sync every 5 minutes when online
        syncTimer = Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { [weak self] _ in
            if self?.isOnline == true {
                self?.triggerSync()
            }
        }
    }
    
    // MARK: - Sync Triggers
    func triggerSync() {
        guard isOnline else { return }
        
        syncQueue.async { [weak self] in
            self?.performSync()
        }
    }
    
    func forceSync() {
        syncQueue.async { [weak self] in
            self?.performSync(force: true)
        }
    }
    
    // MARK: - Sync Implementation
    private func performSync(force: Bool = false) {
        DispatchQueue.main.async {
            self.syncStatus = .syncing
        }
        
        let context = CoreDataManager.shared.persistentContainer.viewContext
        
        // Get pending changes
        let pendingChanges = getPendingChanges(context: context)
        
        guard !pendingChanges.isEmpty || force else {
            DispatchQueue.main.async {
                self.syncStatus = .idle
            }
            return
        }
        
        // Sync each type of data
        syncEmployees(context: context)
        syncAttendance(context: context)
        syncLeaveApplications(context: context)
        syncPayrollData(context: context)
        syncPerformanceData(context: context)
        
        DispatchQueue.main.async {
            self.syncStatus = .success
            self.pendingChanges = 0
            self.retryCount = 0
        }
    }
    
    // MARK: - Data Sync Methods
    private func syncEmployees(context: NSManagedObjectContext) {
        let request: NSFetchRequest<EmployeeEntity> = EmployeeEntity.fetchRequest()
        request.predicate = NSPredicate(format: "needsSync == YES")
        
        do {
            let employees = try context.fetch(request)
            for employee in employees {
                syncEmployee(employee)
            }
        } catch {
            print("Error fetching employees for sync: \(error)")
        }
    }
    
    private func syncAttendance(context: NSManagedObjectContext) {
        let request: NSFetchRequest<AttendanceEntity> = AttendanceEntity.fetchRequest()
        request.predicate = NSPredicate(format: "needsSync == YES")
        
        do {
            let attendanceRecords = try context.fetch(request)
            for record in attendanceRecords {
                syncAttendanceRecord(record)
            }
        } catch {
            print("Error fetching attendance for sync: \(error)")
        }
    }
    
    private func syncLeaveApplications(context: NSManagedObjectContext) {
        let request: NSFetchRequest<LeaveApplicationEntity> = LeaveApplicationEntity.fetchRequest()
        request.predicate = NSPredicate(format: "needsSync == YES")
        
        do {
            let leaveApplications = try context.fetch(request)
            for application in leaveApplications {
                syncLeaveApplication(application)
            }
        } catch {
            print("Error fetching leave applications for sync: \(error)")
        }
    }
    
    private func syncPayrollData(context: NSManagedObjectContext) {
        let request: NSFetchRequest<PayrollEntity> = PayrollEntity.fetchRequest()
        request.predicate = NSPredicate(format: "needsSync == YES")
        
        do {
            let payrollRecords = try context.fetch(request)
            for record in payrollRecords {
                syncPayrollRecord(record)
            }
        } catch {
            print("Error fetching payroll for sync: \(error)")
        }
    }
    
    private func syncPerformanceData(context: NSManagedObjectContext) {
        let request: NSFetchRequest<PerformanceEntity> = PerformanceEntity.fetchRequest()
        request.predicate = NSPredicate(format: "needsSync == YES")
        
        do {
            let performanceRecords = try context.fetch(request)
            for record in performanceRecords {
                syncPerformanceRecord(record)
            }
        } catch {
            print("Error fetching performance for sync: \(error)")
        }
    }
    
    // MARK: - Individual Sync Methods
    private func syncEmployee(_ employee: EmployeeEntity) {
        let employeeData = EmployeeData(
            id: employee.id,
            firstName: employee.firstName ?? "",
            lastName: employee.lastName ?? "",
            email: employee.email ?? "",
            phone: employee.phone ?? "",
            department: employee.department ?? "",
            position: employee.position ?? "",
            hireDate: employee.hireDate,
            salary: employee.salary,
            isActive: employee.isActive
        )
        
        APIService.shared.updateEmployee(employeeData) { [weak self] result in
            switch result {
            case .success:
                employee.needsSync = false
                CoreDataManager.shared.saveContext()
            case .failure(let error):
                print("Error syncing employee: \(error)")
                self?.handleSyncError()
            }
        }
    }
    
    private func syncAttendanceRecord(_ record: AttendanceEntity) {
        let attendanceData = AttendanceData(
            id: record.id,
            employeeId: record.employeeId,
            checkInTime: record.checkInTime,
            checkOutTime: record.checkOutTime,
            location: record.location,
            notes: record.notes
        )
        
        APIService.shared.updateAttendance(attendanceData) { [weak self] result in
            switch result {
            case .success:
                record.needsSync = false
                CoreDataManager.shared.saveContext()
            case .failure(let error):
                print("Error syncing attendance: \(error)")
                self?.handleSyncError()
            }
        }
    }
    
    private func syncLeaveApplication(_ application: LeaveApplicationEntity) {
        let leaveData = LeaveApplicationData(
            id: application.id,
            employeeId: application.employeeId,
            leaveType: application.leaveType ?? "",
            startDate: application.startDate,
            endDate: application.endDate,
            reason: application.reason ?? "",
            status: application.status ?? ""
        )
        
        APIService.shared.updateLeaveApplication(leaveData) { [weak self] result in
            switch result {
            case .success:
                application.needsSync = false
                CoreDataManager.shared.saveContext()
            case .failure(let error):
                print("Error syncing leave application: \(error)")
                self?.handleSyncError()
            }
        }
    }
    
    private func syncPayrollRecord(_ record: PayrollEntity) {
        let payrollData = PayrollData(
            id: record.id,
            employeeId: record.employeeId,
            basicSalary: record.basicSalary,
            allowances: record.allowances,
            deductions: record.deductions,
            netSalary: record.netSalary,
            payPeriod: record.payPeriod ?? ""
        )
        
        APIService.shared.updatePayroll(payrollData) { [weak self] result in
            switch result {
            case .success:
                record.needsSync = false
                CoreDataManager.shared.saveContext()
            case .failure(let error):
                print("Error syncing payroll: \(error)")
                self?.handleSyncError()
            }
        }
    }
    
    private func syncPerformanceRecord(_ record: PerformanceEntity) {
        let performanceData = PerformanceData(
            id: record.id,
            employeeId: record.employeeId,
            goalId: record.goalId,
            rating: record.rating,
            comments: record.comments ?? "",
            reviewDate: record.reviewDate
        )
        
        APIService.shared.updatePerformance(performanceData) { [weak self] result in
            switch result {
            case .success:
                record.needsSync = false
                CoreDataManager.shared.saveContext()
            case .failure(let error):
                print("Error syncing performance: \(error)")
                self?.handleSyncError()
            }
        }
    }
    
    // MARK: - Error Handling
    private func handleSyncError() {
        retryCount += 1
        
        if retryCount < maxRetries {
            DispatchQueue.main.async {
                self.syncStatus = .retrying
            }
            
            // Retry after exponential backoff
            let delay = pow(2.0, Double(retryCount))
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                self.triggerSync()
            }
        } else {
            DispatchQueue.main.async {
                self.syncStatus = .failed
            }
        }
    }
    
    // MARK: - Pending Changes Count
    private func getPendingChanges(context: NSManagedObjectContext) -> [NSManagedObject] {
        var pendingChanges: [NSManagedObject] = []
        
        // Check employees
        let employeeRequest: NSFetchRequest<EmployeeEntity> = EmployeeEntity.fetchRequest()
        employeeRequest.predicate = NSPredicate(format: "needsSync == YES")
        if let employees = try? context.fetch(employeeRequest) {
            pendingChanges.append(contentsOf: employees)
        }
        
        // Check attendance
        let attendanceRequest: NSFetchRequest<AttendanceEntity> = AttendanceEntity.fetchRequest()
        attendanceRequest.predicate = NSPredicate(format: "needsSync == YES")
        if let attendance = try? context.fetch(attendanceRequest) {
            pendingChanges.append(contentsOf: attendance)
        }
        
        // Check leave applications
        let leaveRequest: NSFetchRequest<LeaveApplicationEntity> = LeaveApplicationEntity.fetchRequest()
        leaveRequest.predicate = NSPredicate(format: "needsSync == YES")
        if let leaveApplications = try? context.fetch(leaveRequest) {
            pendingChanges.append(contentsOf: leaveApplications)
        }
        
        // Check payroll
        let payrollRequest: NSFetchRequest<PayrollEntity> = PayrollEntity.fetchRequest()
        payrollRequest.predicate = NSPredicate(format: "needsSync == YES")
        if let payroll = try? context.fetch(payrollRequest) {
            pendingChanges.append(contentsOf: payroll)
        }
        
        // Check performance
        let performanceRequest: NSFetchRequest<PerformanceEntity> = PerformanceEntity.fetchRequest()
        performanceRequest.predicate = NSPredicate(format: "needsSync == YES")
        if let performance = try? context.fetch(performanceRequest) {
            pendingChanges.append(contentsOf: performance)
        }
        
        return pendingChanges
    }
    
    // MARK: - Background Sync
    func performBackgroundSync(completion: @escaping (UIBackgroundFetchResult) -> Void) {
        guard isOnline else {
            completion(.noData)
            return
        }
        
        syncQueue.async {
            let context = CoreDataManager.shared.persistentContainer.viewContext
            let pendingChanges = self.getPendingChanges(context: context)
            
            if pendingChanges.isEmpty {
                completion(.noData)
                return
            }
            
            self.performSync()
            completion(.newData)
        }
    }
    
    // MARK: - Cleanup
    deinit {
        syncTimer?.invalidate()
        networkMonitor.cancel()
    }
}
