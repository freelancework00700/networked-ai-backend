import path from 'path';
import moment from 'moment';
import { literal, Op, Transaction } from 'sequelize';
import { ChatMessage } from '../models/chat-message.model';
import { ChatRoom } from '../models/chat-room.model';
import { Media } from '../models/media.model';
import { User, Event, Feed, FeedMedia } from '../models/index';
import { emitMessageCreated, emitRoomUpdated } from '../socket/event';
import { MessageCreated, MessageUpdated } from '../socket/interfaces';
import { MediaContext, MediaType, MediaVariant, MessageType } from '../types/enums';
import env from '../utils/validate-env';
import chatRoomService from './chat-room.service';
import loggerService from '../utils/logger.service';

const chatMessageAttributes = ['id', 'chat_room_id', 'message', 'type', 'media_url', 'posted_by_user_id', 'event_id', 'feed_id', 'read_by_recipients', 'reactions', 'is_edited', 'deleted_by', 'created_at', 'updated_at', 'deleted_at', 'is_deleted'];
const chatRoomAttributes = ['id', 'name', 'is_personal', 'is_broadcast', 'event_id', 'event_image'];
const userAttributes = ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url', 'mobile'];
const feedAttributes = ['id', 'address', 'user_id', 'content', 'total_likes', 'total_comments', 'total_shares', 'is_public'];
const eventAttributes = ['id', 'title', 'slug', 'description', 'address', 'image_url', 'thumbnail_url', 'is_paid_event', 'start_date', 'end_date', 'capacity', 'is_public', 'created_by'];

/** Find message by ID */
const findMessageById = async (messageId: string, transaction?: Transaction) => {
    return await ChatMessage.findOne({
        attributes: chatMessageAttributes,
        where: { id: messageId },
        include: [
            {
                model: User,
                as: 'posted_by_user',
                attributes: userAttributes
            },
            {
                model: Event,
                as: 'event',
                required: false,
                attributes: eventAttributes,
                where: { is_deleted: false },
            },
            {
                model: Feed,
                as: 'feed',
                required: false,
                attributes: feedAttributes,
                where: { is_deleted: false },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
                    },
                    {
                        model: FeedMedia,
                        as: 'medias',
                        required: false,
                        where: { is_deleted: false },
                        attributes: ['id', 'media_url', 'media_type', 'order'],
                    }
                ]
            }
        ],
        transaction
    });
};

/** Find message by ID and room ID */
const findMessageByIdAndRoom = async (
    messageId: string,
    roomId: string,
    transaction?: Transaction
) => {
    return await ChatMessage.findOne({
        attributes: chatMessageAttributes,
        where: {
            id: messageId,
            chat_room_id: roomId
        },
        include: [
            {
                model: User,
                as: 'posted_by_user',
                attributes: userAttributes
            },
            {
                model: Event,
                as: 'event',
                attributes: eventAttributes,
                required: false,
                where: { is_deleted: false },
            },
            {
                model: Feed,
                as: 'feed',
                attributes: feedAttributes,
                required: false,
                where: { is_deleted: false },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
                    },
                    {
                        model: FeedMedia,
                        as: 'medias',
                        required: false,
                        where: { is_deleted: false },
                        attributes: ['id', 'media_url', 'media_type', 'order'],
                    }
                ]
            }
        ],
        transaction
    });
};

/** Find message by ID, room ID, and user ID */
const findMessageByIdRoomAndUser = async (
    messageId: string,
    roomId: string,
    userId: string,
    transaction?: Transaction
) => {
    return await ChatMessage.findOne({
        where: {
            id: messageId,
            chat_room_id: roomId,
            posted_by_user_id: userId
        },
        attributes: chatMessageAttributes,
        transaction
    });
};

