import { Op, Sequelize, Transaction } from 'sequelize';
import { User, UserNetwork, UserRequest } from '../models/index';
import { ContentType, UserRequestStatus } from '../types/enums';
import userService from './user.service';
import gamificationCategoryService from './gamification-category.service';
import userGamificationPointsService from './user-gamification-points.service';
import userGamificationCategoryBadgesService from './user-gamification-category-badges.service';
const userAttributes = ['id', 'dob', 'description', 'title', 'name', 'email', 'username', 'mobile', 'account_type', 'company_name', 'address', 'latitude', 'longitude', 'image_url', 'thumbnail_url', 'total_networks', 'total_events_hosted', 'total_events_staffed', 'total_events_spoken', 'total_events_cohosted', 'total_events_sponsored', 'total_events_attended', 'total_gamification_points'];

/** Create a network connection request */
const createRequest = async (senderId: string, receiverId: string, createdBy?: string) => {
    const request = await UserRequest.create({
        sender_id: senderId,
        receiver_id: receiverId,
        status: UserRequestStatus.PENDING,
        created_by: createdBy ?? senderId,
    });

    // Increment total_network_requests for receiver
    await userService.incrementUserTotal(receiverId, 'total_network_requests');

    return request;
};

/** Find a network connection request by id */
const findRequestById = async (requestId: string) => {
    return await UserRequest.findOne({
        where: { id: requestId, is_deleted: false },
        include: [
            { association: 'sender', attributes: userAttributes },
            { association: 'receiver', attributes: userAttributes }
        ]
    });
};

/** Find a network connection request by sender and receiver */
const findRequestBySenderAndReceiver = async (senderId: string, receiverId: string) => {
    return await UserRequest.findOne({
        where: {
            sender_id: senderId,
            receiver_id: receiverId,
            is_deleted: false
        }
    });
};

/** Find a network connection request between two users in either direction */
const findRequestBetweenUsers = async (userId1: string, userId2: string) => {
    return await UserRequest.findOne({
        where: {
            status: UserRequestStatus.PENDING,
            [Op.or]: [
                { sender_id: userId1, receiver_id: userId2 },
                { sender_id: userId2, receiver_id: userId1 }
            ],
            is_deleted: false
        }
    });
};

