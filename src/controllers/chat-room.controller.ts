import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import messageService from '../services/message.service';
import chatRoomService from '../services/chat-room.service';
import feedSharedService from '../services/feed-shared.service';
import { emitRoomCreated, emitRoomUpdated, emitUserJoined } from '../socket/event';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';
import { ChatRoom, Event, EventParticipant, EventAttendee } from '../models';

/** POST API: Create Chat Room API */
export const createChatRoom = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { user_ids, name, is_personal, event_id, event_image, profile_image } = req.body;

        let allUserIds: string[] = [];

        if (event_id) {
            // Fetch existing room by event_id if it exists
            const existingRoom = await chatRoomService.findRoomByEventId(event_id, transaction);
            if (existingRoom) {
                await transaction.rollback();
                return sendSuccessResponse(res, responseMessages.chatRoom.alreadyExists, existingRoom);
            }

            // Verify event exists
            const event = await Event.findByPk(event_id, {
                attributes: ['id', 'created_by'],
                transaction
            });

            if (!event) {
                await transaction.rollback();
                return sendNotFoundResponse(res, responseMessages.event.notFound);
            }

            // Get all participants (co-host, sponsor, speaker, staff, host)
            const participants = await EventParticipant.findAll({
                where: {
                    event_id: event_id,
                    is_deleted: false,
                },
                attributes: ['user_id'],
                transaction,
            });

            // Get all attendees
            const attendees = await EventAttendee.findAll({
                where: {
                    event_id: event_id,
                    is_deleted: false,
                },
                attributes: ['user_id'],
                transaction,
            });

            // Collect all user IDs
            const userIdSet = new Set<string>();

            // Add event creator (host)
            if (event.created_by) {
                userIdSet.add(event.created_by);
            }

            // Add all participants
            for (const participant of participants) {
                const userId = (participant as any).user_id;
                if (userId) {
                    userIdSet.add(userId);
                }
            }

            // Add all attendees
            for (const attendee of attendees) {
                const userId = (attendee as any).user_id;
                if (userId) {
                    userIdSet.add(userId);
                }
            }

            // Convert set to array and sort
            allUserIds = Array.from(userIdSet).filter(id => id && id.trim() !== '').sort();

            // Ensure we have at least one user
            if (allUserIds.length === 0) {
                await transaction.rollback();
                return sendBadRequestResponse(res, responseMessages.chatRoom.noEventParticipants);
            }
        } else {
            // For non-event rooms, user_ids is required
            if (!user_ids || !Array.isArray(user_ids) || user_ids.length < 2) {
                await transaction.rollback();
                return sendBadRequestResponse(res, responseMessages.chatRoom.atLeastTwoUsersRequired);
            }

            if (is_personal && user_ids.length !== 2) {
                await transaction.rollback();
                return sendBadRequestResponse(res, responseMessages.chatRoom.exactlyTwoUsersRequired);
            }

            if (!is_personal && !name) {
                await transaction.rollback();
                return sendBadRequestResponse(res, responseMessages.chatRoom.nameRequired);
            }

            allUserIds = [...user_ids].sort();
        }

        // Check for existing room with same users and type
        const existingRoom = await chatRoomService.findExistingRoom(allUserIds, is_personal, name, transaction);
        if (existingRoom) {
            await transaction.rollback();
            return sendSuccessResponse(res, responseMessages.chatRoom.alreadyExists, { room_id: existingRoom.id });
        }

        const chatRoom = await chatRoomService.createChatRoom({
            user_ids: allUserIds,
            name: name || null,
            is_personal,
            event_id: event_id || null,
            event_image: event_image || null,
            profile_image: profile_image || null,
            created_by: authenticatedUser?.id || null,
        }, transaction);

        // Notify via WebSockets
        await emitRoomCreated(chatRoom.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.chatRoom.created, chatRoom);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error creating chat room: ${error}`);
        sendServerErrorResponse(res, responseMessages.chatRoom.failedToCreate, error);
        next(error);
    }
};

/** POST API: Create broadcast Room API */
export const broadcastCreate = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const { user_ids, name, broadcast_owner } = req.body;

        const allUserIds = [...user_ids].sort();
        // Check for existing broadcast room
        const existingRoom = await chatRoomService.findBroadcastRoomByOwner(broadcast_owner, transaction);
        if (existingRoom) {
            const updatedRoom = await chatRoomService.updateChatRoom(existingRoom.id, {
                user_ids: allUserIds,
                name,
                updated_by: authenticatedUserId || null,
            } as any, transaction);

            // Notify via WebSockets
            if (updatedRoom) {
                await emitRoomCreated(updatedRoom.id, transaction);
            }

            await transaction.commit();
            return sendSuccessResponse(res, responseMessages.chatRoom.broadcastRoomUpdated, existingRoom);
        }

        const newRoom = await chatRoomService.createChatRoom({
            user_ids: allUserIds,
            name,
            is_broadcast: true,
            is_personal: false,
            broadcast_owner,
            created_by: authenticatedUserId || null,
        }, transaction);

        // Notify via WebSockets
        await emitRoomCreated(newRoom.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.chatRoom.broadcastRoomCreated, newRoom);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error creating broadcast room: ${error}`);
        sendServerErrorResponse(res, responseMessages.chatRoom.failedToCreate, error);
        next(error);
    }
};

