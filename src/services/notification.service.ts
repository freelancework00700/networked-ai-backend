import userService from './user.service';
import { IncludeOptions } from 'sequelize';
import chatRoomService from './chat-room.service';
import { Sequelize, Transaction } from 'sequelize';
import loggerService from '../utils/logger.service';
import { Notification } from '../models/notification.model';
import { NotificationType, EventPhase } from '../types/enums';
import { User, Event, Feed, FeedComment, RSVPRequest, EventAttendee, EventParticipant, ChatRoom, EventFeedback, EventQuestion, ProfileSubscription } from '../models';

/**
 * Get include options for notification queries with all associations
 * @param userId - User ID for filtering event-related data
 * @returns Include options array
 */
const getNotificationIncludes = (userId: string): IncludeOptions[] => {
    return [
        {
            model: Event,
            as: 'event',
            required: false,
            attributes: ['id', 'title', 'slug', 'description', 'image_url', 'thumbnail_url', 'address', 'start_date', 'end_date'],
            include: [
                {
                    model: RSVPRequest,
                    as: 'rsvp_requests',
                    required: false,
                    where: { 
                        is_deleted: false,
                        user_id: Sequelize.literal('`Notification`.`related_user_id` = `event->rsvp_requests`.`user_id`'),
                    },
                    attributes: ['id', 'status', 'user_id'],
                    include: [{
                        model: User,
                        as: 'user',
                        required: false,
                        where: { is_deleted: false },
                        attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
                    }],
                },
                {
                    model: EventFeedback,
                    as: 'feedbacks',
                    required: false,
                    where: { 
                        is_deleted: false,
                        user_id: userId,
                    },
                    attributes: ['id', 'question_id', 'answer_option_id', 'answer', 'created_at'],
                    include: [{
                        model: EventQuestion,
                        required: true,
                        as: 'question',
                        where: {
                            is_deleted: false,
                            event_phase: EventPhase.POST_EVENT,
                        },
                        attributes: [],
                    }],
                },
                // {
                //     model: EventAttendee,
                //     as: 'attendees',
                //     required: false,
                //     where: { 
                //         is_deleted: false,
                //     },
                //     attributes: ['id', 'rsvp_status', 'is_checked_in', 'is_incognito', 'name', 'parent_user_id', 'user_id'],
                //     include: [{
                //         model: User,
                //         as: 'user',
                //         required: false,
                //         where: { is_deleted: false },
                //         attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
                //     }],
                // },
                // {
                //     model: EventParticipant,
                //     as: 'participants',
                //     required: false,
                //     where: { 
                //         is_deleted: false,
                //     },
                //     attributes: ['id', 'role', 'user_id'],
                //     include: [{
                //         model: User,
                //         as: 'user',
                //         required: false,
                //         where: { is_deleted: false },
                //         attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
                //     }],
                // },
            ],
        },
        {
            model: Feed,
            as: 'feed',
            required: false,
            attributes: ['id', 'content', 'user_id'],
        },
        {
            model: FeedComment,
            as: 'comment',
            required: false,
            attributes: ['id', 'comment', 'feed_id'],
        },
        {
            model: User,
            as: 'related_user',
            required: false,
            attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
        },
        {
            model: ChatRoom,
            as: 'chat_room',
            required: false,
            attributes: ['id', 'name', 'is_personal', 'event_id', 'user_ids', 'deleted_users', 'profile_image', 'event_image', 'is_broadcast', 'created_at'],
        },
    ];
};

/**
 * Attach full chat room (users, last message, etc.) to notifications that have chat_room_id
 * @param notifications - Array of notifications (plain or model instances)
 * @param transaction - Optional database transaction
 */
