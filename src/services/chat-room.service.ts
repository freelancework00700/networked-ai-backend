import { col, fn, literal, Op, Transaction } from 'sequelize';
import { ChatMessage } from '../models/chat-message.model';
import { ChatRoom } from '../models/chat-room.model';
import { Event, User } from '../models/index';
import { RoomCreated } from '../socket/interfaces';
import { ChatRoomFilter } from '../types/enums';
import messageService from './message.service';
import loggerService from '../utils/logger.service';

const eventAttributes = ['id', 'title', 'slug', 'description', 'address', 'start_date', 'end_date', 'is_public', 'thumbnail_url', 'image_url'];
const userAttributes = ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url', 'mobile', 'company_name', 'total_gamification_points', 'total_gamification_points_weekly'];

/** Get users by user IDs */
const getUsersByUserIds = async (userIds: string[]) => {
    if (!userIds || userIds.length === 0) {
        return [];
    }

    return await User.findAll({
        where: {
            id: userIds,
            is_deleted: false
        },
        attributes: userAttributes
    });
};

/** Check if room exists by event_id */
const findRoomByEventId = async (eventId: string, transaction?: Transaction) => {
    return await ChatRoom.findOne({
        include: [
            {
                model: Event,
                as: 'event',
                attributes: eventAttributes,
                required: false,
                where: { is_deleted: false },
            },
        ],
        where: { event_id: eventId, is_deleted: false },
        transaction
    });
};

/** Check if room exists with same users and type */
const findExistingRoom = async (
    userIds: string[],
    isPersonal: boolean,
    name?: string | null,
    transaction?: Transaction
) => {
    const userIdsString = JSON.stringify(userIds);

    const whereCondition: any = {
        [Op.and]: [
            literal(`JSON_CONTAINS(user_ids, '${userIdsString}')`),
            { is_personal: isPersonal },
            { is_deleted: false }
        ]
    };

    if (!isPersonal && name) {
        whereCondition[Op.and].push({ name });
    }

    const chatRooms = await ChatRoom.findAll({ where: whereCondition, transaction });

    for (const room of chatRooms) {
        if (room.user_ids.length === userIds.length &&
            room.user_ids.every(id => userIds.includes(id)) &&
            (isPersonal || room.name === name)) {
            return room;
        }
    }

    return null;
};

/** Create chat room */
const createChatRoom = async (
    data: RoomCreated,
    transaction?: Transaction
) => {
    return await ChatRoom.create(data, { transaction });
};

/** Find room by ID */
const findRoomById = async (roomId: string, transaction?: Transaction) => {
    return await ChatRoom.findByPk(roomId, { transaction });
};

/** Find room by ID with is_deleted check */
const findRoomByIdActive = async (roomId: string, transaction?: Transaction) => {
    return await ChatRoom.findOne({
        where: { id: roomId, is_deleted: false },
        include: [
            {
                model: User,
                as: 'created_by_user',
                attributes: userAttributes,
                required: false,
                where: { is_deleted: false },
            },
            {
                model: Event,
                as: 'event',
                attributes: eventAttributes,
                required: false,
                where: { is_deleted: false },
            },
        ],
        transaction
    });
};

/** Find broadcast room by owner */
const findBroadcastRoomByOwner = async (broadcastOwner: string, transaction?: Transaction) => {
    return await ChatRoom.findOne({
        where: { is_broadcast: true, broadcast_owner: broadcastOwner, is_deleted: false },
        transaction
    });
};

/** Update chat room */
const updateChatRoom = async (
    roomId: string,
    data: RoomCreated,
    transaction?: Transaction
) => {
    await ChatRoom.update(data, { where: { id: roomId, is_deleted: false }, transaction });
    return await ChatRoom.findOne({ where: { id: roomId, is_deleted: false }, transaction });
};

/** Check if user is in room */
const checkUserInRoom = async (roomId: string, userId: string, transaction?: Transaction) => {
    return await ChatRoom.findOne({
        where: {
            id: roomId,
            [Op.and]: [
                literal(`JSON_CONTAINS(user_ids, '\"${userId}\"')`),
                { is_deleted: false }
            ]
        },
        transaction
    });
};