/** PUT API: Add user in existing room API */
export const joinRoom = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { user_ids, chat_room_id } = req.body;

        const usersArray = user_ids.map((id: string) => String(id));
        const chatRoom = await chatRoomService.findRoomById(chat_room_id, transaction);
        if (!chatRoom || chatRoom.is_deleted) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.chatRoom.notFound);
        }

        if (chatRoom.is_personal) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.chatRoom.personalRoomCannotJoin);
        }

        const newUsers: string[] = [];
        for (const userId of usersArray) {
            if (chatRoom.user_ids.includes(userId) && !chatRoom.deleted_users.includes(userId)) {
                await transaction.rollback();
                return sendSuccessResponse(res, responseMessages.chatRoom.userAlreadyInRoom, { chat_room_id });
            }

            if (chatRoom.deleted_users.includes(userId)) {
                await chatRoomService.removeUserFromDeletedUsers(chat_room_id, userId, transaction);
                // Refresh room data after update
                const updatedRoom = await chatRoomService.findRoomById(chat_room_id, transaction);
                if (updatedRoom) {
                    Object.assign(chatRoom, updatedRoom);
                }
            }

            if (!chatRoom.user_ids.includes(userId)) {
                newUsers.push(userId);
            }
        }

        const updatedUserIds = [...chatRoom.user_ids, ...newUsers];
        await chatRoomService.updateChatRoom(chat_room_id, {
            user_ids: updatedUserIds,
            updated_by: authenticatedUser?.id || null,
        } as any, transaction);

        await transaction.commit();

        if (newUsers.length > 0) {
            for (const userId of newUsers) {
                emitUserJoined(chat_room_id, userId);
            }
            await emitRoomUpdated(chat_room_id);
        }

        return sendSuccessResponse(res, responseMessages.chatRoom.userJoined, { chat_room_id });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error joining chat room: ${error}`);
        sendServerErrorResponse(res, responseMessages.chatRoom.failedToUpdate, error);
        next(error);
    }
};

export const updateChatRoom = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const { room_id } = req.params;
        const { name, profile_image } = req.body;

        const chatRoom = await chatRoomService.findRoomByIdActive(room_id, transaction);
        if (!chatRoom) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.chatRoom.notFound);
        }

        const isGroupRoom = chatRoom.is_personal === false && (chatRoom.event_id === null || chatRoom.event_id === '');
        if (!isGroupRoom) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.chatRoom.groupOnlyUpdateAllowed);
        }

        const userInRoom = await chatRoomService.checkUserInRoom(room_id, authenticatedUserId, transaction);
        if (!userInRoom) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.message.userNotInRoom);
        }

        if (chatRoom.deleted_users?.includes(authenticatedUserId)) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.chatRoom.userAlreadyDeleted);
        }

        const updateData: any = { updated_by: authenticatedUserId || null };
        if (name !== undefined) {
            updateData.name = name;
        }
        if (profile_image !== undefined) {
            updateData.profile_image = profile_image;
        }
        
        await ChatRoom.update(
          {
            name: name ?? chatRoom.name,
            updated_by: authenticatedUserId || null,
            profile_image: profile_image ?? chatRoom.profile_image,
          },
          {
            where: { id: room_id, is_deleted: false },
            transaction,
          },
        );

        await transaction.commit();

        await emitRoomUpdated(room_id);

        const roomInfo = await chatRoomService.getRoomInfoWithUsersAndLastMessage(
            room_id,
            chatRoom.user_ids,
            chatRoom.deleted_users || []
        );

        return sendSuccessResponse(res, responseMessages.chatRoom.updated, roomInfo);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating chat room: ${error}`);
        sendServerErrorResponse(res, responseMessages.chatRoom.failedToUpdate, error);
        next(error);
    }
};

