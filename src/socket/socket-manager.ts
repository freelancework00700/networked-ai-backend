import { Server, Socket } from 'socket.io';
import { CommentLike, Event, FeedComment, FeedLiked } from '../models';
import FeedCommentService from '../services/feed-comment.service';
import FeedService from '../services/feed.service';
import loggerService from '../utils/logger.service';
import { FeedCommentUpdatedPayload, FeedDeletedPayload, FeedUpdatedPayload, NetworkConnectionPayload, RoomCreated, RoomUpdated } from './interfaces';

// Store multiple sockets per user to support multiple devices
const socketMap: Map<string, Set<Socket>> = new Map();
let io: Server | undefined;

/**
 * Set the Socket.IO server instance
 */
export const setIo = (server: Server): void => {
    io = server;
};

/**
 * Register a socket for a user
 */
export const registerSocket = (userId: string, socket: Socket): void => {
    if (!socketMap.has(userId)) {
        socketMap.set(userId, new Set());
    }
    socketMap.get(userId)!.add(socket);
};

/**
 * Remove a socket
 */
export const removeSocket = (socket: Socket): void => {
    for (const [userId, sockets] of socketMap.entries()) {
        if (sockets.has(socket)) {
            // Leave all rooms before removing the socket
            try {
                leaveAllRooms(socket);
            } catch (error) {
                // Ignore errors if socket is already disconnected
            }
            sockets.delete(socket);

            // Remove user entry if no sockets left
            if (sockets.size === 0) {
                socketMap.delete(userId);
            }

            break;
        }
    }
    
    // Safety: Clean up any disconnected sockets that weren't properly removed
    // This prevents socketMap from growing unbounded
    for (const [userId, sockets] of socketMap.entries()) {
        const disconnectedSockets: Socket[] = [];
        sockets.forEach(socket => {
            if (!socket.connected) {
                disconnectedSockets.push(socket);
            }
        });
        disconnectedSockets.forEach(socket => {
            sockets.delete(socket);
        });
        if (sockets.size === 0) {
            socketMap.delete(userId);
        }
    }
};

/**
 * Get all sockets for a user
 */
export const getSockets = (userId: string): Set<Socket> | undefined => {
    return socketMap.get(userId);
};

/**
 * Get all connected user IDs
 */
export const getConnectedUserIds = (): string[] => {
    return Array.from(socketMap.keys());
};

/**
 * Join a user to a room (all their sockets)
 */
export const joinUserToRoom = (userId: string, roomId: string): void => {
    const sockets = getSockets(userId);
    if (sockets && sockets.size > 0) {
        sockets.forEach(socket => {
            socket.join(roomId);
        });
    }
};

/**
 * Leave a user from a room (all their sockets)
 */
export const leaveUserFromRoom = (userId: string, roomId: string): void => {
    const sockets = getSockets(userId);
    if (sockets && sockets.size > 0) {
        sockets.forEach(socket => {
            socket.leave(roomId);
        });
    }
};

/**
 * Leave all rooms for a socket
 */
export const leaveAllRooms = (socket: Socket): void => {
    // Get all rooms the socket is in and leave them
    const rooms = Array.from(socket.rooms);
    rooms.forEach(roomId => {
        if (roomId !== socket.id) { // socket.id is the default room, don't leave it
            socket.leave(roomId);
        }
    });
};

/**
 * Emit event to all connected clients
 */
export const emitToAll = (event: string, payload: FeedUpdatedPayload | FeedCommentUpdatedPayload | RoomUpdated | RoomCreated | FeedDeletedPayload): void => {
    io?.emit(event, payload);
};

/**
 * Emit event to a specific room
 */
export const emitToRoom = (roomId: string, event: string, payload: any): void => {
    io?.to(roomId).emit(event, payload);
};

/**
 * Emit event to a specific user (all their connected devices)
 * @param userId - Target user ID
 * @param event - Event name
 * @param payload - Event payload
 */
export const emitToUser = (userId: string, event: string, payload: any): void => {
    const sockets = getSockets(userId);
    if (sockets && sockets.size > 0) {
        sockets.forEach(socket => {
            socket.emit(event, payload);
        });
        loggerService.info(`Event ${event} emitted to user ${userId} (${sockets.size} device(s))`);
    } else {
        loggerService.info(`User ${userId} is not connected. Event ${event} will be delivered when they reconnect.`);
    }
};

