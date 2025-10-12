/**
 * Real-time Integration Service
 * Comprehensive real-time updates for all HRMS modules
 */

import { WebSocketService } from './websocket.service';
import { useGlobalStore } from '../store/globalStore';
import { API_CONFIG } from '../constants';

class RealtimeIntegrationService {
  private wsService: WebSocketService;
  private isConnected = false;

  constructor() {
    this.wsService = new WebSocketService();
  }

  /**
   * Initialize real-time connections for all modules
   */
  async initialize(token: string) {
    try {
      // Connect to WebSocket
      this.wsService.connect(token);
      
      // Subscribe to all relevant channels
      await this.subscribeToAllChannels();
      
      this.isConnected = true;
      console.log('Real-time integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize real-time integration:', error);
    }
  }

  /**
   * Subscribe to all relevant channels based on user role and permissions
   */
  private async subscribeToAllChannels() {
    const store = useGlobalStore.getState();
    const user = store.user;
    
    if (!user) return;

    const channels = [
      `user:${user.user_id}`,
      `organization:${user.organization_id}`,
    ];

    // Add employee-specific channel if user is employee
    if (user.employee_id) {
      channels.push(`employee:${user.employee_id}`);
    }

    // Add role-specific channels
    if (user.role === 'admin' || user.role === 'hr_manager') {
      channels.push('admin:notifications');
      channels.push('hr:updates');
    }

    if (user.role === 'manager') {
      channels.push('manager:team');
    }

    this.wsService.subscribe(channels);
  }