/** Get all messages by room ID */
const findAllMessagesByRoomIdWithPagination = async (
    roomId: string,
    authenticatedUserId: string,
    page: number = 1,
    limit: number = 20
) => {
    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: messages } = await ChatMessage.findAndCountAll({
        attributes: chatMessageAttributes,
        where: {
            chat_room_id: roomId,
            [Op.or]: [
                { deleted_by: null },
                { deleted_by: { [Op.eq]: literal('JSON_ARRAY()') } },
                literal(`NOT JSON_CONTAINS(\`ChatMessage\`.\`deleted_by\`, '${JSON.stringify(authenticatedUserId)}')`)
            ]
        },
        include: [
            {
                model: User,
                as: 'posted_by_user',
                attributes: userAttributes
            },
            {
                model: Event,
                as: 'event',
                required: false,
                attributes: eventAttributes,
                include: [
                    {
                        model: User,
                        as: 'created_by_user',
                        attributes: userAttributes
                    }
                ],
            },
            {
                model: Feed,
                as: 'feed',
                required: false,
                attributes: feedAttributes,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
                    },
                    {
                        model: FeedMedia,
                        as: 'medias',
                        required: false,
                        where: { is_deleted: false },
                        attributes: ['id', 'media_url', 'media_type', 'order'],
                    },
                    {
                        model: Event,
                        as: 'events',
                        required: false,
                        attributes: eventAttributes,
                        include: [
                            {
                                model: User,
                                as: 'created_by_user',
                                attributes: userAttributes
                            }
                        ],
                    },
                ]
            }
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
    });

    return {
        data: messages,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Create message */
const createMessage = async (
    data: MessageCreated,
    transaction?: Transaction
) => {
    const createdMessage = await ChatMessage.create(data, { transaction });
    // Fetch the created message with relations
    return await ChatMessage.findOne({
        attributes: chatMessageAttributes,
        where: { id: createdMessage.id },
        include: [
            {
                model: User,
                as: 'posted_by_user',
                attributes: userAttributes
            },
            {
                model: Event,
                as: 'event',
                required: false,
                attributes: eventAttributes,
                include: [
                    {
                        model: User,
                        as: 'created_by_user',
                        attributes: userAttributes
                    }
                ],
            },
            {
                model: Feed,
                as: 'feed',
                required: false,
                attributes: feedAttributes,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
                    },
                    {
                        model: FeedMedia,
                        as: 'medias',
                        required: false,
                        where: { is_deleted: false },
                        attributes: ['id', 'media_url', 'media_type', 'order'],
                    },
                    {
                        model: Event,
                        as: 'events',
                        required: false,
                        attributes: eventAttributes,
                        include: [
                            {
                                model: User,
                                as: 'created_by_user',
                                attributes: userAttributes
                            }
                        ],
                    },
                ]
            }
        ],
        transaction
    });
};

/** Update message */
const updateMessage = async (
    messageId: string,
    data: MessageUpdated,
    transaction?: Transaction
) => {
    await ChatMessage.update(data, { where: { id: messageId, is_deleted: false }, transaction });
    return await ChatMessage.findOne({
        attributes: chatMessageAttributes,
        where: { id: messageId },
        include: [
            {
                model: User,
                as: 'posted_by_user',
                attributes: userAttributes
            }
        ],
        transaction
    });
};

/** Soft delete message */
const softDeleteMessage = async (messageId: string, transaction?: Transaction) => {
    await ChatMessage.update({ is_deleted: true, deleted_at: new Date() }, { where: { id: messageId, is_deleted: false }, transaction });
};

/** Mark messages as read */
const markMessagesAsRead = async (
    roomId: string,
    userId: string,
    timeFormatted: string
) => {
    const messages = await ChatMessage.findAll({
        attributes: chatMessageAttributes,
        where: {
            chat_room_id: roomId,
            read_by_recipients: {
                [Op.not]: {
                    [Op.contains]: [{ read_by_user_id: userId }]
                }
            }
        }
    });

    let updatedCount = 0;

    for (const message of messages) {
        const currentReadBy = Array.isArray(message.read_by_recipients) ? message.read_by_recipients : [message.read_by_recipients];

        const alreadyRead = currentReadBy.some((entry: { read_by_user_id: string }) => entry.read_by_user_id === userId);

        if (!alreadyRead) {
            currentReadBy.push({
                read_at: new Date(timeFormatted),
                read_by_user_id: userId
            });
            await ChatMessage.update(
                { read_by_recipients: currentReadBy },
                { where: { id: message.id } }
            );
            updatedCount++;
        }
    }

    return updatedCount;
};

/** Update message reactions */
const updateMessageReactions = async (
    message: ChatMessage,
    userId: string,
    reactionType: string,
    transaction?: Transaction
) => {
    const reactions = Array.isArray(message.reactions) ? message.reactions : [];
    const existingIndex = reactions.findIndex((r: { react_by: string }) => r.react_by === userId);

    if (existingIndex >= 0) {
        reactions[existingIndex].reaction = reactionType;
    } else {
        reactions.push({ react_by: userId, reaction: reactionType });
    }

    await message.update({ reactions }, { transaction });
    return message;
};

/** Handle file upload and create media */
const handleFileUpload = async (
    file: Express.Multer.File | undefined,
    userId: string | null,
    transaction?: Transaction
) => {
    let mediaUrl = null;
    let fileType = 'text';
    let createMedia = null;

    if (file) {
        if (file.mimetype.startsWith('image/')) {
            fileType = 'image';
        } else if (file.mimetype.startsWith('video/')) {
            fileType = 'video';
        } else if ([
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip',
            'text/csv'
        ].includes(file.mimetype)) {
            fileType = 'file';
        }

        // Create Media record for images and videos
        const mediaObj = {
            filename: file.originalname,
            extension: path.extname(file.originalname),
            type: fileType === 'image' ? MediaType.IMAGE : MediaType.VIDEO,
            context: MediaContext.OTHER,
            variant: MediaVariant.ORIGINAL,
            created_by: userId
        };

        createMedia = await Media.create(mediaObj, { transaction });
        // Generate media URL
        mediaUrl = `${env.API_URL}/media/${MediaContext.OTHER}/${file.filename}`;
    }

    return { mediaUrl, fileType, createMedia };
};