/**
 * Emit notification to a specific user (all their connected devices)
 * @param userId - Target user ID
 * @param notification - Notification data
 */
export const emitNotificationToUser = (userId: string, notification: any): void => {
    const sockets = getSockets(userId);
    if (sockets && sockets.size > 0) {
        sockets.forEach(socket => {
            socket.emit('notification:update', notification);
        });
        loggerService.info(`Notification emitted to user ${userId} (${sockets.size} device(s))`);
    } else {
        loggerService.info(`User ${userId} is not connected. Notification will be delivered when they reconnect.`);
    }
};

/**
 * Emit notifications to multiple users
 * @param userIds - Array of target user IDs
 * @param notification - Notification data
 */
export const emitNotificationToUsers = (userIds: string[], notification: any): void => {
    userIds.forEach(userId => {
        emitNotificationToUser(userId, notification);
    });
};

/**
 * Emit room event to specific users (all their connected devices)
 * @param userIds - Array of target user IDs
 * @param event - Event name (e.g., 'room:created', 'room:updated')
 * @param payload - Room data payload
 */
export const emitRoomEventToUsers = (userIds: string[], event: string, payload: RoomCreated | RoomUpdated): void => {
    userIds.forEach(userId => {
        const sockets = getSockets(userId);
        if (sockets && sockets.size > 0) {
            sockets.forEach(socket => {
                socket.emit(event, payload);
            });
        }
    });
};

/**
 * Emit notification count update to a user (all their connected devices)
 * @param userId - Target user ID
 * @param count - Unread notification count
 */
export const emitNotificationCount = (userId: string, count: number): void => {
    const sockets = getSockets(userId);
    if (sockets && sockets.size > 0) {
        sockets.forEach(socket => {
            socket.emit('notification:count', { count });
        });
    }
};

/**
 * Emit network connection update event to a specific user (all their connected devices)
 * @param userId - Target user ID
 * @param payload - Network connection payload with user data and connection status
 */
export const emitNetworkConnectionUpdate = (userId: string, payload: NetworkConnectionPayload): void => {
    const sockets = getSockets(userId);
    if (sockets && sockets.size > 0) {
        sockets.forEach(socket => {
            socket.emit('network:connection:update', payload);
        });
        loggerService.info(`Network connection update emitted to user ${userId} (${sockets.size} device(s))`);
    } else {
        loggerService.info(`User ${userId} is not connected. Network connection update will be delivered when they reconnect.`);
    }
};

/**
 * Emit feed updated event to all connected users with personalized is_like flag
 * @param feedId - Feed ID that was updated
 * @param feedService - Feed service instance
 * @param FeedLikedModel - FeedLiked model
 */
export const emitFeedUpdatedToAllUsers = async (
    feedId: string,
    feedService: typeof FeedService,
    FeedLikedModel: typeof FeedLiked
): Promise<void> => {
    try {
        // 1. Get base feed (without user-specific is_like)
        const baseFeed = await feedService.getFeedById(feedId, null, true, false);
        if (!baseFeed) {
            return;
        }

        const feedJson = baseFeed.toJSON ? baseFeed.toJSON() : baseFeed;

        // 2. Get all connected user IDs
        const connectedUserIds = Array.from(socketMap.keys());
        if (connectedUserIds.length === 0) {
            return;
        }

        // 3. Single query: Get all likes for this feed from connected users
        const likes = await FeedLikedModel.findAll({
            where: {
                feed_id: feedId,
                user_id: connectedUserIds,
                is_deleted: false,
            },
            attributes: ['user_id'],
        });

        // 4. Build map: userId -> isLiked
        const likedUserIds = new Set(likes.map((liked: FeedLiked) => liked.user_id));

        // 5. Emit personalized feed to each user
        // Process in batches to avoid holding all personalized feeds in memory at once
        const BATCH_SIZE = 50;
        for (let i = 0; i < connectedUserIds.length; i += BATCH_SIZE) {
            const batch = connectedUserIds.slice(i, i + BATCH_SIZE);
            
            for (const userId of batch) {
                const isLiked = likedUserIds.has(userId);
                // Create minimal personalized feed object to reduce memory
                const personalizedFeed = {
                    ...feedJson,
                    event_ids: feedJson.events?.map((event: Event) => event.id) || [],
                    is_like: isLiked,
                };

                const sockets = getSockets(userId);
                if (sockets && sockets.size > 0) {
                    sockets.forEach(socket => {
                        if (socket.connected) {
                            try {
                                socket.emit('feed:updated', { feed: personalizedFeed });
                            } catch (error) {
                                // Ignore errors on disconnected sockets
                            }
                        }
                    });
                }
            }
            
            // Allow garbage collection between batches
            if (i + BATCH_SIZE < connectedUserIds.length) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }
    } catch (error) {
        loggerService.error(`Error emitting feed:updated to all users: ${error}`);
    }
};

