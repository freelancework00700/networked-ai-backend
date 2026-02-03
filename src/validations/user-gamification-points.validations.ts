export const createUserGamificationPointsSchema = {
    type: 'object',
    properties: {
        user_id: {
            type: 'string',
            minLength: 1,
        },
        gamification_category_id: {
            type: 'string',
            minLength: 1,
        },
        earned_points: {
            type: 'integer',
            minimum: 0,
        },
    },
    required: ['user_id', 'gamification_category_id'],
    additionalProperties: false,
};

export const updateUserGamificationPointsSchema = {
    type: 'object',
    properties: {
        earned_points: {
            type: 'integer',
            minimum: 0,
        },
    },
    required: ['earned_points'],
    additionalProperties: false,
};

export const getAllUserGamificationPointsPaginatedSchema = {
    type: 'object',
    properties: {
        page: {
            type: 'string',
            minLength: 1,
        },
        limit: {
            type: 'string',
            minLength: 1,
        },
        userId: {
            type: 'string',
            minLength: 1,
        },
        categoryId: {
            type: 'string',
            minLength: 1,
        },
    },
    required: ['page', 'limit'],
    additionalProperties: false,
};

