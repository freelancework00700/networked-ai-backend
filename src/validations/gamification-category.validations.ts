export const createGamificationCategorySchema = {
    type: 'object',
    properties: {
        category_name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
        },
        earned_point: {
            type: 'integer',
            minimum: 0,
        },
    },
    required: ['category_name', 'earned_point'],
    additionalProperties: false,
};

export const updateGamificationCategorySchema = {
    type: 'object',
    properties: {
        category_name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
        },
        earned_point: {
            type: 'integer',
            minimum: 0,
        },
    },
    additionalProperties: false,
    minProperties: 1,
};

export const getAllGamificationCategoriesSchema = {
    type: 'object',
    properties: {
        search: {
            type: 'string',
            maxLength: 255,
        },
    },
    additionalProperties: false,
};

export const getAllGamificationCategoriesPaginatedSchema = {
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
        search: {
            type: 'string',
            maxLength: 255,
        },
    },
    required: ['page', 'limit'],
    additionalProperties: false,
};

