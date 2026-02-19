import { NextFunction, Request, Response } from 'express';
import moment from 'moment';
import { sequelize } from '../server';
import chatRoomService from '../services/chat-room.service';
import * as eventService from '../services/event.service';
import messageService from '../services/message.service';
import userService from '../services/user.service';
import gamificationCategoryService from '../services/gamification-category.service';
import userGamificationPointsService from '../services/user-gamification-points.service';
import userGamificationCategoryBadgesService from '../services/user-gamification-category-badges.service';
import { emitMessageCreated, emitMessageDeleted, emitMessageReaction, emitMessageUpdated, emitRoomUpdated, emitRoomUpdatedToUser } from '../socket/event';
import { ContentType, MessageType } from '../types/enums';
import loggerService from '../utils/logger.service';
import { sendNewNetworkedRequestMail } from '../utils/mail.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBroadcastEmailToAllChatRoomMembers } from '../services/email.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/** GET API: Get message by ID */
export const getMessage = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { message_id } = req.params;

        const message = await messageService.findMessageById(message_id as string, transaction);
        if (!message) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.message.notFound);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.message.retrieved, message);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error fetching message: ${error}`);
        sendServerErrorResponse(res, responseMessages.message.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get all messages by room ID */
export const getAllMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const { room_id } = req.params;
        const { page, limit } = req.query;

        const room = await chatRoomService.findRoomByIdActive(room_id as string);
        if (!room) {
            return sendNotFoundResponse(res, responseMessages.chatRoom.notFound);
        }

        const userInRoom = await chatRoomService.checkUserInRoom(room_id as string, authenticatedUserId);
        if (!userInRoom) {
            return sendBadRequestResponse(res, responseMessages.message.userNotInRoom);
        }

        const messages = await messageService.findAllMessagesByRoomIdWithPagination(room_id as string, authenticatedUserId, Number(page) || 1, Number(limit) || 20);
        if (!messages || messages.data.length === 0) {
            return sendSuccessResponse(res, responseMessages.message.notFoundAll, []);
        }

        return sendSuccessResponse(res, responseMessages.message.retrievedAll, messages);
    } catch (error) {
        loggerService.error(`Error fetching messages: ${error}`);
        sendServerErrorResponse(res, responseMessages.message.failedToFetch, error);
        next(error);
    }
};

/** PUT API: Edit message */
export const updateMessage = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();

    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const { room_id, message_id, message } = req.body;
        const file = req.file;

        const chatRoom = await chatRoomService.findRoomByIdActive(room_id, transaction);
        if (!chatRoom) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.chatRoom.notFound);
        }

        const chatMessage = await messageService.findMessageByIdRoomAndUser(
            message_id,
            room_id,
            authenticatedUserId,
            transaction
        );
        if (!chatMessage) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.message.notFound);
        }

        if (!message && !file) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.message.messageOrFileRequired);
        }

        const userInRoom = chatRoom.user_ids.includes(authenticatedUserId);
        if (!userInRoom) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.message.unauthorized);
        }

        const updateData: any = {
            is_edited: true,
            updated_by: authenticatedUserId || null
        };

        if (message) {
            updateData.message = message;
        }

        if (file) {
            const { mediaUrl, fileType } = await messageService.handleFileUpload(
                file,
                authenticatedUserId || null,
                transaction
            );
            updateData.media_url = mediaUrl;
            updateData.type = fileType;
            updateData.is_edited = true;
            updateData.updated_at = new Date();
            if (!message) {
                updateData.message = null;
            }
        }

        const updatedMessage = await messageService.updateMessage(message_id, updateData, transaction);

        try {
            await emitMessageUpdated(room_id, updatedMessage, transaction);
            await emitRoomUpdated(chatRoom.id, transaction);
        } catch (socketError) {
            loggerService.error(`Error emitting socket events: ${socketError}`);
        }

        await transaction.commit();

        return sendSuccessResponse(res, responseMessages.message.updated, updatedMessage);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating message: ${error}`);
        sendServerErrorResponse(res, responseMessages.message.failedToUpdate, error);
        next(error);
    }
};