/** GET API: Get Room By Id API */
export const getRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { room_id } = req.params;

        const room = await chatRoomService.findRoomByIdActive(room_id);
        if (!room) {
            return sendNotFoundResponse(res, responseMessages.chatRoom.notFound);
        }

        const roomInfo = await chatRoomService.getRoomInfoWithUsersAndLastMessage(room_id, room.user_ids, room.deleted_users);

        return sendSuccessResponse(res, responseMessages.chatRoom.retrieved, roomInfo);
    } catch (error) {
        loggerService.error(`Error getting chat room: ${error}`);
        sendServerErrorResponse(res, responseMessages.chatRoom.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get Room by Event Id */
export const getRoomByEventId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { event_id } = req.params;

        const room = await chatRoomService.findRoomByEventId(event_id);
        if (!room) {
            return sendNotFoundResponse(res, responseMessages.chatRoom.notFound);
        }

        const roomInfo = await chatRoomService.getRoomInfoWithUsersAndLastMessage(room.id, room.user_ids, room.deleted_users)

        return sendSuccessResponse(res, responseMessages.chatRoom.retrieved, roomInfo);
    } catch (error) {
        loggerService.error(`Error getting chat room by event ID: ${error}`);
        sendServerErrorResponse(res, responseMessages.chatRoom.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get unread message count for all rooms (authenticated user) */
export const getUnreadCountsAllRooms = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const result = await chatRoomService.getUnreadCountsForAllRooms(authenticatedUserId);
        return sendSuccessResponse(res, responseMessages.chatRoom.unreadCountsRetrieved, result);
    } catch (error) {
        loggerService.error(`Error getting unread counts for all rooms: ${error}`);
        sendServerErrorResponse(res, responseMessages.chatRoom.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get conversation By user Id API */
export const getAllRooms = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const { page, limit, search } = req.query;

        // Fetch filtered chat rooms with pagination (filters applied at database level)
        const rooms = await chatRoomService.findAllRoomsByUserId(
            authenticatedUserId,
            Number(page) || 1,
            Number(limit) || 20,
            search as string
        );

        if (rooms.data.length === 0) {
            return sendSuccessResponse(res, responseMessages.chatRoom.notFoundAll, {
                data: [],
                pagination: rooms.pagination
            });
        }

        const chatRoomInfos = await Promise.all(
            rooms.data.map(async (room: ChatRoom) => {
                
                return await chatRoomService.getRoomInfoWithUsersAndLastMessage(room.id, room.user_ids, room.deleted_users || []);
            })
        );

        // Sort chatRoomInfos by lastMessageTime, or room by created_at
        const sortedRooms = chatRoomInfos.sort((a, b) => {
            const lastMessageTimeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : new Date(a.created_at).getTime();
            const lastMessageTimeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : new Date(b.created_at).getTime();

            return lastMessageTimeB - lastMessageTimeA;
        });

        if (sortedRooms.length === 0) {
            return sendSuccessResponse(res, responseMessages.chatRoom.notFoundAll, {
                data: [],
                pagination: rooms.pagination
            });
        }

        // Return sorted rooms with pagination (pagination is already correct from database query)
        return sendSuccessResponse(res, responseMessages.chatRoom.retrievedAll, {
            data: sortedRooms,
            pagination: rooms.pagination
        });
    } catch (error) {
        loggerService.error(`Error getting all chat rooms: ${error}`);
        sendServerErrorResponse(res, responseMessages.chatRoom.failedToFetch, error);
        next(error);
    }
};

/** DELETE API: Delete room API */
export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { room_id, user_id } = req.params;

        const room = await chatRoomService.findRoomByIdActive(room_id, transaction);
        if (!room) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.chatRoom.notFound);
        }

        const user = await chatRoomService.checkUserInRoom(room_id, user_id, transaction);
        if (!user) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.chatRoom.notFound);
        }

        const isUserDeleted = room.deleted_users?.includes(user_id);
        if (isUserDeleted) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.chatRoom.userAlreadyDeleted);
        }

        const updatedUserIds = Array.isArray(room.user_ids)
            ? room.user_ids.filter((id: string) => String(id) !== String(user_id))
            : room.user_ids;
        const updatedDeletedUsers = room.deleted_users ? [...room.deleted_users, String(user_id)] : [String(user_id)];
        await chatRoomService.updateChatRoom(room_id, {
            user_ids: updatedUserIds,
            deleted_users: updatedDeletedUsers,
            updated_by: authenticatedUser?.id || null,
        } as any, transaction);

        await emitRoomUpdated(room_id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.chatRoom.deleted);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting chat room: ${error}`);
        sendServerErrorResponse(res, responseMessages.chatRoom.failedToDelete, error);
        next(error);
    }
};

/** GET API: Get all room By userId API */
export const getRoomByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user_id } = req.params;
        const { page, limit, search, filter } = req.query;

        const results = await chatRoomService.findRoomsByUserId(
            user_id,
            Number(page) || 1,
            Number(limit) || 20,
            search as string,
            (filter as string) || 'all'
        );
        if (results.data.length === 0) {
            return sendSuccessResponse(res, responseMessages.chatRoom.notFoundAll, results);
        }

        const chatRoomInfos = await Promise.all(
            results.data.map(async (room: ChatRoom) => {
                
                return await chatRoomService.getRoomInfoWithUsersAndLastMessage(room.id, room.user_ids, room.deleted_users || []);
            })
        );

        return sendSuccessResponse(res, responseMessages.chatRoom.retrievedAll, {
            ...results,
            data: chatRoomInfos,
        });
    } catch (error) {
        loggerService.error(`Error getting chat rooms by user: ${error}`);
        sendServerErrorResponse(res, responseMessages.chatRoom.failedToFetch, error);
        next(error);
    }
};

/** POST API: Share in Chat API */
export const shareInChat = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUserId = res.locals.auth?.user?.id;
        const { peer_ids, send_entire_network, message, type, feed_id, event_id } = req.body;

        let targetUserIds: string[] = [];

        // Handle sharing to entire network
        if (send_entire_network === true) {
            const networkUserIds = await feedSharedService.getAllNetworkUserIds(authenticatedUserId);

            if (networkUserIds.length === 0) {
                await transaction.rollback();
                return sendBadRequestResponse(res, responseMessages.message.noUsersFoundInNetwork);
            }

            targetUserIds = networkUserIds;
        } else {
            // Handle multiple peer_ids (array)
            if (!peer_ids || !Array.isArray(peer_ids) || peer_ids.length === 0) {
                await transaction.rollback();
                return sendBadRequestResponse(res, responseMessages.message.peerIdsRequired);
            }

            // Filter out authenticated user's ID (cannot send to themselves)
            targetUserIds = peer_ids.filter((id: string) => id && id !== authenticatedUserId);

            if (targetUserIds.length === 0) {
                await transaction.rollback();
                return sendBadRequestResponse(res, responseMessages.message.noValidPeerIds);
            }
        }

        // Use service to share message in chat
        await messageService.shareInChat(authenticatedUserId, targetUserIds, message || null, type, feed_id || null, event_id || null, transaction);
        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.message.created);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error sharing in chat: ${error}`);
        sendServerErrorResponse(res, responseMessages.message.failedToCreate, error);
        next(error);
    }
};
