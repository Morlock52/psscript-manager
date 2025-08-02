import { cacheMiddleware } from '../middleware/cache';

/**
 * Real-time notification service using Redis Pub/Sub
 */
export class RealtimeService {
  private static subscriptions = new Map<string, () => void>();

  /**
   * Notify all connected clients about a script update
   */
  static async notifyScriptUpdate(scriptId: string, action: 'created' | 'updated' | 'deleted', userId: string) {
    await cacheMiddleware.publish('script-updates', {
      scriptId,
      action,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify about user activity
   */
  static async notifyUserActivity(userId: string, activity: string) {
    await cacheMiddleware.publish('user-activity', {
      userId,
      activity,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify about system events
   */
  static async notifySystemEvent(event: string, data: any) {
    await cacheMiddleware.publish('system-events', {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Subscribe to script updates
   */
  static subscribeToScriptUpdates(handler: (data: any) => void): () => void {
    const unsubscribe = cacheMiddleware.subscribe('script-updates', handler);
    const id = `script-updates-${Date.now()}`;
    this.subscriptions.set(id, unsubscribe);
    
    return () => {
      unsubscribe();
      this.subscriptions.delete(id);
    };
  }

  /**
   * Subscribe to user activity
   */
  static subscribeToUserActivity(handler: (data: any) => void): () => void {
    const unsubscribe = cacheMiddleware.subscribe('user-activity', handler);
    const id = `user-activity-${Date.now()}`;
    this.subscriptions.set(id, unsubscribe);
    
    return () => {
      unsubscribe();
      this.subscriptions.delete(id);
    };
  }

  /**
   * Subscribe to system events
   */
  static subscribeToSystemEvents(handler: (data: any) => void): () => void {
    const unsubscribe = cacheMiddleware.subscribe('system-events', handler);
    const id = `system-events-${Date.now()}`;
    this.subscriptions.set(id, unsubscribe);
    
    return () => {
      unsubscribe();
      this.subscriptions.delete(id);
    };
  }

  /**
   * Cleanup all subscriptions
   */
  static cleanup() {
    for (const [id, unsubscribe] of this.subscriptions) {
      unsubscribe();
    }
    this.subscriptions.clear();
  }
}

export default RealtimeService;