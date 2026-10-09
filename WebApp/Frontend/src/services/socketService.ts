// socketService.ts
import { io, Socket } from 'socket.io-client';

type NotificationCallback = (data: any) => void;

class SocketService {
    private static instance: SocketService;
    private socket: Socket | null = null;
    private notificationCallback?: NotificationCallback;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public connect(userId: string): void {
        if (!this.socket) {
            const socketUrl = (import.meta as any).env?.VITE_SOCKET_API || (import.meta as any).env?.REACT_APP_SOCKET_API || 'ws://localhost:8080';
            this.socket = io(socketUrl, {
                transports: ['websocket'],
                autoConnect: false,
            });
        }

        if (!this.socket.connected) {
            this.socket.connect();
        }

        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.socket?.emit('join_room', userId);
        });

        this.socket.on('notification', (data) => {
            console.log('📩 Received notification:', data);
            if (this.notificationCallback) {
                this.notificationCallback(data);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('🔴 Disconnected from server');
        });
    }

    public onNotification(callback: NotificationCallback): void {
        this.notificationCallback = callback;
    }

    public offNotification(): void {
        this.notificationCallback = undefined;
    }

    public on(event: string, callback: (data: any) => void): void {
        this.socket?.on(event, callback);
    }

    public emit(event: string, data: any): void {
        this.socket?.emit(event, data);
    }

    public off(event: string): void {
        this.socket?.off(event);
    }

    public disconnect(): void {
        this.socket?.disconnect();
        this.socket = null;
    }

    public get isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    getSocket() {
        return this.socket;
    }
}

export default SocketService.getInstance();
