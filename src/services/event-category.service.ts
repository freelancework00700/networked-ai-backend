import { Op, Transaction } from 'sequelize';
import { EventCategory } from '../models/index';

const eventCategoryAttributes = ['id', 'name', 'icon', 'description'];

/** Get all event categories with search query. */
const getAllEventCategories = async (search: string = '') => {
    const whereClause: any = { is_deleted: false };

    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
        ];
    }

    const eventCategories = await EventCategory.findAll({
        where: whereClause,
        attributes: eventCategoryAttributes,
        order: [["name", "ASC"]],
    });

    return eventCategories;
};

/** Get all event categories with pagination and search query. */
const getAllEventCategoriesPaginated = async (page: number = 1, limit: number = 10, search: string = '') => {
    const whereClause: any = { is_deleted: false };
    const offset = (Number(page) - 1) * Number(limit);

    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
        ];
    }

    const { count, rows: eventCategories } = await EventCategory.findAndCountAll({
        attributes: eventCategoryAttributes,
        where: whereClause,
        order: [["name", "ASC"]],
        limit: Number(limit),
        offset,
    });

    return {
        data: eventCategories,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get an event category by id. */
const getEventCategoryById = async (id: string, transaction?: Transaction) => {
    return await EventCategory.findOne({
        attributes: eventCategoryAttributes,
        where: {
            id,
            is_deleted: false
        },
        transaction
    });
};

/** Get an event category by name. */
const getEventCategoryByName = async (name: string, excludeEventCategoryId?: string) => {
    const whereClause: any = { name, is_deleted: false };

    if (excludeEventCategoryId) {
        whereClause.id = { [Op.ne]: excludeEventCategoryId };
    }

    return await EventCategory.findOne({ where: whereClause });
};

/** Create a new event category. */
const createEventCategory = async (data: Partial<EventCategory>, userId: string, transaction?: Transaction) => {
    return await EventCategory.create({
        ...data,
        created_by: userId,
        updated_by: userId,
    }, { transaction });
};

/** Update an event category. */
const updateEventCategory = async (id: string, data: Partial<EventCategory>, userId: string, transaction?: Transaction) => {
    await EventCategory.update({
        ...data,
        updated_by: userId,
    }, {
        where: { id, is_deleted: false },
        transaction,
    });
};

/** Delete an event category. */
const deleteEventCategory = async (id: string, userId: string, transaction?: Transaction) => {
    await EventCategory.update({
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId,
    }, {
        where: { id, is_deleted: false },
        transaction,
    });
};

export default {
    getAllEventCategories,
    getAllEventCategoriesPaginated,
    getEventCategoryById,
    getEventCategoryByName,
    createEventCategory,
    updateEventCategory,
    deleteEventCategory,
};
