export const createUserGamificationCategoryBadgeSchema = {
    type: 'object',
    properties: {
        user_id: {
            type: 'string',
            minLength: 1,
        },
        gamification_category_id: {
            type: 'string',
            minLength: 1,
            maxLength: 45,
        },
        gamification_badge_id: {
            type: 'string',
            minLength: 1,
        },
        completed_date: {
            type: 'string',
            format: 'date-time',
        },
    },
    required: ['user_id', 'gamification_category_id', 'gamification_badge_id', 'completed_date'],
    additionalProperties: false,
};

