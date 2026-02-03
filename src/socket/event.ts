import { Op, Transaction } from 'sequelize';
import { CommentLike, Feed, User, UserNetwork } from '../models';
import { ChatMessage } from '../models/chat-message.model';
import { FeedLiked } from '../models/feed-liked.model';
import FeedCommentService from '../services/feed-comment.service';
import FeedService from '../services/feed.service';
import loggerService from '../utils/logger.service';
import {
    AttendeeCheckInPayload,
    FeedCommentCreatedPayload,
    FeedCommentDeletedPayload,
    FeedCreatedPayload,
    FeedDeletedPayload,
    MessageCreated,
    MessageDeleted,
    MessageReaction,
    MessageUpdated,
} from './interfaces';
import * as socketManager from './socket-manager';
import chatRoomService from '../services/chat-room.service';

/**
 * Emit room created event to all users
 * @param room_id - Chat room ID
 * @param transaction - Database transaction (optional, needed if room is not yet committed)
 */
export const emitRoomCreated = async (room_id: string, transaction?: Transaction): Promise<void> => {
    try {
        loggerService.info(`Emit room created event to room users for room: ${room_id}`);
        const room = await chatRoomService.findRoomByIdActive(room_id, transaction);
        if (!room) {
            loggerService.error('Room not found');
            return;
        }
        const roomData = await chatRoomService.getRoomInfoWithUsersAndLastMessage(room_id, room.user_ids, room.deleted_users, transaction);
        
        // Only emit to users who are part of this room
        if (room.user_ids && room.user_ids.length > 0) {
            socketManager.emitRoomEventToUsers(room.user_ids, 'room:created', roomData);
        }
    } catch (error) {
        loggerService.error(`Error emitting room created event: ${error}`);
    }
};

/**
 * Emit user joined event to room
 * @param roomId - Chat room ID
 * @param userId - User ID who joined
 */
export const emitUserJoined = (roomId: string, userId: string): void => {
    socketManager.emitToRoom(roomId, 'user:join', { chatRoomId: roomId, userId });
};

/**
 * Emit room updated event to all users
 * @param room - Chat room data
 */
export const emitRoomUpdated = async (room_id: string, transaction?: Transaction): Promise<void> => {
    try {
        const room = await chatRoomService.findRoomByIdActive(room_id, transaction);
        if (!room) {
            loggerService.error('Room not found');
            return;
        }
        const roomData = await chatRoomService.getRoomInfoWithUsersAndLastMessage(room_id, room.user_ids, room.deleted_users, transaction);
        
        // Only emit to users who are part of this room
        if (room.user_ids && room.user_ids.length > 0) {
            socketManager.emitRoomEventToUsers([...room.user_ids, ...(room.deleted_users || [])], 'room:updated', roomData);
        }
    } catch (error) {
        loggerService.error(`Error emitting room updated event: ${error}`);
    }
};

export const emitRoomUpdatedToUser = async (userId: string, room_id: string, transaction?: Transaction): Promise<void> => {
    try {
        const room = await chatRoomService.findRoomByIdActive(room_id, transaction);
        if (!room) {
            loggerService.error('Room not found');
            return;
        }

        const roomData = await chatRoomService.getRoomInfoWithUsersAndLastMessage(room_id, room.user_ids, room.deleted_users, transaction);
        socketManager.emitRoomEventToUsers([userId], 'room:updated', roomData);
    } catch (error) {
        loggerService.error(`Error emitting room updated event: ${error}`);
    }
};

/**
 * Emit message created event to room
 * @param roomId - Chat room ID
 * @param message - Message data
 * @param media - Media data (optional)
 * @param transaction - Database transaction (optional)
 */
export const emitMessageCreated = async (roomId: string, message: ChatMessage | any, media?: any, transaction?: Transaction): Promise<void> => {
    try {
        const payload: MessageCreated = {
            message: message.toJSON ? message.toJSON() : message,
            media_url: media ? (media.toJSON ? media.toJSON() : media) : undefined
        };
        socketManager.emitToRoom(roomId, 'message:created', payload);
    } catch (error) {
        loggerService.error(`Error emitting message created event: ${error}`);
    }
};

/**
 * Emit message updated event to room
 * @param roomId - Chat room ID
 * @param message - Updated message data
 * @param transaction - Database transaction (optional)
 */
export const emitMessageUpdated = async (roomId: string, message: ChatMessage | any, transaction?: Transaction): Promise<void> => {
    try {
        const payload: MessageUpdated = {
            message: message.toJSON ? message.toJSON() : message
        };
        socketManager.emitToRoom(roomId, 'message:updated', payload);
    } catch (error) {
        loggerService.error(`Error emitting message updated event: ${error}`);
    }
};

/**
 * Emit message deleted event to room
 * @param roomId - Chat room ID
 * @param messageId - Message ID
 */
export const emitMessageDeleted = (roomId: string, messageId: string): void => {
    const payload: MessageDeleted = {
        message_id: messageId
    };
    socketManager.emitToRoom(roomId, 'message:deleted', payload);
};

/**
 * Emit message reaction event to room
 * @param roomId - Chat room ID
 * @param messageId - Message ID
 * @param userId - User ID who reacted
 * @param reactionType - Reaction type
 */