/** Get all rooms with pagination */
const findAllRooms = async (page: number = 1, limit: number = 20, transaction?: Transaction) => {
    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows: rooms } = await ChatRoom.findAndCountAll({
        where: {
            is_deleted: false,
        },
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        transaction
    });
    return {
        data: rooms,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get all rooms by user ID with pagination and filters */
const findAllRoomsByUserId = async (
    userId: string,
    page: number = 1,
    limit: number = 20,
    search: string = '',
    transaction?: Transaction
) => {
    const offset = (Number(page) - 1) * Number(limit);
    const userIdString = JSON.stringify(userId);

    // Build where clause with filters
    const whereClause: any = {
        is_deleted: false,
        [Op.and]: [
            // User must be in user_ids
            fn('JSON_CONTAINS', col('user_ids'), userIdString),
            // User must not be in deleted_users
            literal(`NOT JSON_CONTAINS(COALESCE(\`deleted_users\`, JSON_ARRAY()), '${userIdString}')`),
            // User must not be in delete_history_by
            literal(`NOT JSON_CONTAINS(COALESCE(\`delete_history_by\`, JSON_ARRAY()), '${userIdString}')`),
            // If broadcast room, user must be broadcast_owner
            {
                [Op.or]: [
                    { is_broadcast: false },
                    { is_broadcast: true, broadcast_owner: userId }
                ]
            }
        ]
    };

    // If search is provided, add search conditions
    if (search?.trim()) {
        const searchPattern = `%${search.trim()}%`;
        const searchConditions: any[] = [];

        // Group chat: search by room name
        searchConditions.push({
            [Op.and]: [
                { is_personal: false },
                { name: { [Op.like]: searchPattern } }
            ]
        });

        // Personal chat: search by other user's details
        // Get all user IDs that match the search
        const matchingUsers = await User.findAll({
            where: {
                id: { [Op.ne]: userId },
                is_deleted: false,
                [Op.or]: [
                    { name: { [Op.like]: searchPattern } },
                    { username: { [Op.like]: searchPattern } },
                    { email: { [Op.like]: searchPattern } }
                ]
            },
            attributes: ['id'],
            raw: true
        });

        const matchingUserIds = matchingUsers.map((u: User) => u.id);

        if (matchingUserIds.length > 0) {
            // For personal chats, check if any matching user is in the room's user_ids
            searchConditions.push({
                [Op.and]: [
                    { is_personal: true },
                    {
                        [Op.or]: matchingUserIds.map((otherUserId: string) =>
                            literal(`JSON_CONTAINS(user_ids, '${JSON.stringify(otherUserId)}')`)
                        )
                    }
                ]
            });
        }

        // Add search conditions to where clause
        whereClause[Op.and].push({
            [Op.or]: searchConditions
        });
    }

    const { count, rows: rooms } = await ChatRoom.findAndCountAll({
        include: [
            {
                model: Event,
                as: 'event',
                attributes: eventAttributes,
                required: false,
                where: { is_deleted: false },
            },
        ],
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        transaction
    });

    return {
        data: rooms,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get rooms by user ID */
const findRoomsByUserId = async (
    userId: string,
    page: number = 1,
    limit: number = 20,
    search: string = '',
    filter: string = ChatRoomFilter.ALL,
    transaction?: Transaction
) => {
    const offset = (Number(page) - 1) * Number(limit);
    const userIdString = JSON.stringify(userId);

    const whereClause: any = {
        [Op.and]: [
            fn('JSON_CONTAINS', col('user_ids'), userIdString),
            { is_deleted: false }
        ]
    };

    // Apply filter conditions
    if (filter && filter !== ChatRoomFilter.ALL) {
        switch (filter) {
            case ChatRoomFilter.GROUP:
                // Group rooms: is_personal = false and event_id is null/empty
                whereClause[Op.and].push({
                    is_personal: false,
                    [Op.or]: [
                        { event_id: null },
                        { event_id: '' }
                    ]
                });
                break;
            case ChatRoomFilter.EVENT:
                // Event rooms: event_id is not null and not empty
                whereClause[Op.and].push(
                    { event_id: { [Op.ne]: null } },
                    { event_id: { [Op.ne]: '' } }
                );
                break;
            case ChatRoomFilter.NETWORK:
                // Network rooms: personal rooms (is_personal = true)
                whereClause[Op.and].push({
                    is_personal: true
                });
                break;
            case ChatRoomFilter.UNREAD:
                // Unread filter will be applied after fetching rooms
                // We'll filter in post-processing
                break;
        }
    }

    // If search is provided, add search conditions
    if (search?.trim()) {
        const searchPattern = `%${search.trim()}%`;
        const searchConditions: any[] = [];

        // Group chat: search by room name
        searchConditions.push({
            [Op.and]: [
                { is_personal: false },
                { name: { [Op.like]: searchPattern } }
            ]
        });

        // Personal chat: search by other user's details
        // Get all user IDs that match the search
        const matchingUsers = await User.findAll({
            where: {
                id: { [Op.ne]: userId },
                is_deleted: false,
                [Op.or]: [
                    { name: { [Op.like]: searchPattern } },
                    { username: { [Op.like]: searchPattern } },
                    { email: { [Op.like]: searchPattern } }
                ]
            },
            attributes: ['id'],
            raw: true
        });

        const matchingUserIds = matchingUsers.map((u: User) => u.id);

        if (matchingUserIds.length > 0) {
            // For personal chats, check if any matching user is in the room's user_ids
            searchConditions.push({
                [Op.and]: [
                    { is_personal: true },
                    {
                        [Op.or]: matchingUserIds.map((otherUserId: string) =>
                            literal(`JSON_CONTAINS(user_ids, '${JSON.stringify(otherUserId)}')`)
                        )
                    }
                ]
            });
        }

        // Add search conditions to where clause
        whereClause[Op.and].push({
            [Op.or]: searchConditions
        });
    }

    // Order by last message time using subquery, fallback to room created_at
    // Use COALESCE to handle rooms with no messages (NULL) by using room created_at
    // Reference ChatRoom (the Sequelize alias) in the subquery
    const orderByLastMessage = literal(`COALESCE((
        SELECT MAX(created_at) 
        FROM chat_messages 
        WHERE chat_messages.chat_room_id = \`ChatRoom\`.\`id\` 
        AND chat_messages.is_deleted = false
    ), \`ChatRoom\`.\`created_at\`) DESC`);

    const { count, rows: rooms } = await ChatRoom.findAndCountAll({
        include: [
            {
                model: Event,
                as: 'event',
                required: false,
                attributes: eventAttributes,
                where: { is_deleted: false },
            },
        ],
        where: whereClause,
        order: [orderByLastMessage],
        limit: Number(limit),
        offset,
        distinct: true,
        transaction
    });

    // Filter for unread rooms if filter is UNREAD
    let filteredRooms = rooms;
    if (filter === ChatRoomFilter.UNREAD) {
        const unreadRoomIds: string[] = [];
        for (const room of rooms) {
            const unreadCount = await messageService.getUnreadMessageCount(room.id, userId, transaction);
            if (unreadCount > 0) {
                unreadRoomIds.push(room.id);
            }
        }
        filteredRooms = rooms.filter((room: ChatRoom) => unreadRoomIds.includes(room.id));
    }

    return {
        data: filteredRooms,
        pagination: {
            totalCount: filter === ChatRoomFilter.UNREAD ? filteredRooms.length : count,
            currentPage: Number(page),
            totalPages: Math.ceil((filter === ChatRoomFilter.UNREAD ? filteredRooms.length : count) / Number(limit)),
        },
    };
};

/** Get unread message counts for all rooms the user is in */
const getUnreadCountsForAllRooms = async (userId: string, transaction?: Transaction) => {
    const userIdString = JSON.stringify(userId);
    const rooms = await ChatRoom.findAll({
        attributes: ['id'],
        where: {
            [Op.and]: [
                fn('JSON_CONTAINS', col('user_ids'), userIdString),
                { is_deleted: false }
            ]
        },
        raw: true,
        transaction
    });

    const byRoom: { room_id: string; unread_count: number }[] = [];
    let count = 0;

    for (const room of rooms) {
        const unreadCount = await messageService.getUnreadMessageCount(room.id, userId, transaction);
        byRoom.push({ room_id: room.id, unread_count: unreadCount });
        count += unreadCount;
    }

    return { by_room: byRoom, count };
};

/** Get last message in a room */
const getLastMessage = async (roomId: string, transaction?: Transaction) => {
    return await ChatMessage.findOne({
        where: { chat_room_id: roomId },
        order: [['created_at', 'DESC']],
        transaction
    });
};

/** Get users with details for room */
const getRoomUsersWithDetails = async (userIds: string[], deletedUsers: string[] = []) => {
    const usersData = await getUsersByUserIds(userIds);
    // Convert Sequelize instances to plain objects and filter deleted users
    return usersData
        .map((user: User) => user.toJSON ? user.toJSON() : user)
        .filter((user: User) => !deletedUsers.includes(user.id));
};

const getRoomInfoWithUsersAndLastMessage = async (roomId: string, userIds: string[], deletedUsers: string[] = [], transaction?: Transaction) => {

    const room = await findRoomByIdActive(roomId, transaction);
    if (!room) {
        return null;
    }

    // Fetch all users data
    const filteredUsers = await getRoomUsersWithDetails(userIds, deletedUsers);

    // Fetch unread message counts for all users
    const unreadMessageCounts = await Promise.all(userIds.map(async id => {
        const count = await messageService.getUnreadMessageCount(roomId, id, transaction);
        return { uid: id, unreadMessageCount: count };
    }));

    const mappedUsers = userIds.map((id: string) => ({
        ...filteredUsers.find(user => user.id === id),
        unreadMessageCount: unreadMessageCounts.find(countInfo => countInfo.uid === id)?.unreadMessageCount || 0,
        isDeleted: deletedUsers.includes(id)
    }));

    const lastMessageInfo = await getLastMessage(roomId, transaction);
    loggerService.info(`Last message info: ${JSON.stringify(lastMessageInfo?.toJSON())}`);

    // Determine last message text based on message type
    let lastMessageText = null;
    if (lastMessageInfo) {
        if (lastMessageInfo.event_id) {
            lastMessageText = 'shared an event';
        } else if (lastMessageInfo.feed_id) {
            lastMessageText = 'shared a post';
        } else {
            lastMessageText = lastMessageInfo.message || null;
        }
    }

    room.setDataValue('users', mappedUsers);
    room.setDataValue('lastMessage', lastMessageText);
    room.setDataValue('lastMessageTime', lastMessageInfo?.created_at);

    return room.toJSON();
};

/** Get all users details for multiple rooms */
const getUsersDetailsForRooms = async (userIds: string[]) => {
    const uniqueUserIds = [...new Set(userIds)];

    const users = await User.findAll({
        where: {
            id: uniqueUserIds,
            is_deleted: false
        },
        attributes: userAttributes
    });

    const userDetails: { [userId: string]: { id: string, name: string, image: string, company: string, username: string, thumbnail: string } } = {};
    users.forEach((user) => {
        const userJson = user.toJSON ? user.toJSON() : user;
        userDetails[userJson.id] = {
            id: userJson.id,
            name: userJson.name || '',
            image: userJson.image_url || '',
            company: userJson.company_name || '',
            thumbnail: userJson.thumbnail_url || '',
            username: userJson.username || '',
        };
    });

    return userDetails;
};

/** Remove user from deleted_users array */
const removeUserFromDeletedUsers = async (
    roomId: string,
    userId: string,
    transaction?: Transaction
) => {
    const room = await ChatRoom.findByPk(roomId, { transaction });
    if (!room) {
        return null;
    }

    if (room.deleted_users.includes(userId)) {
        room.deleted_users = room.deleted_users.filter(id => id !== userId);
        await room.save({ transaction });
    }

    return room;
};

export default {
    getUsersByUserIds,
    findRoomByEventId,
    findExistingRoom,
    createChatRoom,
    findRoomById,
    findRoomByIdActive,
    findBroadcastRoomByOwner,
    updateChatRoom,
    checkUserInRoom,
    findAllRooms,
    findAllRoomsByUserId,
    findRoomsByUserId,
    getUnreadCountsForAllRooms,
    getLastMessage,
    getRoomUsersWithDetails,
    getRoomInfoWithUsersAndLastMessage,
    getUsersDetailsForRooms,
    removeUserFromDeletedUsers,
};