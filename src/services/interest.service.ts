import { Op, Transaction } from 'sequelize';
import { Interest } from '../models/index';

const interestAttributes = ['id', 'name', 'icon', 'description'];

/** Get all interests with optional search query. */
const getAllInterests = async (search: string = '') => {
    const whereClause: any = { is_deleted: false };

    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
        ];
    }

    const interests = await Interest.findAll({
        where: whereClause,
        attributes: interestAttributes,
        order: [['name', 'ASC']],
    });

    return interests;
};

/** Get all interests with pagination and search query. */
const getAllInterestsPaginated = async (page: number = 1, limit: number = 10, search: string = '') => {
    const whereClause: any = { is_deleted: false };
    const offset = (Number(page) - 1) * Number(limit);

    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
        ];
    }

    const { count, rows: interests } = await Interest.findAndCountAll({
        attributes: interestAttributes,
        where: whereClause,
        order: [['name', 'ASC']],
        limit: Number(limit),
        offset,
    });

    return {
        data: interests,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get an interest by id. */
const getInterestById = async (id: string, transaction?: Transaction) => {
    return await Interest.findOne({
        attributes: interestAttributes,
        where: {
            id,
            is_deleted: false,
        },
        transaction,
    });
};

/** Get an interest by name. */
const getInterestByName = async (name: string, excludeInterestId?: string) => {
    const whereClause: any = { name, is_deleted: false };

    if (excludeInterestId) {
        whereClause.id = { [Op.ne]: excludeInterestId };
    }

    return await Interest.findOne({ where: whereClause });
};

/** Create a new interest. */
const createInterest = async (data: Partial<Interest>, userId: string, transaction?: Transaction) => {
    return await Interest.create(
        {
            ...data,
            created_by: userId,
            updated_by: userId,
        },
        { transaction }
    );
};

/** Update an interest. */
const updateInterest = async (id: string, data: Partial<Interest>, userId: string, transaction?: Transaction) => {
    await Interest.update(
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

/** Delete an interest (soft delete). */
const deleteInterest = async (id: string, userId: string, transaction?: Transaction) => {
    await Interest.update(
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
    getAllInterests,
    getAllInterestsPaginated,
    getInterestById,
    getInterestByName,
    createInterest,
    updateInterest,
    deleteInterest,
};
