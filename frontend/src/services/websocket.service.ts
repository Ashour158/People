import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../constants';
import { useGlobalStore } from '../store/globalStore';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(API_CONFIG.WS_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(channels: string[]) {
    if (this.socket) {
      this.socket.emit('subscribe', channels);
    }
  }

  unsubscribe(channels: string[]) {
    if (this.socket) {
      this.socket.emit('unsubscribe', channels);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    // Real-time notifications
    this.socket.on('notification', (data) => {
      const store = useGlobalStore.getState();
      store.addNotification({
        id: Date.now().toString(),
        type: data.type || 'info',
        title: data.title || 'Notification',
        message: data.message || '',
        timestamp: new Date(),
        read: false,
      });
    });

    // Employee updates
    this.socket.on('employee.updated', (data) => {
      const store = useGlobalStore.getState();
      const employees = store.employees.map(emp => 
        emp.employee_id === data.employee_id ? { ...emp, ...data } : emp
      );
      store.setEmployees(employees);
    });

    // Attendance updates
    this.socket.on('attendance.updated', (data) => {
      const store = useGlobalStore.getState();
      const attendance = store.attendance.map(att => 
        att.attendance_id === data.attendance_id ? { ...att, ...data } : att
      );
      store.setAttendance(attendance);
    });

    // Leave updates
    this.socket.on('leave.updated', (data) => {
      const store = useGlobalStore.getState();
      const requests = store.leaveRequests.map(req => 
        req.leave_id === data.leave_id ? { ...req, ...data } : req
      );
      store.setLeaveRequests(requests);
    });

    // System events
    this.socket.on('system.maintenance', (data) => {
      const store = useGlobalStore.getState();
      store.addNotification({
        id: 'maintenance-' + Date.now(),
        type: 'warning',
        title: 'System Maintenance',
        message: data.message || 'System will be under maintenance',
        timestamp: new Date(),
        read: false,
      });
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.socket?.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      const store = useGlobalStore.getState();
      store.addNotification({
        id: 'connection-lost',
        type: 'error',
        title: 'Connection Lost',
        message: 'Unable to connect to server. Please refresh the page.',
        timestamp: new Date(),
        read: false,
      });
    }
  }

  // Send events to server
  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocketService = new WebSocketService();