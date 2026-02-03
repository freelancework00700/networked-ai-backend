import { Op, Transaction } from 'sequelize';
import { GamificationBadge } from '../models/index';

const gamificationBadgeAttributes = ['id', 'event_count', 'badge', 'title', 'priority', 'locked_url', 'event_hosted_url', 'event_attended_url', 'networks_url', 'messages_url', 'qr_url'];

/** Get all gamification badges with optional search query. */
const getAllGamificationBadges = async (search: string = '') => {
    const whereClause: any = { is_deleted: false };

    if (search) {
        whereClause[Op.or] = [
            { badge: { [Op.like]: `%${search}%` } },
            { title: { [Op.like]: `%${search}%` } },
        ];
    }

    const badges = await GamificationBadge.findAll({
        where: whereClause,
        attributes: gamificationBadgeAttributes,
        order: [['event_count', 'ASC']],
    });

    return badges;
};

/** Get all gamification badges with pagination and search query. */
const getAllGamificationBadgesPaginated = async (page: number = 1, limit: number = 10, search: string = '') => {
    const whereClause: any = { is_deleted: false };
    const offset = (Number(page) - 1) * Number(limit);

    if (search) {
        whereClause[Op.or] = [
            { badge: { [Op.like]: `%${search}%` } },
            { title: { [Op.like]: `%${search}%` } },
        ];
    }

    const { count, rows: badges } = await GamificationBadge.findAndCountAll({
        attributes: gamificationBadgeAttributes,
        where: whereClause,
        order: [['event_count', 'ASC']],
        limit: Number(limit),
        offset,
    });

    return {
        data: badges,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get a gamification badge by id. */
const getGamificationBadgeById = async (id: string, transaction?: Transaction) => {
    return await GamificationBadge.findOne({
        attributes: gamificationBadgeAttributes,
        where: {
            id,
            is_deleted: false,
        },
        transaction,
    });
};

/** Get a gamification badge by event count. */
const getGamificationBadgeByEventCount = async (eventCount: number, excludeBadgeId?: string) => {
    const whereClause: any = { event_count: eventCount, is_deleted: false };

    if (excludeBadgeId) {
        whereClause.id = { [Op.ne]: excludeBadgeId };
    }

    return await GamificationBadge.findOne({ where: whereClause });
};

/** Create a new gamification badge. */
const createGamificationBadge = async (data: Partial<GamificationBadge>, userId: string, transaction?: Transaction) => {
    return await GamificationBadge.create(
        {
            ...data,
            created_by: userId,
            updated_by: userId,
        },
        { transaction }
    );
};

/** Update a gamification badge. */
const updateGamificationBadge = async (id: string, data: Partial<GamificationBadge>, userId: string, transaction?: Transaction) => {
    await GamificationBadge.update(
        {
            ...data,
            updated_by: userId,
        },
        {
            where: { id, is_deleted: false },
            transaction,
        }
    );
};

/** Delete a gamification badge (soft delete). */
const deleteGamificationBadge = async (id: string, userId: string, transaction?: Transaction) => {
    await GamificationBadge.update(
        {
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: userId,
        },
        {
            where: { id, is_deleted: false },
            transaction,
        }
    );
};

export default {
    getAllGamificationBadges,
    getAllGamificationBadgesPaginated,
    getGamificationBadgeById,
    getGamificationBadgeByEventCount,
    createGamificationBadge,
    updateGamificationBadge,
    deleteGamificationBadge,
};

