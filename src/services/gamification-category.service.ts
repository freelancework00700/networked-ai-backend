import { Op, Transaction } from 'sequelize';
import { GamificationCategory } from '../models/index';

const gamificationCategoryAttributes = ['id', 'category_name', 'earned_point'];

/** Get all gamification categories with optional search query. */
const getAllGamificationCategories = async (search: string = '') => {
    const whereClause: any = { is_deleted: false };

    if (search) {
        whereClause[Op.or] = [
            { category_name: { [Op.like]: `%${search}%` } },
        ];
    }

    const categories = await GamificationCategory.findAll({
        where: whereClause,
        attributes: gamificationCategoryAttributes,
        order: [['category_name', 'ASC']],
    });

    return categories;
};

/** Get all gamification categories with pagination and search query. */
const getAllGamificationCategoriesPaginated = async (page: number = 1, limit: number = 10, search: string = '') => {
    const whereClause: any = { is_deleted: false };
    const offset = (Number(page) - 1) * Number(limit);

    if (search) {
        whereClause[Op.or] = [
            { category_name: { [Op.like]: `%${search}%` } },
        ];
    }

    const { count, rows: categories } = await GamificationCategory.findAndCountAll({
        attributes: gamificationCategoryAttributes,
        where: whereClause,
        order: [['category_name', 'ASC']],
        limit: Number(limit),
        offset,
    });

    return {
        data: categories,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get a gamification category by id. */
const getGamificationCategoryById = async (id: string, transaction?: Transaction) => {
    return await GamificationCategory.findOne({
        attributes: gamificationCategoryAttributes,
        where: {
            id,
            is_deleted: false,
        },
        transaction,
    });
};

/** Get a gamification category by name. */
const getGamificationCategoryByName = async (categoryName: string, excludeCategoryId?: string) => {
    const whereClause: any = { category_name: categoryName, is_deleted: false };

    if (excludeCategoryId) {
        whereClause.id = { [Op.ne]: excludeCategoryId };
    }

    return await GamificationCategory.findOne({ where: whereClause });
};

/** Create a new gamification category. */
const createGamificationCategory = async (data: Partial<GamificationCategory>, userId: string, transaction?: Transaction) => {
    return await GamificationCategory.create(
        {
            ...data,
            created_by: userId,
            updated_by: userId,
        },
        { transaction }
    );
};

/** Update a gamification category. */
const updateGamificationCategory = async (id: string, data: Partial<GamificationCategory>, userId: string, transaction?: Transaction) => {
    await GamificationCategory.update(
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

/** Delete a gamification category (soft delete). */
const deleteGamificationCategory = async (id: string, userId: string, transaction?: Transaction) => {
    await GamificationCategory.update(
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
    getAllGamificationCategories,
    getAllGamificationCategoriesPaginated,
    getGamificationCategoryById,
    getGamificationCategoryByName,
    createGamificationCategory,
    updateGamificationCategory,
    deleteGamificationCategory,
};