/**
 * Emit feed comment updated event to all connected users with personalized is_like flag
 * @param commentId - Comment ID that was updated
 * @param feedId - Feed ID that the comment belongs to
 * @param feedCommentService - Feed comment service instance
 * @param CommentLikeModel - CommentLike model
 */
export const emitFeedCommentUpdatedToAllUsers = async (
    commentId: string,
    feedId: string,
    feedCommentService: typeof FeedCommentService,
    CommentLikeModel: typeof CommentLike
): Promise<void> => {
    try {
        // 1. Get base comment (without user-specific is_like)
        const baseComment = await feedCommentService.findById(commentId, null, true);
        if (!baseComment) {
            return;
        }

        const commentJson = baseComment.toJSON ? baseComment.toJSON() : baseComment;

        // 2. Get all connected user IDs
        const connectedUserIds = Array.from(socketMap.keys());
        if (connectedUserIds.length === 0) {
            return;
        }

        // 3. Collect all comment IDs (including replies) for like checking
        const collectCommentIds = (comment: FeedComment): string[] => {
            const ids = [comment.id];
            if (Array.isArray(comment.replies)) {
                comment.replies.forEach((reply: FeedComment) => {
                    ids.push(...collectCommentIds(reply));
                });
            }
            return ids;
        };
        const allCommentIds = collectCommentIds(commentJson);

        // 4. Single query: Get all likes for these comments from connected users
        const likes = await CommentLikeModel.findAll({
            where: {
                comment_id: allCommentIds,
                user_id: connectedUserIds,
                is_deleted: false,
            },
            attributes: ['comment_id', 'user_id'],
        });

        // 5. Build map: userId -> Set of liked comment IDs
        const likedMap = new Map<string, Set<string>>();
        likes.forEach((like: CommentLike) => {
            if (!likedMap.has(like.user_id)) {
                likedMap.set(like.user_id, new Set());
            }
            likedMap.get(like.user_id)!.add(like.comment_id);
        });

        // 6. Recursively transform comment with is_like flag
        const transformCommentWithLike = (comment: FeedComment, userId: string) => {
            const userLikedIds = likedMap.get(userId) || new Set();
            const isLiked = userLikedIds.has(comment.id);

            const transformed: any = {
                ...comment,
                is_like: isLiked,
            };

            // Recursively transform replies if they exist
            if (Array.isArray(comment.replies)) {
                transformed.replies = comment.replies.map((reply: FeedComment) =>
                    transformCommentWithLike(reply, userId)
                );
            }

            return transformed;
        };

        // 7. Emit personalized comment to each user
        // Process in batches to avoid holding all personalized comments in memory at once
        const BATCH_SIZE = 50;
        for (let i = 0; i < connectedUserIds.length; i += BATCH_SIZE) {
            const batch = connectedUserIds.slice(i, i + BATCH_SIZE);
            
            for (const userId of batch) {
                const personalizedComment = transformCommentWithLike(commentJson, userId);

                const sockets = getSockets(userId);
                if (sockets && sockets.size > 0) {
                    sockets.forEach(socket => {
                        if (socket.connected) {
                            try {
                                socket.emit('feed:comment:updated', {
                                    feed_id: feedId,
                                    comment: personalizedComment,
                                });
                            } catch (error) {
                                // Ignore errors on disconnected sockets
                            }
                        }
                    });
                }
            }
            
            // Allow garbage collection between batches
            if (i + BATCH_SIZE < connectedUserIds.length) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }
    } catch (error) {
        loggerService.error(`Error emitting feed:comment:updated to all users: ${error}`);
    }
};
