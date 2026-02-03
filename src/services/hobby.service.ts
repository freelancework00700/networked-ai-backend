import { Op, Transaction } from 'sequelize';
import { Hobby } from '../models/index';

const hobbyAttributes = ['id', 'name', 'icon', 'description'];

/** Get all hobbies with optional search query. */
const getAllHobbies = async (search: string = '') => {
    const whereClause: any = { is_deleted: false };

    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
        ];
    }

    const hobbies = await Hobby.findAll({
        where: whereClause,
        attributes: hobbyAttributes,
        order: [['name', 'ASC']],
    });

    return hobbies;
};

/** Get all hobbies with pagination and search query. */
const getAllHobbiesPaginated = async (page: number = 1, limit: number = 10, search: string = '') => {
    const whereClause: any = { is_deleted: false };
    const offset = (Number(page) - 1) * Number(limit);

    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
        ];
    }

    const { count, rows: hobbies } = await Hobby.findAndCountAll({
        attributes: hobbyAttributes,
        where: whereClause,
        order: [['name', 'ASC']],
        limit: Number(limit),
        offset,
    });

    return {
        data: hobbies,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get a hobby by id. */
const getHobbyById = async (id: string, transaction?: Transaction) => {
    return await Hobby.findOne({
        attributes: hobbyAttributes,
        where: {
            id,
            is_deleted: false,
        },
        transaction,
    });
};

/** Get a hobby by name. */
const getHobbyByName = async (name: string, excludeHobbyId?: string) => {
    const whereClause: any = { name, is_deleted: false };

    if (excludeHobbyId) {
        whereClause.id = { [Op.ne]: excludeHobbyId };
    }

    return await Hobby.findOne({ where: whereClause });
};

/** Create a new hobby. */
const createHobby = async (data: Partial<Hobby>, userId: string, transaction?: Transaction) => {
    return await Hobby.create(
        {
            ...data,
            created_by: userId,
            updated_by: userId,
        },
        { transaction }
    );
};

/** Update a hobby. */
const updateHobby = async (id: string, data: Partial<Hobby>, userId: string, transaction?: Transaction) => {
    await Hobby.update(
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

/** Delete a hobby (soft delete). */
const deleteHobby = async (id: string, userId: string, transaction?: Transaction) => {
    await Hobby.update(
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
    getAllHobbies,
    getAllHobbiesPaginated,
    getHobbyById,
    getHobbyByName,
    createHobby,
    updateHobby,
    deleteHobby,
};