/** DELETE API: Delete message */
export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { message_id } = req.params;

        const message = await messageService.findMessageById(message_id as string, transaction);
        if (!message) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.message.notFound);
        }

        await messageService.softDeleteMessage(message_id as string, transaction);
        await transaction.commit();

        // Emit socket event
        emitMessageDeleted(message.chat_room_id, message_id as string);

        return sendSuccessResponse(res, responseMessages.message.deleted, {
            message_id
        });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting message: ${error}`);
        sendServerErrorResponse(res, responseMessages.message.failedToDelete, error);
        next(error);
    }
};

/** PUT API: Mark messages as read */
export const markMessageRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const { room_id } = req.params;

        const room = await chatRoomService.findRoomByIdActive(room_id as string);
        if (!room) {
            return sendNotFoundResponse(res, responseMessages.chatRoom.notFound);
        }

        if (!room.user_ids.includes(authenticatedUserId)) {
            return sendBadRequestResponse(res, responseMessages.message.unauthorized);
        }

        const timeFormatted = moment.utc().format('M/D/YYYY h:mm:ss A');
        const updatedCount = await messageService.markMessagesAsRead(room_id as string, authenticatedUserId, timeFormatted);
        await emitRoomUpdatedToUser(authenticatedUserId, room_id as string);

        return sendSuccessResponse(res, responseMessages.message.markedAsRead, { updatedCount });
    } catch (error) {
        loggerService.error(`Error marking messages as read: ${error}`);
        sendServerErrorResponse(res, responseMessages.message.failedToUpdate, error);
        next(error);
    }
};

/** POST API: Post message */
export const postMessage = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const { message, post_id, event_id, room_id, is_broadcast_email = false } = req.body;
        const file = req.file;

        if (!message && !file) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.message.messageOrFileRequired);
        }

        const chatRoom = await chatRoomService.findRoomByIdActive(room_id, transaction);
        if (!chatRoom || chatRoom.deleted_users.includes(authenticatedUserId) || !chatRoom.user_ids.includes(authenticatedUserId)) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.message.unauthorized);
        }

        // Clear delete history when new message is posted
        await chatRoomService.updateChatRoom(
            room_id,
            { delete_history_by: [] } as any,
            transaction
        );

        if (chatRoom.is_broadcast && authenticatedUserId !== chatRoom.broadcast_owner) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.message.unauthorized);
        }

        const { mediaUrl, fileType, createMedia } = await messageService.handleFileUpload(
            file,
            authenticatedUserId || null,
            transaction
        );

        const timeFormatted = moment.utc().format('M/D/YYYY h:mm:ss A');

        let type = MessageType.TEXT;
        if (post_id) {
            type = MessageType.POST;
        } else if (event_id) {
            type = MessageType.EVENT;
        } else {
            type = fileType as MessageType;
        }

        const messagePayload = {
            chat_room_id: room_id,
            message: message || null,
            type,
            media_url: mediaUrl,
            posted_by_user_id: authenticatedUserId,
            read_by_recipients: [{ read_by_user_id: authenticatedUserId, read_at: timeFormatted }],
            created_by: authenticatedUserId || null,
            event_id: event_id || null,
            feed_id: post_id || null
        };

        let post;
        if (chatRoom.is_broadcast) {
            post = await messageService.handleBroadcastMessage(chatRoom, messagePayload, createMedia, transaction);
        } else {
            post = await messageService.createMessage(messagePayload, transaction);
            await emitMessageCreated(room_id, post, createMedia, transaction);
        }

        // Increment user's total_messages_sent
        if (authenticatedUserId && post) {
            await userService.incrementUserTotal(authenticatedUserId, 'total_messages_sent', transaction);

            // Gamification: Send a Message
            const msgCategory = await gamificationCategoryService.getGamificationCategoryByName('Send a Message');
            if (msgCategory) {
                await userGamificationPointsService.createUserGamificationPoints(
                    {
                        content_id: post.id,
                        content_type: ContentType.MESSAGE,
                        user_id: authenticatedUserId,
                        gamification_category_id: msgCategory.id,
                        earned_points: msgCategory.earned_point ?? 0,
                    },
                    authenticatedUserId,
                    transaction
                );

                await userGamificationCategoryBadgesService.checkAndAwardBadgeByField(
                    authenticatedUserId,
                    msgCategory.id,
                    'total_messages_sent',
                    transaction
                );

                await userService.addPointsToUserTotal(
                    authenticatedUserId,
                    'total_gamification_points',
                    msgCategory.earned_point ?? 0,
                    transaction
                );
            }
        }

        const getEventHost = chatRoom.event_id ? await eventService.getEventHostByEventId(chatRoom.event_id) : null;

        if (getEventHost?.created_by && getEventHost.created_by !== authenticatedUserId) {
            const user = await userService.findUserById(getEventHost.created_by);
            if (user) {
                await emitMessageCreated(room_id, post, createMedia, transaction);
                const data = message ? message : file;
                sendNewNetworkedRequestMail(user.email as string, user.username as string, chatRoom.event_id as string, data);
            }
        }

        await emitRoomUpdated(chatRoom.id, transaction);

        // Send broadcast email to all members if requested
        if (is_broadcast_email && message) {
            try {
                const sender = await userService.findUserById(authenticatedUserId);
                const senderName = sender?.name || sender?.username || 'Networked AI User';
                
                // Send email asynchronously without blocking the response (excluding sender)
                sendBroadcastEmailToAllChatRoomMembers(message, senderName, chatRoom, authenticatedUserId);
            } catch (userError) {
                loggerService.error(`Error fetching sender info for broadcast email: ${userError}`);
            }
        }

        await transaction.commit();

        return sendSuccessResponse(res, responseMessages.message.created, {
            message: post,
            media: createMedia
        });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error posting message: ${error}`);
        sendServerErrorResponse(res, responseMessages.message.failedToCreate, error);
        next(error);
    }
};

