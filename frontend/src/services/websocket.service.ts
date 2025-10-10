import { io, Socket } from 'socket.io-client';

interface NotificationData {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  is_read: boolean;
}

type EventCallback = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();
  private connected: boolean = false;

  /**
   * Connect to WebSocket server
   * @param token - JWT authentication token
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    this.socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup default WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.emit('connected', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.connected = false;
      this.emit('disconnected', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('error', { error: error.message });
    });

    // Notification events
    this.socket.on('notification', (data: NotificationData) => {
      console.log('Received notification:', data);
      this.emit('notification', data);
    });

    // Real-time attendance updates
    this.socket.on('attendance:update', (data) => {
      console.log('Attendance update:', data);
      this.emit('attendance:update', data);
    });

    // Real-time leave updates
    this.socket.on('leave:update', (data) => {
      console.log('Leave update:', data);
      this.emit('leave:update', data);
    });

    // Real-time leave approval
    this.socket.on('leave:approved', (data) => {
      console.log('Leave approved:', data);
      this.emit('leave:approved', data);
    });

    this.socket.on('leave:rejected', (data) => {
      console.log('Leave rejected:', data);
      this.emit('leave:rejected', data);
    });

    // Real-time expense updates
    this.socket.on('expense:update', (data) => {
      console.log('Expense update:', data);
      this.emit('expense:update', data);
    });

    // Real-time payroll updates
    this.socket.on('payroll:update', (data) => {
      console.log('Payroll update:', data);
      this.emit('payroll:update', data);
    });

    // Server messages
    this.socket.on('message', (data) => {
      console.log('WebSocket server message:', data);
      this.emit('message', data);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
      console.log('WebSocket disconnected');
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  /**
   * Subscribe to specific channels
   * @param channels - Array of channel names to subscribe to
   */
  subscribe(channels: string[]): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.emit('subscribe', channels);
    console.log('Subscribed to channels:', channels);
  }

  /**
   * Unsubscribe from specific channels
   * @param channels - Array of channel names to unsubscribe from
   */
  unsubscribe(channels: string[]): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.emit('unsubscribe', channels);
    console.log('Unsubscribed from channels:', channels);
  }

  /**
   * Mark notification as read
   * @param notificationId - ID of the notification to mark as read
   */
  markNotificationAsRead(notificationId: string): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.emit('notification:read', notificationId);
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.emit('notification:count');
  }

  /**
   * Register event listener
   * @param event - Event name to listen to
   * @param callback - Callback function to execute when event is received
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Unregister event listener
   * @param event - Event name
   * @param callback - Callback function to remove
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all registered listeners
   * @param event - Event name
   * @param data - Event data
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  /**
   * Send custom event to server
   * @param event - Event name
   * @param data - Event data
   */
  send(event: string, data?: any): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    this.socket.emit(event, data);
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
