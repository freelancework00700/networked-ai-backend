import { Op, Sequelize, Transaction } from 'sequelize';
import { BlockedUser, User } from '../models/index';

const blockUser = async (userId: string, peerId: string, createdBy?: string, transaction?: Transaction) => {
    // Check if already blocked
    const existing = await findBlockedUser(userId, peerId);
    if (existing && !existing.is_deleted) {
        return existing;
    }

    // If exists but deleted, restore it
    if (existing?.is_deleted) {
        existing.is_deleted = false;
        existing.deleted_at = null;
        existing.updated_by = createdBy ?? userId;
        await existing.save({ transaction });
        return existing;
    }

    // Create new block entry
    return await BlockedUser.create({
        user_id: userId,
        peer_id: peerId,
        created_by: createdBy ?? userId,
    }, { transaction });
};

const findBlockedUser = async (userId: string, peerId: string) => {
    return await BlockedUser.findOne({
        where: {
            user_id: userId,
            peer_id: peerId,
            is_deleted: false
        }
    });
};

const unblockUser = async (blockedUserId: string, deletedBy?: string) => {
    await BlockedUser.update({
        is_deleted: true,
        deleted_at: new Date(),
        ...(deletedBy && { deleted_by: deletedBy })
    }, {
        where: {
            id: blockedUserId,
            is_deleted: false
        }
    });
};

const findAllBlockedUsers = async (userId: string, page: number = 1, limit: number = 10) => {
    const offset = (page - 1) * limit;

    const { count, rows: blockedUsers } = await User.findAndCountAll({
        attributes: ['id', 'username', 'name', 'email', 'image_url'],
        where: { is_deleted: false },
        include: [
            {
                model: BlockedUser,
                as: 'blocked_users',
                attributes: [],
                where: {
                    user_id: userId,
                    is_deleted: false,
                    peer_id: {
                        [Op.ne]: userId
                    }
                },
                required: true
            }
        ],
        distinct: true,
        subQuery: false,
        order: [[Sequelize.col('blocked_users.created_at'), 'DESC']],
        limit,
        offset
    });
    return {
        data: blockedUsers,
        pagination: {
            totalCount: count,
            currentPage: page,
            totalPages: Math.ceil(count / limit)
        }
    };
};

const checkIfBlocked = async (userId: string, peerId: string) => {
    const blocked = await BlockedUser.findOne({
        where: {
            user_id: userId,
            peer_id: peerId,
            is_deleted: false
        }
    });
    return !!blocked;
};

export default {
    blockUser,
    findBlockedUser,
    unblockUser,
    findAllBlockedUsers,
    checkIfBlocked
};