const addFullChatRoomToNotifications = async (notifications: any[], transaction?: Transaction): Promise<void> => {
    const withChatRoom = notifications.filter((n: any) => n.chat_room_id && (n.chat_room?.user_ids != null || n.dataValues?.chat_room?.user_ids != null));
    if (withChatRoom.length === 0) return;
    for (const notification of withChatRoom) {
        try {
            const chatRoom = notification.chat_room || notification.dataValues?.chat_room;
            const roomId = notification.chat_room_id || notification.dataValues?.chat_room_id;
            if (!chatRoom || !roomId) continue;
            const userIds = chatRoom.user_ids || [];
            const deletedUsers = chatRoom.deleted_users || [];
            const fullRoom = await chatRoomService.getRoomInfoWithUsersAndLastMessage(roomId, userIds, deletedUsers, transaction);
            if (fullRoom) {
                if (typeof notification.setDataValue === 'function') {
                    notification.setDataValue('chat_room', fullRoom);
                } else {
                    notification.chat_room = fullRoom;
                }
            }
        } catch (err: any) {
            loggerService.error(`Error attaching full chat room to notification: ${err?.message || err}`);
        }
    }
};

/**
 * Add connection status to related_users in notifications
 * @param notifications - Array of notifications
 * @param userId - Authenticated user ID
 * @param transaction - Optional database transaction
 */
const addConnectionStatusToNotifications = async (notifications: Notification[], userId: string, transaction?: Transaction): Promise<void> => {
    const relatedUsers = notifications
        .map((notification: any) => notification.related_user)
        .filter((user: User | null) => user !== null);

    if (relatedUsers.length > 0) {
        // Ensure we work with plain objects so connection_status is reliably attached
        const relatedUsersPlain = relatedUsers.map((u: any) => (u?.toJSON ? u.toJSON() : u));
        const usersWithStatus = await userService.addConnectionStatusToUsers(relatedUsersPlain as any, userId, true, transaction);

        // Create a map for quick lookup
        const userStatusMap = new Map<string, any>();
        usersWithStatus.forEach((u: any) => {
            if (u?.id) {
                userStatusMap.set(u.id, u.connection_status);
            }
        });

        // Add connection status to each notification's related_user
        notifications.forEach((notification: any) => {
            if (notification.related_user && notification.related_user.id) {
                const connectionStatus = userStatusMap.get(notification.related_user.id);
                if (connectionStatus !== undefined) {
                    const updatedRelatedUser = {
                        ...(notification.related_user.toJSON ? notification.related_user.toJSON() : notification.related_user),
                        connection_status: connectionStatus,
                    };

                    // Ensure it is included when Sequelize instance is serialized (toJSON uses dataValues)
                    if (typeof notification.setDataValue === 'function') {
                        notification.setDataValue('related_user', updatedRelatedUser);
                    }
                    notification.related_user = updatedRelatedUser;
                }
            }
        });
    }
};

