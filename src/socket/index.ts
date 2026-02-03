import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import * as socketManager from './socket-manager';
import { UserRoom } from './interfaces';

/**
 * Initialize Socket.IO server
 * @param httpServer - HTTP server instance
 * @returns Socket.IO server instance
 */
export const initSocketServer = (httpServer: HttpServer): Server => {
    const io = new Server(httpServer, {
        cors: { origin: '*' },
    });

    // CRITICAL: Discard HTTP request reference to save memory
    // Socket.IO keeps a reference to the first HTTP request by default
    // This can cause memory leaks with many connections
    io.engine.on('connection', (rawSocket: any) => {
        rawSocket.request = null;
    });

    socketManager.setIo(io);

    io.on('connection', (socket: Socket) => {
        // Reduced logging to prevent memory accumulation from log strings
        console.log('Socket connected:', socket.id);

        // Heartbeat: client-initiated and server-initiated heartbeat support
        // Store interval ID for cleanup
        let heartbeatInterval: NodeJS.Timeout | null = null;
        
        // Start heartbeat only if socket is connected
        const startHeartbeat = () => {
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }
            heartbeatInterval = setInterval(() => {
                // Check connection before emitting to prevent errors
                if (socket.connected) {
                    try {
                        socket.emit('heartbeat', { serverTime: Date.now() });
                    } catch (error) {
                        // Socket might have disconnected, clear interval
                        if (heartbeatInterval) {
                            clearInterval(heartbeatInterval);
                            heartbeatInterval = null;
                        }
                    }
                } else {
                    // Socket disconnected, clear interval
                    if (heartbeatInterval) {
                        clearInterval(heartbeatInterval);
                        heartbeatInterval = null;
                    }
                }
            }, 10_000);
        };

        // Event handler functions (defined for cleanup)
        const onHeartbeat = (payload?: { clientTime?: number }) => {
            if (socket.connected) {
                try {
                    socket.emit('heartbeat:ack', {
                        serverTime: Date.now(),
                        clientTime: payload?.clientTime ?? null
                    });
                } catch (error) {
                    // Ignore errors on disconnected sockets
                }
            }
        };

        const onHeartbeatAck = () => {
            // No-op handler
        };

        const onRegister = async (userId: string) => {
            if (!userId || typeof userId !== 'string') {
                if (socket.connected) {
                    socket.emit('register:error', {
                        message: 'Invalid userId provided'
                    });
                }
                return;
            }

            socketManager.registerSocket(userId, socket);
            
            if (socket.connected) {
                socket.emit('register:success', {
                    userId: userId,
                    socketId: socket.id,
                    message: 'Successfully registered',
                    timestamp: new Date().toISOString()
                });
            }
        };

        const onJoinRoom = ({ roomId, userId }: UserRoom) => {
            if (socket.connected) {
                socket.join(roomId);
                socketManager.joinUserToRoom(userId, roomId);
            }
        };

        const onLeaveRoom = ({ roomId, userId }: UserRoom) => {
            if (socket.connected) {
                socket.leave(roomId);
                socketManager.leaveUserFromRoom(userId, roomId);
            }
        };

        const onError = (error: Error) => {
            // Reduced logging - only log critical errors
            if (socket.connected) {
                console.error(`Socket error for ${socket.id}:`, error.message);
            }
        };

        const onDisconnect = (reason: string) => {
            // CRITICAL: Clean up all resources to prevent memory leaks
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
            
            // Remove all event listeners to prevent memory leaks
            socket.removeAllListeners('heartbeat');
            socket.removeAllListeners('heartbeat:ack');
            socket.removeAllListeners('register');
            socket.removeAllListeners('joinRoom');
            socket.removeAllListeners('leaveRoom');
            socket.removeAllListeners('error');
            
            // Remove socket from manager
            socketManager.removeSocket(socket);
        };

        // Register event listeners
        socket.on('heartbeat', onHeartbeat);
        socket.on('heartbeat:ack', onHeartbeatAck);
        socket.on('register', onRegister);
        socket.on('joinRoom', onJoinRoom);
        socket.on('leaveRoom', onLeaveRoom);
        socket.on('error', onError);
        socket.on('disconnect', onDisconnect);

        // Start heartbeat after a short delay to ensure socket is ready
        setTimeout(() => {
            if (socket.connected) {
                startHeartbeat();
            }
        }, 1000);
    });

    return io;
};
