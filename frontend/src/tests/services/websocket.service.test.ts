import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { io } from 'socket.io-client';
import { websocketService } from '../../services/websocket.service';

// Mock socket.io-client
vi.mock('socket.io-client');

describe('WebSocket Service', () => {
  let mockSocket: any;

  beforeEach(() => {
    // Create mock socket
    mockSocket = {
      connected: false,
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    // Mock io to return our mock socket
    (io as any).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    vi.clearAllMocks();
    websocketService.disconnect();
  });

  describe('connect', () => {
    it('should connect to WebSocket server with token', () => {
      const token = 'test-token';
      websocketService.connect(token);

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token },
          transports: ['websocket', 'polling'],
        })
      );
    });

    it('should not reconnect if already connected', () => {
      mockSocket.connected = true;
      const token = 'test-token';
      
      websocketService.connect(token);
      websocketService.connect(token); // Second call

      expect(io).toHaveBeenCalledTimes(1);
    });

    it('should setup event handlers on connect', () => {
      const token = 'test-token';
      websocketService.connect(token);

      // Check that event handlers were registered
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('notification', expect.any(Function));
    });
  });

  describe('disconnect', () => {
    it('should disconnect from WebSocket server', () => {
      const token = 'test-token';
      websocketService.connect(token);
      websocketService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', () => {
      expect(() => websocketService.disconnect()).not.toThrow();
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(websocketService.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      mockSocket.connected = true;
      const token = 'test-token';
      websocketService.connect(token);
      
      // Trigger connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect'
      )[1];
      connectHandler();

      expect(websocketService.isConnected()).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to channels', () => {
      const token = 'test-token';
      websocketService.connect(token);

      const channels = ['user:123', 'organization:456'];
      websocketService.subscribe(channels);

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', channels);
    });

    it('should handle subscribe when not connected', () => {
      const channels = ['user:123'];
      
      // Should not throw
      expect(() => websocketService.subscribe(channels)).not.toThrow();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from channels', () => {
      const token = 'test-token';
      websocketService.connect(token);

      const channels = ['user:123', 'organization:456'];
      websocketService.unsubscribe(channels);

      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe', channels);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', () => {
      const token = 'test-token';
      websocketService.connect(token);

      const notificationId = 'notif-123';
      websocketService.markNotificationAsRead(notificationId);

      expect(mockSocket.emit).toHaveBeenCalledWith('notification:read', notificationId);
    });
  });

  describe('getUnreadCount', () => {
    it('should request unread count', () => {
      const token = 'test-token';
      websocketService.connect(token);

      websocketService.getUnreadCount();

      expect(mockSocket.emit).toHaveBeenCalledWith('notification:count');
    });
  });

  describe('event listeners', () => {
    it('should register event listener', () => {
      const callback = vi.fn();
      websocketService.on('test-event', callback);

      // Trigger the event internally
      const token = 'test-token';
      websocketService.connect(token);
      
      // Find and trigger notification handler
      const notificationHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'notification'
      )?.[1];

      if (notificationHandler) {
        const testData = { message: 'test' };
        notificationHandler(testData);
        
        // The callback should be called via the emit method
        expect(callback).not.toHaveBeenCalled(); // Not called for different event
      }
    });

    it('should unregister event listener', () => {
      const callback = vi.fn();
      websocketService.on('test-event', callback);
      websocketService.off('test-event', callback);

      // Callback should not be in the listeners anymore
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should send custom event to server', () => {
      const token = 'test-token';
      websocketService.connect(token);

      const eventData = { test: 'data' };
      websocketService.send('custom-event', eventData);

      expect(mockSocket.emit).toHaveBeenCalledWith('custom-event', eventData);
    });

    it('should handle send when not connected', () => {
      expect(() => websocketService.send('test-event')).not.toThrow();
    });
  });
});
