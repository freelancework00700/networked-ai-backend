import { Op, Transaction } from 'sequelize';
import {FeedShared, Feed, User, UserNetwork} from '../models/index'; 
import feedService from './feed.service';

const IncludeClause = [
    {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
    },
    {
        model: User,
        as: 'peer',
        attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
    }
];

const findByFeedId = async (feedId: string) => {
    return FeedShared.findAll({
        where: { feed_id: feedId, is_deleted: false },
        include: IncludeClause,
        order: [['created_at', 'DESC']]
    });
};

const findByUserId = async (userId: string) => {
    return FeedShared.findAll({
        where: { user_id: userId, is_deleted: false },
        include: IncludeClause,
        order: [['created_at', 'DESC']]
    });
};

const findByFeedIdAndUserIdAndPeerId = async (feedId: string, userId: string, peerId: string) => {
    return FeedShared.findOne({
        where: { feed_id: feedId, user_id: userId, peer_id: peerId, is_deleted: false }
    });
};

const createShared = async (feedId: string, userId: string, peerId: string, createdBy: string, transaction: Transaction) => {
    // Check if already shared
    const existing = await FeedShared.findOne({
        where: { feed_id: feedId, user_id: userId, peer_id: peerId }
    });

    if (existing) {
        // If soft deleted, restore it
        if (existing.is_deleted) {
            existing.is_deleted = false;
            existing.deleted_at = null;
            existing.deleted_by = null;
            existing.created_by = createdBy;
            await existing.save({ transaction });
            await feedService.incrementFeedTotals(feedId, 'total_shares', transaction);
            return existing;
        }
        return existing; // Already shared
    }

    // Create new share
    const shared = await FeedShared.create({
        feed_id: feedId,
        user_id: userId,
        peer_id: peerId,
        created_by: createdBy,
    }, { transaction });

    // Increment feed share count
    await feedService.incrementFeedTotals(feedId, 'total_shares', transaction);

    return shared;
};

const removeShared = async (feedId: string, userId: string, peerId: string, deletedBy: string, transaction: Transaction) => {
    const shared = await findByFeedIdAndUserIdAndPeerId(feedId, userId, peerId);
    if (!shared) {
        return null;
    }

    // Soft delete
    shared.is_deleted = true;
    shared.deleted_at = new Date();
    shared.deleted_by = deletedBy;
    await shared.save({ transaction });

    // Decrement feed share count
    await feedService.decrementFeedTotals(feedId, 'total_shares', transaction);

    return shared;
};

const checkIfShared = async (feedId: string, userId: string, peerId: string) => {
    const shared = await findByFeedIdAndUserIdAndPeerId(feedId, userId, peerId);
    return !!shared;
};

/** Get all network user IDs for a user (bidirectional) */
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

/** Share feed with multiple users */
const createBulkShared = async (feedId: string, userId: string, peerIds: string[], createdBy: string, transaction: Transaction): Promise<FeedShared[]> => {
    if (!peerIds || peerIds.length === 0) {
        return [];
    }

    const sharedRecords: FeedShared[] = [];
    let newSharesCount = 0;

    for (const peerId of peerIds) {
        // Skip if trying to share with self
        if (userId === peerId) {
            continue;
        }

        // Check if already shared
        const existing = await FeedShared.findOne({
            where: { feed_id: feedId, user_id: userId, peer_id: peerId },
            transaction
        });

        if (existing) {
            // If soft deleted, restore it
            if (existing.is_deleted) {
                existing.is_deleted = false;
                existing.deleted_at = null;
                existing.deleted_by = null;
                existing.created_by = createdBy;
                await existing.save({ transaction });
                newSharesCount++;
            } 
            sharedRecords.push(existing);
        } else {
            // Create new share
            const shared = await FeedShared.create({
                feed_id: feedId,
                user_id: userId,
                peer_id: peerId,
                created_by: createdBy,
            }, { transaction });
            newSharesCount++;
            sharedRecords.push(shared);
        }
    }

    // Increment feed share count only for new shares
    if (newSharesCount > 0) {
        // Increment by the number of new shares
        for (let i = 0; i < newSharesCount; i++) {
            await feedService.incrementFeedTotals(feedId, 'total_shares', transaction);
        }
    }

    return sharedRecords;
};

export default {
    findByFeedId,
    findByUserId,
    findByFeedIdAndUserIdAndPeerId,
    createShared,
    createBulkShared,
    removeShared,
    checkIfShared,
    getAllNetworkUserIds,
};