  /**
   * Handle real-time updates for all modules
   */
  handleModuleUpdates() {
    const store = useGlobalStore.getState();

    // Employee Management Updates
    this.wsService.on('employee.created', (data) => {
      store.addNotification({
        id: `emp-created-${Date.now()}`,
        type: 'success',
        title: 'New Employee Added',
        message: `${data.first_name} ${data.last_name} has been added to the system`,
        timestamp: new Date(),
        read: false,
      });
    });

    this.wsService.on('employee.updated', (data) => {
      store.addNotification({
        id: `emp-updated-${Date.now()}`,
        type: 'info',
        title: 'Employee Updated',
        message: `${data.first_name} ${data.last_name}'s information has been updated`,
        timestamp: new Date(),
        read: false,
      });
    });

    // Attendance Updates
    this.wsService.on('attendance.checkin', (data) => {
      store.addNotification({
        id: `att-checkin-${Date.now()}`,
        type: 'info',
        title: 'Check-in Notification',
        message: `${data.employee_name} checked in at ${data.checkin_time}`,
        timestamp: new Date(),
        read: false,
      });
    });

    this.wsService.on('attendance.checkout', (data) => {
      store.addNotification({
        id: `att-checkout-${Date.now()}`,
        type: 'info',
        title: 'Check-out Notification',
        message: `${data.employee_name} checked out at ${data.checkout_time}`,
        timestamp: new Date(),
        read: false,
      });
    });

    // Leave Management Updates
    this.wsService.on('leave.applied', (data) => {
      store.addNotification({
        id: `leave-applied-${Date.now()}`,
        type: 'info',
        title: 'Leave Request',
        message: `${data.employee_name} has applied for ${data.leave_type} leave`,
        timestamp: new Date(),
        read: false,
      });
    });

    this.wsService.on('leave.approved', (data) => {
      store.addNotification({
        id: `leave-approved-${Date.now()}`,
        type: 'success',
        title: 'Leave Approved',
        message: `Your ${data.leave_type} leave request has been approved`,
        timestamp: new Date(),
        read: false,
      });
    });

    this.wsService.on('leave.rejected', (data) => {
      store.addNotification({
        id: `leave-rejected-${Date.now()}`,
        type: 'error',
        title: 'Leave Rejected',
        message: `Your ${data.leave_type} leave request has been rejected`,
        timestamp: new Date(),
        read: false,
      });
    });

    // Payroll Updates
    this.wsService.on('payroll.processed', (data) => {
      store.addNotification({
        id: `payroll-processed-${Date.now()}`,
        type: 'success',
        title: 'Payroll Processed',
        message: `Payroll for ${data.period} has been processed successfully`,
        timestamp: new Date(),
        read: false,
      });
    });

    this.wsService.on('payslip.generated', (data) => {
      store.addNotification({
        id: `payslip-generated-${Date.now()}`,
        type: 'info',
        title: 'Payslip Generated',
        message: `Your payslip for ${data.period} is now available`,
        timestamp: new Date(),
        read: false,
      });
    });

    // Performance Updates
    this.wsService.on('performance.goal_created', (data) => {
      store.addNotification({
        id: `goal-created-${Date.now()}`,
        type: 'info',
        title: 'New Goal Assigned',
        message: `A new goal "${data.goal_title}" has been assigned to you`,
        timestamp: new Date(),
        read: false,
      });
    });

    this.wsService.on('performance.review_submitted', (data) => {
      store.addNotification({
        id: `review-submitted-${Date.now()}`,
        type: 'info',
        title: 'Performance Review',
        message: `Performance review for ${data.employee_name} has been submitted`,
        timestamp: new Date(),
        read: false,
      });
    });

    // Recruitment Updates
    this.wsService.on('recruitment.application_received', (data) => {
      store.addNotification({
        id: `app-received-${Date.now()}`,
        type: 'info',
        title: 'New Application',
        message: `New application received for ${data.job_title} position`,
        timestamp: new Date(),
        read: false,
      });
    });

    this.wsService.on('recruitment.interview_scheduled', (data) => {
      store.addNotification({
        id: `interview-scheduled-${Date.now()}`,
        type: 'info',
        title: 'Interview Scheduled',
        message: `Interview scheduled for ${data.candidate_name} on ${data.interview_date}`,
        timestamp: new Date(),
        read: false,
      });
    });

    this.wsService.on('recruitment.offer_made', (data) => {
      store.addNotification({
        id: `offer-made-${Date.now()}`,
        type: 'success',
        title: 'Offer Made',
        message: `Offer has been made to ${data.candidate_name} for ${data.job_title}`,
        timestamp: new Date(),
        read: false,
      });
    });

    // Workflow Updates
    this.wsService.on('workflow.started', (data) => {
      store.addNotification({
        id: `workflow-started-${Date.now()}`,
        type: 'info',
        title: 'Workflow Started',
        message: `Workflow "${data.workflow_name}" has been started`,
        timestamp: new Date(),
        read: false,
      });
    });

    this.wsService.on('workflow.completed', (data) => {
      store.addNotification({
        id: `workflow-completed-${Date.now()}`,
        type: 'success',
        title: 'Workflow Completed',
        message: `Workflow "${data.workflow_name}" has been completed`,
        timestamp: new Date(),
        read: false,
      });
    });

    this.wsService.on('workflow.requires_approval', (data) => {
      store.addNotification({
        id: `workflow-approval-${Date.now()}`,
        type: 'warning',
        title: 'Approval Required',
        message: `Workflow "${data.workflow_name}" requires your approval`,
        timestamp: new Date(),
        read: false,
      });
    });

    // System Updates
    this.wsService.on('system.maintenance', (data) => {
      store.addNotification({
        id: `maintenance-${Date.now()}`,
        type: 'warning',
        title: 'System Maintenance',
        message: data.message || 'System will be under maintenance',
        timestamp: new Date(),
        read: false,
      });
    });

    this.wsService.on('system.alert', (data) => {
      store.addNotification({
        id: `alert-${Date.now()}`,
        type: 'error',
        title: 'System Alert',
        message: data.message || 'System alert',
        timestamp: new Date(),
        read: false,
      });
    });
  }

  /**
   * Disconnect from real-time services
   */
  disconnect() {
    this.wsService.disconnect();
    this.isConnected = false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Export singleton instance
export const realtimeIntegrationService = new RealtimeIntegrationService();
export default realtimeIntegrationService;