/** POST API: Send individual message to multiple users */
export const sendIndividualMessage = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const { user_ids, message, post_id, event_id } = req.body;
        const file = req.file;

        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            await transaction.rollback();
            return sendBadRequestResponse(res, 'User IDs are required and must be a non-empty array.');
        }

        if (!message && !file) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.message.messageOrFileRequired);
        }

        // Handle file upload
        const { mediaUrl, fileType, createMedia } = await messageService.handleFileUpload(
            file,
            authenticatedUserId || null,
            transaction
        );

        const timeFormatted = moment.utc().format('M/D/YYYY h:mm:ss A');

        let type = MessageType.TEXT;
        if (post_id) {
            type = MessageType.POST;
        } else if (event_id) {
            type = MessageType.EVENT;
        } else {
            type = fileType as MessageType;
        }

        const sentMessages = [];
        const createdRooms = [];

        // Gamification category lookup (Send a Message)
        const msgCategory = await gamificationCategoryService.getGamificationCategoryByName('Send a Message');

        // Send message to each user individually
        for (const userId of user_ids) {
            // Skip if trying to send to self
            if (userId === authenticatedUserId) {
                continue;
            }

            // Find or create personal chat room
            const existingRoom = await chatRoomService.findExistingRoom(
                [authenticatedUserId, userId],
                true,
                null,
                transaction
            );

            let chatRoom;
            if (existingRoom) {
                chatRoom = existingRoom;
            } else {
                // Create new personal chat room
                const roomData = {
                    user_ids: [authenticatedUserId, userId],
                    is_personal: true,
                    name: `Personal Chat: ${authenticatedUserId}-${userId}`,
                    event_id: null,
                    is_broadcast: false,
                    broadcast_owner: null,
                    created_by: authenticatedUserId
                };
                chatRoom = await chatRoomService.createChatRoom(roomData, transaction);
                createdRooms.push(chatRoom);
            }

            // Create message payload
            const messagePayload = {
                chat_room_id: chatRoom.id,
                message: message || null,
                type,
                media_url: mediaUrl,
                posted_by_user_id: authenticatedUserId,
                read_by_recipients: [{ read_by_user_id: authenticatedUserId, read_at: timeFormatted }],
                created_by: authenticatedUserId
            };

            // Create message
            const individualMessage = await messageService.createMessage(messagePayload, transaction);
            sentMessages.push(individualMessage);

            // Gamification: increment total_messages_sent and award points/badges per message
            if (authenticatedUserId) {
                await userService.incrementUserTotal(authenticatedUserId, 'total_messages_sent', transaction);

                if (msgCategory && individualMessage) {
                    await userGamificationPointsService.createUserGamificationPoints(
                        {
                            content_id: individualMessage.id,
                            content_type: ContentType.MESSAGE,
                            user_id: authenticatedUserId,
                            gamification_category_id: msgCategory.id,
                            earned_points: msgCategory.earned_point ?? 0,
                        },
                        authenticatedUserId,
                        transaction
                    );

                    await userGamificationCategoryBadgesService.checkAndAwardBadgeByField(
                        authenticatedUserId,
                        msgCategory.id,
                        'total_messages_sent',
                        transaction
                    );

                    await userService.addPointsToUserTotal(
                        authenticatedUserId,
                        'total_gamification_points',
                        msgCategory.earned_point ?? 0,
                        transaction
                    );
                }
            }

            // Emit socket event
            await emitMessageCreated(chatRoom.id, individualMessage, createMedia, transaction);

            // Emit room updated event for newly created rooms
            if (createdRooms.includes(chatRoom)) {
                await emitRoomUpdated(chatRoom.id, transaction);
            }
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.message.created, {
            sent_messages: sentMessages,
            media: createMedia,
            count: sentMessages.length
        });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error sending individual messages: ${error}`);
        sendServerErrorResponse(res, responseMessages.message.failedToCreate, error);
        next(error);
    }
};

/** PUT API: Add reaction to message */
export const reactionToMessage = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const { message_id } = req.params;
        const { reaction_type } = req.body;

        const message = await messageService.findMessageById(message_id as string, transaction);
        if (!message) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.message.notFound);
        }

        await messageService.updateMessageReactions(
            message,
            authenticatedUserId,
            reaction_type,
            transaction
        );
        await transaction.commit();

        // Emit socket event
        emitMessageReaction(message.chat_room_id as string, message_id as string, authenticatedUserId, reaction_type);

        return sendSuccessResponse(res, responseMessages.message.reactionAdded);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error adding reaction: ${error}`);
        sendServerErrorResponse(res, responseMessages.message.failedToUpdate, error);
        next(error);
    }
};

