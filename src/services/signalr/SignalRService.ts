import type { HubConnection } from '@microsoft/signalr';
import { API_CONFIG } from '../../constants/api';
import { getKeycloak } from '../../utils/keycloak';
import { getCookie } from '../../utils/cookie';
import { SIGNALR_CONSTANTS } from './signalr.constants';
import type { NotificationCallback } from './notification.types';
import type { INotification } from '../api/notificationAPI';

const getAccessToken = async (): Promise<string> => {
  const keycloak = getKeycloak();

  if (keycloak?.authenticated) {
    try {
      await keycloak.updateToken(30);
      if (keycloak.token) {
        return keycloak.token;
      }
    } catch (error) {
      console.error(error);
    }
  }

  return getCookie('token') || '';
};

// The SignalR client (~150KB) is only needed once authenticated, so keep it out of the initial bundle.
let signalRModule: Promise<typeof import('@microsoft/signalr')> | null = null;
const loadSignalR = () => (signalRModule ??= import('@microsoft/signalr'));

// Mirrors HubConnectionState values without importing the runtime enum.
const isActiveState = (state: string) => state === 'Connected' || state === 'Connecting' || state === 'Reconnecting';

const DUPLICATE_NOTIFICATION_WINDOW_MS = 5000;

const pick = (raw: Record<string, any>, ...keys: string[]) => {
  for (const key of keys) {
    if (raw[key] !== undefined) return raw[key];
  }
  return undefined;
};

const normalizeNotification = (raw: INotification | Record<string, any>): INotification => ({
  id: pick(raw, 'id', 'Id'),
  receiverId: pick(raw, 'receiverId', 'ReceiverId'),
  type: pick(raw, 'type', 'Type'),
  title: pick(raw, 'title', 'Title'),
  content: pick(raw, 'content', 'Content'),
  isRead: pick(raw, 'isRead', 'IsRead'),
  status: pick(raw, 'status', 'Status'),
  failureReason: pick(raw, 'failureReason', 'FailureReason'),
  retryCount: pick(raw, 'retryCount', 'RetryCount'),
  createdAt: pick(raw, 'createdAt', 'CreatedAt'),
  code: pick(raw, 'code', 'Code'),
});

export class SignalRService {
  private static instance: SignalRService | null = null;
  private connection: HubConnection | null = null;
  private subscribers = new Set<NotificationCallback>();
  private isManuallyStopped = false;
  private recentNotificationIds = new Map<string, number>();

  private constructor() {}

  public static getInstance(): SignalRService {
    if (!SignalRService.instance) {
      SignalRService.instance = new SignalRService();
    }
    return SignalRService.instance;
  }

  public isConnected(): boolean {
    return this.connection !== null && (this.connection.state as string) === 'Connected';
  }

  public getConnection(): HubConnection | null {
    return this.connection;
  }

  public start(): Promise<void> {
    this.isManuallyStopped = false;

    if (this.connection && isActiveState(this.connection.state)) {
      return Promise.resolve();
    }

    const baseApiUrl = API_CONFIG.BASE_URL || '';
    const baseServerUrl = baseApiUrl.replace(/\/api\/?$/, '');
    const hubPath = SIGNALR_CONSTANTS.NOTIFICATION_HUB_PATH;
    const hubUrl = import.meta.env.VITE_NOTIFICATION_HUB_URL || (baseServerUrl ? `${baseServerUrl}${hubPath}` : '');

    if (!hubUrl) {
      return Promise.reject(new Error('SignalR Hub URL is not configured.'));
    }

    const previous = this.connection;
    return loadSignalR().then(({ HubConnectionBuilder, LogLevel }) => {
      // stop() was called, or a concurrent start() already built a connection, while the module loaded.
      if (this.isManuallyStopped || this.connection !== previous) return;

      const connection = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: getAccessToken,
        })
        .configureLogging(LogLevel.Warning)
        .withAutomaticReconnect(SIGNALR_CONSTANTS.RECONNECT_DELAY_SERIES)
        .build();

      this.registerConnectionEvents(connection);
      this.registerHubEvents(connection);

      this.connection = connection;

      return connection.start().catch((error) => {
        if (!this.isManuallyStopped) {
          setTimeout(() => {
            if (!this.isManuallyStopped) {
              this.start().catch((err) => console.error(err));
            }
          }, SIGNALR_CONSTANTS.RECONNECT_FALLBACK_DELAY_MS);
        }
        throw error;
      });
    });
  }

  public async stop(): Promise<void> {
    this.isManuallyStopped = true;
    if (!this.connection) return;

    try {
      this.unregisterHubEvents(this.connection);
      await this.connection.stop();
    } catch (error) {
      console.error(error);
    } finally {
      this.connection = null;
    }
  }

  public async reconnect(): Promise<void> {
    await this.stop();
    await this.start();
  }

  public subscribe(callback: NotificationCallback): () => void {
    this.subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  public unsubscribe(callback: NotificationCallback): void {
    this.subscribers.delete(callback);
  }

  private registerConnectionEvents(connection: HubConnection): void {
    connection.onreconnecting((error) => {
      console.warn(error);
    });

    connection.onclose((error) => {
      console.error(error);
      if (!this.isManuallyStopped) {
        setTimeout(() => {
          if (!this.isManuallyStopped) {
            this.start().catch((err) => console.error(err));
          }
        }, SIGNALR_CONSTANTS.RECONNECT_FALLBACK_DELAY_MS);
      }
    });
  }

  private isDuplicateNotification(notification: INotification): boolean {
    if (!notification.id) return false;

    const now = Date.now();
    for (const [id, seenAt] of this.recentNotificationIds) {
      if (now - seenAt > DUPLICATE_NOTIFICATION_WINDOW_MS) {
        this.recentNotificationIds.delete(id);
      }
    }

    if (this.recentNotificationIds.has(notification.id)) {
      return true;
    }

    this.recentNotificationIds.set(notification.id, now);
    return false;
  }

  private registerHubEvents(connection: HubConnection): void {
    const handleNewNotification = (raw: INotification) => {
      const notification = normalizeNotification(raw);
      if (this.isDuplicateNotification(notification)) return;

      this.subscribers.forEach((callback) => {
        try {
          callback(notification);
        } catch (cbError) {
          console.error(cbError);
        }
      });
    };

    this.unregisterHubEvents(connection);

    Object.values(SIGNALR_CONSTANTS.EVENTS).forEach((event) => {
      connection.on(event, handleNewNotification);
    });
  }

  private unregisterHubEvents(connection: HubConnection): void {
    Object.values(SIGNALR_CONSTANTS.EVENTS).forEach((event) => {
      connection.off(event);
    });
  }
}

export const signalRService = SignalRService.getInstance();
