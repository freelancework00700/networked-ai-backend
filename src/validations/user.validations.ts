import { AccountType } from "../types/enums";

/** Schema to validate user update. */
export const updateUserSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
        },
        email: {
            type: 'string',
            format: 'email'
        },
        username: {
            type: 'string',
        },
        title: {
            type: 'string',
        },
        description: {
            type: 'string',
        },
        address: {
            type: 'string',
        },
        latitude: {
            type: 'string',
        },
        longitude: {
            type: 'string',
        },
        company_name: {
            type: 'string',
        },
        college_university_name: {
            type: 'string',
        },
        account_type: {
            type: 'string',
            enum: Object.values(AccountType)
        },
        image_url: {
            type: 'string',
            format: 'uri'
        },
        settings: {
            type: 'object',
        },
        socials: {
            type: 'object',
        },
        vibe_ids: {
            type: 'array',
            items: { type: 'string' }
        },
        hobby_ids: {
            type: 'array',
            items: { type: 'string' }
        },
        interest_ids: {
            type: 'array',
            items: { type: 'string' }
        },
        mobile: {
            type: 'string',
            minLength: 10,
            maxLength: 20,
            pattern: '^[0-9+\\-() ]+$'
        }
    },
    additionalProperties: true,
    minProperties: 1 // At least one field must be provided
};

/** Schema to validate all users paginated. */
export const getAllUsersPaginatedSchema = {
    type: 'object',
    properties: {
        page: {
            type: 'string',
            minLength: 1
        },
        limit: {
            type: 'string',
            minLength: 1
        },
        search: {
            type: 'string',
            maxLength: 255
        },
        orderBy: {
            type: 'string',
            enum: ['name', 'email', 'mobile', 'username']
        },
        orderDirection: {
            type: 'string',
            enum: ['ASC', 'DESC']
        }
    },
    additionalProperties: false,
};

/** Schema to validate FCM token and location update. */
export const updateFcmTokenAndLocationSchema = {
    type: 'object',
    properties: {
        fcm_token: {
            type: ['string', 'null'],
            minLength: 0
        },
        latitude: {
            type: ['string', 'null']
        },
        longitude: {
            type: ['string', 'null']
        }
    },
    additionalProperties: false,
    minProperties: 1 // At least one field must be provided
};

/** Schema to validate network broadcast (email and SMS). */
export const networkBroadcastSchema = {
    type: 'object',
    properties: {
        event_id: {
            type: 'string',
            format: 'uuid'
        },
        type: {
            type: 'string',
            enum: ['email', 'sms']
        }
    },
    required: ['event_id', 'type'],
    additionalProperties: false
};