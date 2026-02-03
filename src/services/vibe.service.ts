import { Op, Transaction } from 'sequelize';
import { Vibe, UserVibe } from '../models/index';

const vibeAttributes = ['id', 'name', 'icon', 'description'];

/** Get all vibes with search query. */
const getAllVibes = async (search: string = '') => {
    const whereClause: any = { is_deleted: false };

    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
        ];
    }

    const vibes = await Vibe.findAll({
        where: whereClause,
        attributes: vibeAttributes,
        order: [["name", "ASC"]],
    });

    return vibes;
};

/** Get all vibes with pagination and search query. */
const getAllVibesPaginated = async (page: number = 1, limit: number = 10, search: string = '') => {
    const whereClause: any = { is_deleted: false };
    const offset = (Number(page) - 1) * Number(limit);

    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
        ];
    }

    const { count, rows: vibes } = await Vibe.findAndCountAll({
        attributes: vibeAttributes,
        where: whereClause,
        order: [["name", "ASC"]],
        limit: Number(limit),
        offset,
    });

    return {
        data: vibes,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get a vibe by id. */
const getVibeById = async (id: string, transaction?: Transaction) => {
    return await Vibe.findOne({
        attributes: vibeAttributes,
        where: {
            id,
            is_deleted: false
        },
        transaction
    });
};

/** Get a vibe by name. */
const getVibeByName = async (name: string, excludeVibeId?: string) => {
    const whereClause: any = { name, is_deleted: false };

    if (excludeVibeId) {
        whereClause.id = { [Op.ne]: excludeVibeId };
    }

    return await Vibe.findOne({ where: whereClause });
};

/** Create a new vibe. */
const createVibe = async (data: Partial<Vibe>, userId: string, transaction?: Transaction) => {
    return await Vibe.create({
        ...data,
        created_by: userId,
        updated_by: userId,
    }, { transaction });
};

/** Update a vibe. */
const updateVibe = async (id: string, data: Partial<Vibe>, userId: string, transaction?: Transaction) => {
    await Vibe.update({
        ...data,
        updated_by: userId,
    }, {
        where: { id, is_deleted: false },
        transaction,
    });
};

/** Delete a vibe. */
const deleteVibe = async (id: string, userId: string, transaction?: Transaction) => {
    await Vibe.update({
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId,
    }, {
        where: { id, is_deleted: false },
        transaction,
    });
};

export default {
    getAllVibes,
    getAllVibesPaginated,
    getVibeById,
    getVibeByName,
    createVibe,
    updateVibe,
    deleteVibe,
};
