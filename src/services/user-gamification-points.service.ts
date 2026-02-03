import { Op, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { UserGamificationPointsLog, User, GamificationCategory } from '../models/index';
import gamificationCategoryService from './gamification-category.service';
import { ContentType } from '../types/enums';

const userGamificationPointsAttributes = ['id', 'user_id', 'gamification_category_id', 'earned_points', 'created_at', 'updated_at'];

/** Create user gamification points entry. */
/** If earned_points is not provided, it will be automatically taken from the gamification category. */
const createUserGamificationPoints = async (
    data: {
        content_id: string;
        content_type: ContentType;
        user_id: string;
        gamification_category_id: string;
        earned_points: number;
    },
    createdByUserId: string,
    transaction?: Transaction
) => {

    return await UserGamificationPointsLog.create(
        {
            id: uuidv4(),
            user_id: data.user_id,
            gamification_category_id: data.gamification_category_id,
            earned_points: data.earned_points ?? 0,
            content_id: data.content_id,
            created_by: createdByUserId,
            updated_by: createdByUserId,
        },
        { transaction }
    );
};

/** Get user gamification points by user ID. */
const getUserGamificationPointsByUserId = async (userId: string, transaction?: Transaction) => {
    return await UserGamificationPointsLog.findAll({
        attributes: userGamificationPointsAttributes,
        where: {
            user_id: userId,
            is_deleted: false,
        },
        include: [
            {
                model: GamificationCategory,
                as: 'gamification_category',
                attributes: ['id', 'category_name', 'earned_point'],
                required: false,
            },
        ],
        order: [['created_at', 'DESC']],
        transaction,
    });
};

/** Get user gamification points by ID. */
const getUserGamificationPointsById = async (id: string, transaction?: Transaction) => {
    return await UserGamificationPointsLog.findOne({
        attributes: userGamificationPointsAttributes,
        where: {
            id,
            is_deleted: false,
        },
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'username', 'email'],
                required: false,
            },
            {
                model: GamificationCategory,
                as: 'gamification_category',
                attributes: ['id', 'category_name', 'earned_point'],
                required: false,
            },
        ],
        transaction,
    });
};

/** Get user gamification points by user ID and category ID. */
const getUserGamificationPointsByUserAndCategory = async (
    userId: string,
    categoryId: string,
    transaction?: Transaction
) => {
    return await UserGamificationPointsLog.findOne({
        attributes: userGamificationPointsAttributes,
        where: {
            user_id: userId,
            gamification_category_id: categoryId,
            is_deleted: false,
        },
        transaction,
    });
};

/** Get total earned points for a user. */
const getTotalEarnedPointsByUserId = async (userId: string, transaction?: Transaction) => {
    const result = await UserGamificationPointsLog.sum('earned_points', {
        where: {
            user_id: userId,
            is_deleted: false,
        },
        transaction,
    });

    return result || 0;
};

/** Get total earned points for a user by category. */
const getTotalEarnedPointsByUserAndCategory = async (
    userId: string,
    categoryId: string,
    transaction?: Transaction
) => {
    const result = await UserGamificationPointsLog.sum('earned_points', {
        where: {
            user_id: userId,
            gamification_category_id: categoryId,
            is_deleted: false,
        },
        transaction,
    });

    return result || 0;
};

/** Update user gamification points. */
const updateUserGamificationPoints = async (
    id: string,
    data: Partial<{
        earned_points: number;
    }>,
    updatedByUserId: string,
    transaction?: Transaction
) => {
    await UserGamificationPointsLog.update(
        {
            ...data,
            updated_by: updatedByUserId,
        },
        {
            where: { id, is_deleted: false },
            transaction,
        }
    );
};

/** Delete user gamification points (soft delete). */
const deleteUserGamificationPoints = async (id: string, deletedByUserId: string, transaction?: Transaction) => {
    await UserGamificationPointsLog.update(
        {
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: deletedByUserId,
        },
        {
            where: { id, is_deleted: false },
            transaction,
        }
    );
};

/** Get all user gamification points with pagination. */
const getAllUserGamificationPointsPaginated = async (
    page: number = 1,
    limit: number = 10,
    userId?: string,
    categoryId?: string,
    transaction?: Transaction
) => {
    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = { is_deleted: false };

    if (userId) {
        whereClause.user_id = userId;
    }

    if (categoryId) {
        whereClause.gamification_category_id = categoryId;
    }

    const { count, rows: points } = await UserGamificationPointsLog.findAndCountAll({
        attributes: userGamificationPointsAttributes,
        where: whereClause,
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'username', 'email'],
                required: false,
            },
            {
                model: GamificationCategory,
                as: 'gamification_category',
                attributes: ['id', 'category_name', 'earned_point'],
                required: false,
            },
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        transaction,
    });

    return {
        data: points,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Initialize user gamification points for all categories. */
/** This function creates entries for all gamification categories for a user. */
/** It only creates entries for categories that don't already exist for the user. */
const initializeUserGamificationPointsForAllCategories = async (
    userId: string,
    createdByUserId: string,
    transaction?: Transaction
) => {
    // Get all active gamification categories
    const categories = await gamificationCategoryService.getAllGamificationCategories();

    if (!categories || categories.length === 0) {
        return [];
    }

    // Get existing user gamification points for this user
    const existingPoints = await UserGamificationPointsLog.findAll({
        where: {
            user_id: userId,
            is_deleted: false,
        },
        attributes: ['gamification_category_id'],
        transaction,
    });

    // Get list of category IDs that already exist
    const existingCategoryIds = existingPoints.map((point) => point.gamification_category_id).filter(Boolean);

    // Filter out categories that already have entries
    const categoriesToCreate = categories.filter(
        (category) => !existingCategoryIds.includes(category.id)
    );

    // Create entries for all missing categories
    // Use the category's earned_point value from the gamification category
    const createdEntries = await Promise.all(
        categoriesToCreate.map((category) =>
            UserGamificationPointsLog.create(
                {
                    id: uuidv4(),
                    user_id: userId,
                    gamification_category_id: category.id,
                    earned_points: category.earned_point || 0, // Use category's earned_point value
                    created_by: createdByUserId,
                    updated_by: createdByUserId,
                },
                { transaction }
            )
        )
    );

    return createdEntries;
};

export default {
    createUserGamificationPoints,
    getUserGamificationPointsByUserId,
    getUserGamificationPointsById,
    getUserGamificationPointsByUserAndCategory,
    getTotalEarnedPointsByUserId,
    getTotalEarnedPointsByUserAndCategory,
    updateUserGamificationPoints,
    deleteUserGamificationPoints,
    getAllUserGamificationPointsPaginated,
    initializeUserGamificationPointsForAllCategories,
};