/** Get unread message count for a user in a room */
const getUnreadMessageCount = async (roomId: string, userId: string, transaction?: Transaction) => {
    return await ChatMessage.count({
        where: {
            chat_room_id: roomId,
            read_by_recipients: {
                [Op.and]: [
                    literal(`NOT JSON_CONTAINS(read_by_recipients, JSON_OBJECT('read_by_user_id', '${userId}'), '$')`)
                ]
            }
        },
        transaction
    });
};

// Send Personal Message
const sendPersonalMessage = async (broadCastOwner: string, recipientId: string, messagePayload: any, createMedia: any, transaction: Transaction) => {
    const userIdsString = JSON.stringify([broadCastOwner, recipientId].sort());
    let personalRoom = await ChatRoom.findOne({
        attributes: chatRoomAttributes,
        where: {
            is_personal: true,
            is_broadcast: false,
            [Op.and]: [literal(`JSON_CONTAINS(user_ids, '${userIdsString}')`)]
        }
    });

    if (!personalRoom) {
        personalRoom = await ChatRoom.create({
            user_ids: [broadCastOwner, recipientId],
            name: `Personal Chat: ${broadCastOwner} - ${recipientId}`,
            is_personal: true
        }, { transaction });
    }

    const individualMessagePayload = { ...messagePayload, chat_room_id: personalRoom.id };
    const individualMessage = await ChatMessage.create(individualMessagePayload, { transaction });
    await emitMessageCreated(personalRoom.id, individualMessage, createMedia, transaction);
}

// Handle Broadcast Message
const handleBroadcastMessage = async (chatRoom: any, messagePayload: any, createMedia: any, transaction: Transaction) => {
    const broadcastMessage = await createMessage(messagePayload, transaction);
    await emitMessageCreated(chatRoom.id, broadcastMessage, createMedia, transaction);

    const recipients = chatRoom.userIds.filter((id: any) => id !== chatRoom.broadCastOwner && !chatRoom.deletedUsers.includes(id));
    await Promise.all(recipients.map((recipientId: any) =>
        sendPersonalMessage(chatRoom.broadCastOwner, recipientId, messagePayload, createMedia, transaction)
    ));

    return broadcastMessage;
}

const getMessagesByRoomId = async (roomId: string) => {
    return await ChatMessage.findAll({
        attributes: chatMessageAttributes,
        where: { chat_room_id: roomId },
    });
}

/**
 * Share message in chat to multiple users
 * @param authenticatedUserId - ID of the user sending the message
 * @param targetUserIds - Array of user IDs to send the message to
 * @param message - Message text to send (optional)
 * @param messageType - Type of message (defaults to TEXT)
 * @param feedId - Feed ID to share (optional)
 * @param eventId - Event ID to share (optional)
 * @param transaction - Database transaction
 * @returns Object containing sentMessages and createdRooms arrays
 */
const shareInChat = async (
    authenticatedUserId: string,
    targetUserIds: string[],
    message: string | null,
    messageType: MessageType = MessageType.TEXT,
    feedId: string | null = null,
    eventId: string | null = null,
    transaction: Transaction
) => {
    const sentMessages = [];
    const createdRooms = [];
    const timeFormatted = moment.utc().format('M/D/YYYY h:mm:ss A');

    // Send message to each user individually
    for (const peerUserId of targetUserIds) {
        try {
            // Find or create personal chat room
            const sortedUserIds = [authenticatedUserId, peerUserId].sort();
            const existingRoom = await chatRoomService.findExistingRoom(sortedUserIds, true, null, transaction);

            let chatRoom;
            if (existingRoom) {
                chatRoom = existingRoom;
            } else {
                // Create new personal chat room
                chatRoom = await chatRoomService.createChatRoom({
                    is_personal: true,
                    user_ids: sortedUserIds,
                    created_by: authenticatedUserId
                }, transaction);
                
            }
            createdRooms.push(chatRoom);

            // Create message payload
            const messagePayload: MessageCreated = {
                media_url: null,
                type: messageType,
                feed_id: feedId || null,
                message: message || null,
                event_id: eventId || null,
                chat_room_id: chatRoom.id,
                created_by: authenticatedUserId,
                posted_by_user_id: authenticatedUserId,
                read_by_recipients: [{ read_by_user_id: authenticatedUserId, read_at: timeFormatted }],
            };

            // Create message
            const createdMessage = await createMessage(messagePayload, transaction);
            sentMessages.push(createdMessage);

            // Emit socket event
            await emitMessageCreated(chatRoom.id, createdMessage, null, transaction);

            // Emit room updated event for newly created rooms
            if (createdRooms.includes(chatRoom)) {
                await emitRoomUpdated(chatRoom.id, transaction);
            }
        } catch (error) {
            loggerService.error(`Error creating room/sending message to ${peerUserId}: ${error}`);
        }
    }

    return { sentMessages, createdRooms };
}

export default {
    shareInChat,
    findMessageById,
    findMessageByIdAndRoom,
    findMessageByIdRoomAndUser,
    findAllMessagesByRoomIdWithPagination,
    createMessage,
    updateMessage,
    softDeleteMessage,
    markMessagesAsRead,
    updateMessageReactions,
    handleFileUpload,
    getUnreadMessageCount,
    handleBroadcastMessage,
    getMessagesByRoomId
};