/** Find all network connection requests by receiver */
const findAllRequestsByReceiver = async (receiverId: string, page: number = 1, limit: number = 10, search: string = '') => {
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {
        receiver_id: receiverId,
        is_deleted: false,
        status: UserRequestStatus.PENDING
    };

    if (search) {
        whereClause[Op.or] = [];
        const searchPattern = `%${search}%`;
        whereClause[Op.or].push(Sequelize.literal(`sender.name LIKE '${searchPattern}'`));
        whereClause[Op.or].push(Sequelize.literal(`sender.email LIKE '${searchPattern}'`));
        whereClause[Op.or].push(Sequelize.literal(`sender.mobile LIKE '${searchPattern}'`));
        whereClause[Op.or].push(Sequelize.literal(`sender.username LIKE '${searchPattern}'`));
    }

    const { count, rows } = await UserRequest.findAndCountAll({
        attributes: [],
        where: whereClause,
        order: [['created_at', 'DESC']],
        include: [
            { association: 'sender', attributes: userAttributes }
        ],
        limit: Number(limit),
        offset,
    });

    // Extract sender users from requests and convert to plain objects
    const senders = rows.map((row: any) => row.sender.toJSON());

    return {
        data: senders,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Update a network connection request status */
const updateRequestStatus = async (requestId: string, status: UserRequestStatus, updatedBy?: string, transaction?: Transaction) => {
    await UserRequest.update({
        status,
        ...(updatedBy && { updated_by: updatedBy }),
        updated_at: new Date(),
    }, { where: { id: requestId, is_deleted: false }, transaction, individualHooks: true });
};

/** Delete network connection requests between two users */
const deleteRequestsBetweenUsers = async (userId1: string, userId2: string, deletedBy?: string, transaction?: Transaction) => {
    // Find requests to be deleted
    const requests = await UserRequest.findAll({
        where: {
            [Op.or]: [
                { sender_id: userId1, receiver_id: userId2 },
                { sender_id: userId2, receiver_id: userId1 }
            ],
            is_deleted: false
        },
        transaction
    });

    await UserRequest.update({
        is_deleted: true,
        deleted_at: new Date(),
        ...(deletedBy && { deleted_by: deletedBy })
    }, {
        where: {
            [Op.or]: [
                { sender_id: userId1, receiver_id: userId2 },
                { sender_id: userId2, receiver_id: userId1 }
            ],
            is_deleted: false
        },
        transaction,
        individualHooks: true
    });

    // Decrement total_network_requests for receivers
    for (const request of requests) {
        await userService.decrementUserTotal(request.receiver_id, 'total_network_requests', transaction);
    }
};

/** Create a network connection */
const createConnection = async (userId: string, peerId: string, createdBy?: string, upgradeUserSenderConnectionCount?: boolean, transaction?: Transaction) => {
    // Check if connection already exists
    const existing = await findConnection(userId, peerId);
    if (existing) {
        return existing;
    }

    const connection = await UserNetwork.create({
        user_id: userId,
        peer_id: peerId,
        created_by: createdBy ?? userId,
    }, { transaction });


    //increment total_networks for the user who is upgrading their connection count
    await userService.incrementUserTotal(upgradeUserSenderConnectionCount ? userId : peerId, 'total_networks', transaction);


    // add gamification points for both users
    // Get category to fetch earned_points for updating user total
    const category = await gamificationCategoryService.getGamificationCategoryByName(
        'Make a New Connection',
        undefined
    );

    if (category) {
        // Create user gamification points for the event creator
        await userGamificationPointsService.createUserGamificationPoints(
            {
                content_id: connection.id,
                content_type: ContentType.NETWORK,
                user_id: upgradeUserSenderConnectionCount ? userId : peerId,
                gamification_category_id: category?.id ?? "",
                earned_points: category?.earned_point ?? 0,
            },
            upgradeUserSenderConnectionCount ? userId : peerId,
            transaction
        );

        //update user gamification category badges
        await userGamificationCategoryBadgesService.checkAndAwardBadgeByField(upgradeUserSenderConnectionCount ? userId : peerId, category.id,"total_networks", transaction);
        // Update total gamification points if category exists
        await userService.addPointsToUserTotal(upgradeUserSenderConnectionCount ? userId : peerId, "total_gamification_points", category?.earned_point ?? 0, transaction);
    }

    return connection;
};

/** Find a network connection by user and peer */
const findConnection = async (userId: string, peerId: string) => {
    return await UserNetwork.findOne({
        where: {
            user_id: userId,
            peer_id: peerId,
            is_deleted: false
        }
    });
};

/** Find all network connections by user */
const findAllConnectionsByUserId = async (
    authenticatedUserId: string,
    userId: string, 
    page: number = 1, 
    limit: number = 10, 
    search: string = '',
    latitude?: string,
    longitude?: string,
    radius?: string
) => {
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {
        user_id: userId,
        is_deleted: false
    };

    if (search) {
        whereClause[Op.or] = [];
        const searchPattern = `%${search}%`;
        whereClause[Op.or].push(Sequelize.literal(`peer.username LIKE '${searchPattern}'`));
        whereClause[Op.or].push(Sequelize.literal(`peer.name LIKE '${searchPattern}'`));
        whereClause[Op.or].push(Sequelize.literal(`peer.email LIKE '${searchPattern}'`));
        whereClause[Op.or].push(Sequelize.literal(`peer.mobile LIKE '${searchPattern}'`));
    }

    // Handle location filtering
    let peerAttributes: any = userAttributes;
    let peerWhereClause: any = {
        is_deleted: false
    };
    let order: any[] = [['created_at', 'DESC']];

    if (latitude && longitude && radius) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const radiusKm = parseFloat(radius);

        // Haversine formula: distance = 6371 * acos(cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1)) + sin(radians(lat1)) * sin(radians(lat2)))
        const distanceCalculation = `(
            6371 * acos(
                cos(radians(${lat})) * 
                cos(radians(CAST(\`peer\`.\`latitude\` AS DECIMAL(10, 8)))) * 
                cos(radians(CAST(\`peer\`.\`longitude\` AS DECIMAL(11, 8))) - radians(${lng})) + 
                sin(radians(${lat})) * 
                sin(radians(CAST(\`peer\`.\`latitude\` AS DECIMAL(10, 8))))
            )
        )`;

        // Add distance to attributes
        peerAttributes = [
            ...userAttributes,
            [Sequelize.literal(distanceCalculation), 'distance']
        ];

        // Add distance filter to WHERE clause
        const distanceCondition = Sequelize.literal(`${distanceCalculation} <= ${radiusKm}`);
        const coordinateConditions: any[] = [
            { latitude: { [Op.ne]: null } },
            { latitude: { [Op.ne]: '' } },
            { longitude: { [Op.ne]: null } },
            { longitude: { [Op.ne]: '' } },
            distanceCondition
        ];

        peerWhereClause[Op.and] = [
            { is_deleted: false },
            ...coordinateConditions
        ];
        
        // Order by distance
        order = [[Sequelize.literal(distanceCalculation), 'ASC']];
    }

    const { count, rows } = await UserNetwork.findAndCountAll({
        attributes: [],
        where: whereClause,
        include: [
            { 
                model: User, 
                as: 'peer', 
                attributes: peerAttributes,
                where: peerWhereClause,
                required: true
            }
        ],
        order,
        limit: Number(limit),
        offset,
        distinct: true,
    });

    // Extract peer users from connections and convert to plain objects
    const peers = rows.map((row: any) => row.peer.toJSON());

    // Add connection_status to peer users using existing method
    const peersWithStatus = await userService.addConnectionStatusToUsers(peers, authenticatedUserId, false);

    return {
        data: peersWithStatus,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Delete a network connection */
const deleteConnectionBetweenUsers = async (userId: string, peerId: string, deletedBy?: string, transaction?: Transaction) => {
    const connections = await UserNetwork.findAll({
        where: {
            [Op.or]: [
                { user_id: userId, peer_id: peerId },
                { user_id: peerId, peer_id: userId }
            ],
            is_deleted: false
        },
        transaction
    });

    if (connections.length === 0) {
        return;
    }

    await UserNetwork.update({
        is_deleted: true,
        deleted_at: new Date(),
        ...(deletedBy && { deleted_by: deletedBy })
    }, {
        where: {
            [Op.or]: [
                { user_id: userId, peer_id: peerId },
                { user_id: peerId, peer_id: userId }
            ],
            is_deleted: false
        },
        transaction
    });

    // Decrement total_networks only for users who actually had connections
    const userIdsToDecrement = new Set<string>();
    connections.forEach(conn => {
        userIdsToDecrement.add(conn.user_id);
    });

    // Only decrement for users who had connections
    for (const uid of userIdsToDecrement) {
        await userService.decrementUserTotal(uid, 'total_networks', transaction);
    }
};

export default {
    createRequest,
    findRequestById,
    findRequestBySenderAndReceiver,
    findRequestBetweenUsers,
    findAllRequestsByReceiver,
    updateRequestStatus,
    deleteRequestsBetweenUsers,
    createConnection,
    findConnection,
    findAllConnectionsByUserId,
    deleteConnectionBetweenUsers
};