/** DELETE API: Delete chat history */
export const deleteHistory = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const { room_id } = req.params;

        // Find room
        const chatRoom = await chatRoomService.findRoomByIdActive(room_id as string, transaction);
        if (!chatRoom) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.chatRoom.notFound);
        }

        // Check if user is in room and not deleted
        const userInRoom = await chatRoomService.checkUserInRoom(room_id as string, authenticatedUserId, transaction);
        if (!userInRoom) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.message.userNotInRoom);
        }

        // Check if user is already in deleted_users
        if (chatRoom.deleted_users?.includes(authenticatedUserId)) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.chatRoom.userAlreadyDeleted);
        }

        // Update delete_history_by array in room
        const updatedDeleteHistoryBy = chatRoom.delete_history_by
            ? [...chatRoom.delete_history_by, authenticatedUserId]
            : [authenticatedUserId];

        await chatRoomService.updateChatRoom(
            room_id as string,
            {
                delete_history_by: updatedDeleteHistoryBy,
                updated_by: authenticatedUserId || null
            } as any,
            transaction
        );

        // Get all messages in the room
        const messages = await messageService.getMessagesByRoomId(room_id as string);

        // Update each message's deleted_by array to include user_id
        const updatePromises = messages.map((message) => {
            const currentDeletedBy = Array.isArray(message.deleted_by) ? message.deleted_by : [];
            const updatedDeletedBy = currentDeletedBy.includes(authenticatedUserId)
                ? currentDeletedBy
                : [...currentDeletedBy, authenticatedUserId];

            return message.update(
                { deleted_by: updatedDeletedBy },
                { transaction }
            );
        });

        await Promise.all(updatePromises);
        await transaction.commit();

        return sendSuccessResponse(res, 'Chat history deleted successfully.', {
            room_id,
            authenticatedUserId,
            messages_deleted: messages.length
        });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting chat history: ${error}`);
        sendServerErrorResponse(res, 'Failed to delete chat history.', error);
        next(error);
    }
};