export const emitMessageReaction = (
    roomId: string,
    messageId: string,
    userId: string,
    reactionType: string
): void => {
    const payload: MessageReaction = {
        message_id: messageId,
        user_id: userId,
        reaction_type: reactionType
    };
    socketManager.emitToRoom(roomId, 'message:reaction', payload);
};

/**
 * Get all network user IDs for a user (bidirectional)
 */
const getAllNetworkUserIds = async (userId: string): Promise<string[]> => {
    const connections = await UserNetwork.findAll({
        where: {
            [Op.or]: [
                { user_id: userId, is_deleted: false },
                { peer_id: userId, is_deleted: false }
            ]
        },
        attributes: ['user_id', 'peer_id'],
    });

    const networkUserIds = new Set<string>();
    connections.forEach(conn => {
        // Add peer_id if user_id is the current user
        if (conn.user_id === userId) {
            networkUserIds.add(conn.peer_id);
        }
        // Add user_id if peer_id is the current user
        if (conn.peer_id === userId) {
            networkUserIds.add(conn.user_id);
        }
    });

    return Array.from(networkUserIds);
};

/**
 * Emit feed created event
 * - If feed is_public = true: emit to all connected users (broadcast to everyone)
 *   This ensures: "my public feed get in all user"
 * - If feed is_public = false: emit only to users in the feed creator's network
 * @param feed - Feed data
 */
export const emitFeedCreated = async (feed: Feed): Promise<void> => {
    try {
        const payload: FeedCreatedPayload = { feed };
        const feedJson = feed.toJSON ? feed.toJSON() : feed;
        const feedCreatorId = feedJson.user_id || feedJson.created_by;

        if (!feedCreatorId) {
            loggerService.error('Feed creator ID not found');
            return;
        }

        // If feed is public, emit to all users (broadcast to everyone)
        // This covers: "my public feed get in all user"
        if (feedJson.is_public) {
            socketManager.emitToAll('feed:created', payload);
            return;
        }

        // If feed is private, only emit to users in the feed creator's network
        const networkUserIds = await getAllNetworkUserIds(feedCreatorId);
        
        // Include the feed creator themselves
        const allowedUserIds = new Set([feedCreatorId, ...networkUserIds]);

        // Get all connected user IDs
        const connectedUserIds = socketManager.getConnectedUserIds();
        
        // Filter to only users in the network who are connected
        const targetUserIds = connectedUserIds.filter(userId => allowedUserIds.has(userId));

        // Emit to each network user
        for (const userId of targetUserIds) {
            const sockets = socketManager.getSockets(userId);
            if (sockets && sockets.size > 0) {
                sockets.forEach(socket => {
                    socket.emit('feed:created', payload);
                });
            }
        }
    } catch (error) {
        loggerService.error(`Error emitting feed:created: ${error}`);
    }
};

/**
 * Emit feed updated event to all users with personalized is_like flag
 * @param feedId - Feed ID that was updated
 * @param feedService - Feed service instance
 * @param FeedLikedModel - FeedLiked model
 */
export const emitFeedUpdated = async (
    feedId: string,
    feedService: typeof FeedService,
    FeedLikedModel: typeof FeedLiked
): Promise<void> => {
    await socketManager.emitFeedUpdatedToAllUsers(feedId, feedService, FeedLikedModel);
};

/**
 * Emit feed deleted event to all users
 * @param data - Feed deleted payload
 */
export const emitFeedDeleted = (data: FeedDeletedPayload): void => {
    socketManager.emitToAll('feed:deleted', data);
};

/**
 * Emit feed comment created event to all users
 * @param data - Comment payload
 */
export const emitFeedCommentCreated = (data: FeedCommentCreatedPayload): void => {
    socketManager.emitToAll('feed:comment:created', data);
};

/**
 * Emit feed comment updated event to all users with personalized is_like flag
 * @param commentId - Comment ID that was updated
 * @param feedId - Feed ID that the comment belongs to
 * @param feedCommentService - Feed comment service instance
 * @param CommentLikeModel - CommentLike model
 */
export const emitFeedCommentUpdated = async (
    commentId: string,
    feedId: string,
    feedCommentService: typeof FeedCommentService,
    CommentLikeModel: typeof CommentLike
): Promise<void> => {
    await socketManager.emitFeedCommentUpdatedToAllUsers(commentId, feedId, feedCommentService, CommentLikeModel);
};

/**
 * Emit feed comment deleted event to all users
 * @param data - Comment payload
 */
export const emitFeedCommentDeleted = (data: FeedCommentDeletedPayload): void => {
    socketManager.emitToAll('feed:comment:deleted', data);
};

/**
 * Emit attendee check-in update event to the attendee user
 * @param userId - Attendee user ID
 * @param payload - Check-in update payload
 */
export const emitAttendeeCheckInUpdate = (userId: string, payload: AttendeeCheckInPayload): void => {
    try {
        socketManager.emitToUser(userId, 'attendee:check-in:update', payload);
    } catch (error) {
        loggerService.error(`Error emitting attendee check-in update event: ${error}`);
    }
};

/**
 * Emit user update event to that user only (all their connected devices).
 * Use after updating profile/settings so the client can refresh local user data.
 * @param userId - User ID to send the event to
 * @param payload - Updated user data (e.g. from User.get() or a subset)
 */
export const emitUserUpdated = (userId: string, payload: User): void => {
    try {
        socketManager.emitToUser(userId, 'user:update', payload);
    } catch (error) {
        loggerService.error(`Error emitting user:update event: ${error}`);
    }
};