export const sendRsvpConfirmationNotificationToGuest = async (event: Event, guestId: string, transaction?: Transaction): Promise<Notification | null> => {
    try {
        if (!guestId) {
            loggerService.info(`Skipping RSVP confirmation notification (guest): no guestId. Event ID=${event.id}`);
            return null;
        }

        const title = 'RSVP Confirmation';
        const body = `RSVP Confirmation for ${event.title}`;

        const notification = await Notification.create(
            {
                body,
                title,
                user_id: guestId,
                event_id: event.id,
                type: NotificationType.EVENTS,
            },
            { transaction }
        );

        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating RSVP confirmation notification (guest): ${error.message || error}`);
        return null;
    }
};

export const sendRsvpConfirmationNotificationToHost = async (event: Event, hostId: string, guestId: string, guestName: string, transaction?: Transaction): Promise<Notification | null> => {
    try {
        if (!hostId) {
            loggerService.info(`Skipping RSVP confirmation notification (host): no hostId. Event ID=${event.id}`);
            return null;
        }

        const title = 'New RSVP';
        const body = `${guestName || 'Someone'} RSVP'd to ${event.title}`;

        const notification = await Notification.create(
            {
                body,
                title,
                user_id: hostId,
                event_id: event.id,
                related_user_id: guestId || null,
                type: NotificationType.MY_EVENTS,
            },
            { transaction }
        );

        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating RSVP confirmation notification (host): ${error.message || error}`);
        return null;
    }
};

export const sendRsvpRequestNotificationToHost = async (event: Event, hostId: string, requesterId: string, requesterName: string, transaction?: Transaction): Promise<Notification | null> => {
    try {
        if (!hostId) {
            loggerService.info(`Skipping RSVP request notification: no hostId. Event ID=${event.id}`);
            return null;
        }

        const title = 'New RSVP Request';
        const body = `${requesterName} requested to RSVP for '${event.title}'.`;

        const notification = await Notification.create(
            {
                body,
                title,
                user_id: hostId,
                event_id: event.id,
                related_user_id: requesterId || null,
                type: NotificationType.RSVP_REQUEST,
            },
            { transaction }
        );

        loggerService.info(`RSVP request notification created for event ${event.id} to host ${hostId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating RSVP request notification: ${error.message}`);
        return null;
    }
};

export const sendRsvpRequestDecisionNotificationToRequester = async (event: Event, requesterId: string, isApproved: boolean, hostId: string, hostName: string, transaction?: Transaction): Promise<Notification | null> => {
    try {
        if (!requesterId) {
            loggerService.info(`Skipping RSVP decision notification: no requesterId. Event ID=${event.id}`);
            return null;
        }

        const title = isApproved ? 'RSVP Approved' : 'RSVP Rejected';
        const body = `${hostName} ${isApproved ? 'approved' : 'rejected'} your RSVP request for '${event.title}'.`;

        const notification = await Notification.create(
            {
                body,
                title,
                event_id: event.id,
                user_id: requesterId,
                related_user_id: hostId || null,
                type: NotificationType.RSVP_REQUEST_STATUS,
            },
            { transaction }
        );

        loggerService.info(`RSVP decision notification created for event ${event.id} to requester ${requesterId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating RSVP decision notification: ${error.message}`);
        return null;
    }
};

export const sendNetworkRequestAcceptedNotification = async (originalSenderId: string, accepterId: string, accepterName: string, transaction?: Transaction): Promise<Notification | null> => {
    try {
        if (!originalSenderId) {
            loggerService.info('Skipping network request accepted notification: no originalSenderId');
            return null;
        }

        const title = 'Request Accepted';
        const body = `${accepterName} accepted your network request.`;

        const notification = await Notification.create(
            {
                body,
                title,
                user_id: originalSenderId,
                type: NotificationType.NETWORK,
                related_user_id: accepterId || null,
            },
            { transaction }
        );

        loggerService.info(`Network request accepted notification created for sender ${originalSenderId} by accepter ${accepterId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating network request accepted notification: ${error.message}`);
        return null;
    }
};

export const sendNetworkRequestNotification = async (receiverId: string, senderId: string, senderName: string, transaction?: Transaction): Promise<Notification | null> => {
    try {
        if (!receiverId) {
            loggerService.info('Skipping network request notification: no receiverId');
            return null;
        }

        const title = 'New Network Request';
        const body = `${senderName} sent you a network request.`;

        const notification = await Notification.create(
            {
                body,
                title,
                user_id: receiverId,
                type: NotificationType.NETWORK,
                related_user_id: senderId || null,
            },
            { transaction }
        );

        loggerService.info(`Network request notification created for receiver ${receiverId} from sender ${senderId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating network request notification: ${error.message}`);
        return null;
    }
};

export const sendEventRoleAssignmentNotification = async (event: Event, userId: string, role: string, transaction?: Transaction): Promise<Notification | null> => {
    try {
        if (!userId) {
            loggerService.info(`Skipping event role assignment notification: no userId. Event ID=${event.id}`);
            return null;
        }

        const title = 'Role Assigned';
        const body = `You've been assigned as ${role} for '${event.title}'.`;

        const notification = await Notification.create(
            {
                body,
                title,
                user_id: userId,
                event_id: event.id,
                type: NotificationType.MY_EVENTS,
            },
            { transaction }
        );

        loggerService.info(`Event role assignment notification created for event ${event.id} to user ${userId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating event role assignment notification: ${error.message}`);
        return null;
    }
};

export const sendEventRoleRemovalNotification = async (event: Event, userId: string, transaction?: Transaction): Promise<Notification | null> => {
    try {
        if (!userId) {
            loggerService.info(`Skipping event role removal notification: no userId. Event ID=${event.id}`);
            return null;
        }

        const title = 'Role Removed';
        const body = `You've been removed from '${event.title}'.`;

        const notification = await Notification.create(
            {
                body,
                title,
                user_id: userId,
                event_id: event.id,
                type: NotificationType.MY_EVENTS,
            },
            { transaction }
        );

        loggerService.info(`Event role removal notification created for event ${event.id} to user ${userId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating event role removal notification: ${error.message}`);
        return null;
    }
};

/**
 * Fetch a single notification with all associations and connection status
 * @param notificationId - Notification ID
 * @param userId - User ID for filtering and connection status
 * @param transaction - Optional database transaction
 * @returns Notification with all associations and connection status
 */
export const getNotificationWithAssociations = async (notificationId: string, userId: string, transaction?: Transaction) => {
    try {
        const notification = await Notification.findByPk(notificationId, { include: getNotificationIncludes(userId), transaction });

        if (!notification) {
            loggerService.warn(`Notification ${notificationId} not found when fetching with associations`);
            return null;
        }

        // Add connection status to related_user if exists
        await addConnectionStatusToNotifications([notification], userId, transaction);

        // Attach full chat room when chat_room_id is present
        await addFullChatRoomToNotifications([notification], transaction);

        return notification;
    } catch (error: any) {
        loggerService.error(`Error fetching notification with associations: ${error.message || error}`);
        throw error;
    }
};

/**
 * Get all notifications for a user with pagination
 * @param userId - User ID to get notifications for
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @param type - Optional filter by notification type
 * @param isRead - Optional filter by read status (if false, returns only unread notifications)
 */
export const getNotificationsPaginated = async (
    userId: string,
    page: number = 1,
    limit: number = 10,
    type?: NotificationType,
    isRead?: boolean
) => {
    const whereClause: any = {
        user_id: userId,
        is_deleted: false,
    };

    if (type) {
        whereClause.type = type;
    }

    // If is_read is false, filter for unread notifications (is_read = false)
    // If is_read is true, filter for read notifications (is_read = true)
    // If is_read is undefined, return all notifications (no filter)
    if (isRead !== undefined) {
        whereClause.is_read = isRead;
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: notifications } = await Notification.findAndCountAll({
        where: whereClause,
        include: getNotificationIncludes(userId),
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        distinct: true,
    });

    // Add connection status to related_users
    await addConnectionStatusToNotifications(notifications, userId);

    // Attach full chat room to notifications that have chat_room_id
    await addFullChatRoomToNotifications(notifications);

    return {
        data: notifications,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
            limit: Number(limit),
        },
    };
};

/**
 * Mark a single notification as read
 * @param notificationId - Notification ID
 * @param userId - User ID (to ensure user owns the notification)
 */
export const markNotificationAsRead = async (notificationId: string, userId: string) => {
    const notification = await Notification.findOne({
        where: {
            id: notificationId,
            user_id: userId,
            is_deleted: false,
        },
    });

    if (!notification) {
        return null;
    }

    if (!notification.is_read) {
        notification.is_read = true;
        notification.read_at = new Date();
        await notification.save();
    }

    return notification;
};

/**
 * Mark all notifications as read for a user
 * @param userId - User ID
 */
export const markAllNotificationsAsRead = async (userId: string) => {
    const [affectedRows] = await Notification.update(
        {
            is_read: true,
            read_at: new Date(),
        },
        {
            where: {
                user_id: userId,
                is_read: false,
                is_deleted: false,
            },
        }
    );

    return { updatedCount: affectedRows };
};

/**
 * Get unread notification count for a user
 * @param userId - User ID
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
    return await Notification.count({
        where: {
            user_id: userId,
            is_read: false,
            is_deleted: false,
        },
    });
};

/**
 * Create a notification for event creation
 * @param event - Event instance with created_by_user association loaded
 * @param transaction - Optional database transaction
 * @returns Created notification or null if creator not found
 */
export const sendEventCreationNotification = async (event: Event, transaction?: Transaction): Promise<Notification | null> => {
    try {
        const creatorId = (event as any)?.created_by_user?.id ?? (event as any)?.created_by ?? null;

        if (!creatorId) {
            loggerService.info(`Skipping event creation notification: no creator found. Event ID=${event.id}`);
            return null;
        }

        const title = 'Event Created Successfully';
        const body = `Your event '${event.title}' has been successfully created.`;

        const notification = await Notification.create(
            {
                body,
                title,
                event_id: event.id,
                user_id: creatorId,
                type: NotificationType.MY_EVENTS,
            },
            { transaction }
        );

        loggerService.info(`Event creation notification created for event ${event.id} to user ${creatorId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating event creation notification: ${error.message}`);
        throw error;
    }
};

export const sendPublicEventCreationNotificationToSubscribers = async (event: Event, transaction?: Transaction): Promise<Notification[]> => {
    try {
        const hostId = (event as any)?.created_by_user?.id ?? (event as any)?.created_by ?? null;
        if (!hostId) {
            loggerService.info(`Skipping subscriber notification: no event host. Event ID=${event.id}`);
            return [];
        }

        const hostName = (event as any)?.created_by_user?.name ?? (event as any)?.created_by_user?.username ?? 'Someone';

        const subscriptions = await ProfileSubscription.findAll({
            where: { peer_id: hostId },
            attributes: ['user_id'],
            transaction,
        });

        const subscriberIds = [...new Set(subscriptions.map((s) => s.user_id).filter(Boolean))];
        if (subscriberIds.length === 0) {
            loggerService.info(`No profile subscribers for host ${hostId}, event ${event.id}`);
            return [];
        }

        const title = 'New event created';
        const body = `${hostName} created a new event: ${event.title}`;

        const notificationPayload = subscriberIds.map((userId) => ({
            body,
            title,
            event_id: event.id,
            user_id: userId,
            host_id: hostId,
            type: NotificationType.EVENTS,
        }));

        const notifications = await Notification.bulkCreate(
            notificationPayload,
            { transaction, individualHooks: true }
        );

        loggerService.info(`Public event creation notifications sent to ${notifications.length} subscribers for event ${event.id}`);
        return notifications;
    } catch (error: any) {
        loggerService.error(`Error sending public event creation notifications to subscribers: ${error.message}`);
        return [];
    }
};

/**
 * Get all user IDs for event participants (host, participants, attendees)
 * @param eventId - Event ID
 * @param transaction - Optional database transaction
 * @returns Array of user IDs
 */
const getEventParticipantUserIds = async (eventId: string, transaction?: Transaction): Promise<string[]> => {
    try {
        const userIds: string[] = [];

        // Get all participants (co-host, sponsor, speaker, staff, host)
        const participants = await EventParticipant.findAll({
            where: {
                event_id: eventId,
                is_deleted: false,
            },
            attributes: ['user_id'],
            transaction,
        });

        for (const participant of participants) {
            const userId = (participant as any).user_id;
            if (userId) {
                userIds.push(userId);
            }
        }

        // Get all attendees
        const attendees = await EventAttendee.findAll({
            where: {
                event_id: eventId,
                is_deleted: false,
            },
            attributes: ['user_id'],
            transaction,
        });

        for (const attendee of attendees) {
            const userId = (attendee as any).user_id;
            if (userId) {
                userIds.push(userId);
            }
        }

        // Remove duplicates
        return [...new Set(userIds.filter(id => id && id.trim() !== ''))];
    } catch (error: any) {
        loggerService.error(`Error getting event participant user IDs: ${error.message}`);
        return [];
    }
};

/**
 * Create notifications for event deletion to all participants
 * @param event - Event instance with created_by_user association loaded
 * @param transaction - Optional database transaction
 * @returns Array of created notifications
 */
export const sendEventDeletionNotification = async (event: Event, transaction?: Transaction): Promise<Notification[]> => {
    try {
        // Get all participant user IDs (host, participants, attendees)
        const participantUserIds = await getEventParticipantUserIds(event.id, transaction);

        if (participantUserIds.length === 0) {
            loggerService.warn(`No recipients found for event deletion notification: ${event.id}`);
            return [];
        }

        const title = 'Event Deleted';
        const body = `The event '${event.title}' has been cancelled.`;

        // Create notifications for all participants
        const notifications = await Promise.all(
            participantUserIds.map(userId =>
                Notification.create(
                    {
                        body,
                        title,
                        user_id: userId,
                        event_id: event.id,
                        type: NotificationType.MY_EVENTS,
                    },
                    { transaction }
                )
            )
        );

        loggerService.info(`Event deletion notifications created for event ${event.id} to ${notifications.length} users`);
        return notifications;
    } catch (error: any) {
        loggerService.error(`Error creating event deletion notifications: ${error.message}`);
        throw error;
    }
};

/**
 * Create notifications for event update to all participants
 * @param event - Event instance with created_by_user association loaded
 * @param transaction - Optional database transaction
 * @returns Array of created notifications
 */
export const sendEventUpdatedNotification = async (event: Event, changedFields?: string[], transaction?: Transaction): Promise<Notification[]> => {
    try {
        // Get all participant user IDs (host, participants, attendees)
        const participantUserIds = await getEventParticipantUserIds(event.id, transaction);

        if (participantUserIds.length === 0) {
            loggerService.warn(`No recipients found for event update notification: ${event.id}`);
            return [];
        }

        const title = 'Event Updated';
        const body = `Event '${event.title}' updated. Changes: ${changedFields?.join(', ')}.`;

        // Create notifications for all participants
        const notifications = await Promise.all(
            participantUserIds.map(userId =>
                Notification.create(
                    {
                        body,
                        title,
                        user_id: userId,
                        event_id: event.id,
                        type: NotificationType.MY_EVENTS,
                    },
                    { transaction }
                )
            )
        );

        loggerService.info(`Event update notifications created for event ${event.id} to ${notifications.length} users`);
        return notifications;
    } catch (error: any) {
        loggerService.error(`Error creating event update notifications: ${error.message}`);
        throw error;
    }
};

export const sendMessageNotification = async (senderName: string, senderId: string, chatRoomId: string, messageId: string, messageText: string | null, messageType: string, transaction?: Transaction): Promise<Notification[]> => {
    try {
        // Get chat room to find all users
        const chatRoom = await ChatRoom.findByPk(chatRoomId, { transaction });
        
        if (!chatRoom || !chatRoom.user_ids || chatRoom.user_ids.length === 0) {
            return [];
        }

        // Filter out the sender and deleted users
        const recipientUserIds = chatRoom.user_ids.filter(
            (userId: string) => userId !== senderId && !chatRoom.deleted_users?.includes(userId)
        );

        if (recipientUserIds.length === 0) {
            return [];
        }

        // Determine notification title and body based on message type
        let title = 'New Message';
        let body = `${senderName} sent you a message.`;
        
        if (messageType === 'Post') {
            title = 'New Post Shared';
            body = `${senderName} shared a post with you.`;
        } else if (messageType === 'Event') {
            title = 'New Event Shared';
            body = `${senderName} shared an event with you.`;
        } else if (messageText) {
            // Truncate message text if too long
            const truncatedMessage = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;
            body = `${senderName}: ${truncatedMessage}`;
        }

        // Create notifications for all recipients
        const notifications = await Promise.all(
            recipientUserIds.map((userId: string) =>
                Notification.create(
                    {
                        body,
                        title,
                        user_id: userId,
                        chat_room_id: chatRoomId,
                        related_user_id: senderId,
                        type: NotificationType.NETWORK,
                    },
                    { transaction }
                )
            )
        );

        loggerService.info(`Message notifications created for message ${messageId} in room ${chatRoomId} to ${notifications.length} users`);
        return notifications;
    } catch (error: any) {
        loggerService.error(`Error creating message notifications: ${error.message}`);
        return [];
    }
};

/** Notify post owner when someone likes their post */
export const sendPostLikedNotification = async (
    postOwnerId: string,
    likerId: string,
    likerName: string,
    postId: string,
    transaction?: Transaction,
    postContent?: string | null
): Promise<Notification | null> => {
    try {
        if (!postOwnerId || postOwnerId === likerId) return null;
        const title = 'Post liked';
        let body = `${likerName} liked your post.`;
        if (postContent != null && String(postContent).trim()) body += ` : ${String(postContent).trim()}`;
        const notification = await Notification.create(
            { body, title, user_id: postOwnerId, type: NotificationType.POST_LIKED, post_id: postId, related_user_id: likerId },
            { transaction }
        );
        loggerService.info(`Post liked notification created for post ${postId} to user ${postOwnerId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating post liked notification: ${error.message}`);
        return null;
    }
};

/** Notify comment author when someone likes their comment */
export const sendCommentLikedNotification = async (
    commentAuthorId: string,
    likerId: string,
    likerName: string,
    commentId: string,
    postId: string,
    transaction?: Transaction,
    commentContent?: string | null
): Promise<Notification | null> => {
    try {
        if (!commentAuthorId || commentAuthorId === likerId) return null;
        const title = 'Comment liked';
        let body = `${likerName} liked your comment.`;
        if (commentContent != null && String(commentContent).trim()) body += ` : ${String(commentContent).trim()}`;
        const notification = await Notification.create(
            { body, title, user_id: commentAuthorId, type: NotificationType.COMMENT_LIKED, post_id: postId, comment_id: commentId, related_user_id: likerId },
            { transaction }
        );
        loggerService.info(`Comment liked notification created for comment ${commentId} to user ${commentAuthorId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating comment liked notification: ${error.message}`);
        return null;
    }
};

/** Notify parent comment author when someone replies to their comment */
export const sendCommentReplyNotification = async (
    parentCommentAuthorId: string,
    replierId: string,
    replierName: string,
    commentId: string,
    postId: string,
    transaction?: Transaction,
    replyContent?: string | null
): Promise<Notification | null> => {
    try {
        if (!parentCommentAuthorId || parentCommentAuthorId === replierId) return null;
        const title = 'New reply';
        let body = `${replierName} replied to your comment.`;
        if (replyContent != null && String(replyContent).trim()) body += ` : ${String(replyContent).trim()}`;
        const notification = await Notification.create(
            { body, title, user_id: parentCommentAuthorId, type: NotificationType.COMMENT_REPLY, post_id: postId, comment_id: commentId, related_user_id: replierId },
            { transaction }
        );
        loggerService.info(`Comment reply notification created for comment ${commentId} to user ${parentCommentAuthorId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating comment reply notification: ${error.message}`);
        return null;
    }
};

/** Notify post owner when someone comments on their post (top-level comment only) */
export const sendPostCommentedNotification = async (
    postOwnerId: string,
    commenterId: string,
    commenterName: string,
    postId: string,
    commentId: string,
    transaction?: Transaction,
    commentContent?: string | null
): Promise<Notification | null> => {
    try {
        if (!postOwnerId || postOwnerId === commenterId) return null;
        const title = 'New comment';
        let body = `${commenterName} commented on your post.`;
        if (commentContent != null && String(commentContent).trim()) body += ` : ${String(commentContent).trim()}`;
        const notification = await Notification.create(
            { body, title, user_id: postOwnerId, type: NotificationType.POST_COMMENTED, post_id: postId, comment_id: commentId, related_user_id: commenterId },
            { transaction }
        );
        loggerService.info(`Post commented notification created for post ${postId} to user ${postOwnerId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating post commented notification: ${error.message}`);
        return null;
    }
};

/** Notify user when someone mentions them on a post or comment */
export const sendMentionNotification = async (
    mentionedUserId: string,
    mentionerId: string,
    mentionerName: string,
    postId: string,
    commentId: string | null,
    transaction?: Transaction,
    contentSnippet?: string | null
): Promise<Notification | null> => {
    try {
        if (!mentionedUserId || mentionedUserId === mentionerId) return null;
        const title = 'You were mentioned';
        let body = commentId ? `${mentionerName} mentioned you in a comment.` : `${mentionerName} mentioned you in a post.`;
        if (contentSnippet != null && String(contentSnippet).trim()) body += ` : ${String(contentSnippet).trim()}`;
        const notification = await Notification.create(
            { body, title, user_id: mentionedUserId, type: NotificationType.MENTION, post_id: postId, comment_id: commentId, related_user_id: mentionerId },
            { transaction }
        );
        loggerService.info(`Mention notification created for user ${mentionedUserId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error creating mention notification: ${error.message}`);
        return null;
    }
};

/**
 * Notify all participants when a group chat room is created.
 * @param roomId - Chat room ID
 * @param participantUserIds - All user IDs in the room (including creator)
 * @param roomName - Display name of the room
 * @param createdById - User ID who created the room
 * @param createdByName - Display name of the creator
 * @param transaction - Optional transaction
 */
export const sendChatRoomCreatedNotification = async (
    roomId: string,
    participantUserIds: string[],
    roomName: string | null,
    createdById: string | null,
    createdByName: string | null,
    transaction?: Transaction
): Promise<Notification[]> => {
    try {
        if (!participantUserIds || participantUserIds.length === 0) return [];
        const title = 'New group chat';
        const body = createdByName
            ? `${createdByName} created a group "${roomName || 'Chat'}" and added you.`
            : `You were added to group "${roomName || 'Chat'}".`;
        const notifications = await Promise.all(
            participantUserIds.map((userId: string) =>
                Notification.create(
                    {
                        body,
                        title,
                        user_id: userId,
                        chat_room_id: roomId,
                        related_user_id: createdById,
                        type: NotificationType.CHAT_ROOM_CREATED,
                    },
                    { transaction }
                )
            )
        );
        loggerService.info(`Chat room created notifications sent to ${notifications.length} participants`);
        return notifications;
    } catch (error: any) {
        loggerService.error(`Error sending chat room created notifications: ${error.message}`);
        return [];
    }
};

/**
 * Notify a user when they are added to an existing group chat.
 * @param roomId - Chat room ID
 * @param newMemberUserId - User ID who was added
 * @param roomName - Display name of the room
 * @param addedById - User ID who added the member
 * @param addedByName - Display name of the user who added
 * @param transaction - Optional transaction
 */
export const sendChatRoomMemberAddedNotification = async (
    roomId: string,
    newMemberUserId: string,
    roomName: string | null,
    addedById: string | null,
    addedByName: string | null,
    transaction?: Transaction
): Promise<Notification | null> => {
    try {
        if (!newMemberUserId) return null;
        const title = 'Added to group';
        const body = addedByName
            ? `${addedByName} added you to group "${roomName || 'Chat'}".`
            : `You were added to group "${roomName || 'Chat'}".`;
        const notification = await Notification.create(
            {
                body,
                title,
                user_id: newMemberUserId,
                chat_room_id: roomId,
                related_user_id: addedById,
                type: NotificationType.CHAT_ROOM_MEMBER_ADDED,
            },
            { transaction }
        );
        loggerService.info(`Chat room member added notification sent to ${newMemberUserId}`);
        return notification;
    } catch (error: any) {
        loggerService.error(`Error sending chat room member added notification: ${error.message}`);
        return null;
    }
};

const notificationService = {
    markNotificationAsRead,
    sendMessageNotification,
    sendMentionNotification,
    sendPostLikedNotification,
    getNotificationsPaginated,
    markAllNotificationsAsRead,
    getUnreadNotificationCount,
    sendCommentLikedNotification,
    sendEventUpdatedNotification,
    sendCommentReplyNotification,
    sendEventCreationNotification,
    sendPublicEventCreationNotificationToSubscribers,
    sendEventDeletionNotification,
    sendPostCommentedNotification,
    sendNetworkRequestNotification,
    getNotificationWithAssociations,
    sendChatRoomCreatedNotification,
    sendEventRoleRemovalNotification,
    sendRsvpRequestNotificationToHost,
    sendChatRoomMemberAddedNotification,
    sendEventRoleAssignmentNotification,
    sendNetworkRequestAcceptedNotification,
    sendRsvpConfirmationNotificationToHost,
    sendRsvpConfirmationNotificationToGuest,
    sendRsvpRequestDecisionNotificationToRequester,
};

export default notificationService;
