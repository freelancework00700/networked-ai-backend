// Send a network connection request
export const createRequestSchema = {
    type: 'object',
    properties: {
        peer_user_id: {
            type: 'string',
            format: 'uuid'
        },
    },
    required: ['peer_user_id'],
    additionalProperties: false,
};

// Cancel network connection request
export const cancelRequestSchema = {
    type: 'object',
    properties: {
        peer_user_id: {
            type: 'string',
            format: 'uuid'
        },
    },
    required: ['peer_user_id'],
    additionalProperties: false,
};

// Reject network connection request
export const rejectRequestSchema = {
    type: 'object',
    properties: {
        peer_user_id: {
            type: 'string',
            format: 'uuid'
        },
    },
    required: ['peer_user_id'],
    additionalProperties: false,
};

// Accept network connection request
export const acceptRequestSchema = {
    type: 'object',
    properties: {
        peer_user_id: {
            type: 'string',
            format: 'uuid'
        },
    },
    required: ['peer_user_id'],
    additionalProperties: false,
};

// Remove network connection
export const removeConnectionSchema = {
    type: 'object',
    properties: {
        peer_user_id: {
            type: 'string',
            format: 'uuid'
        },
    },
    required: ['peer_user_id'],
    additionalProperties: false,
};
/** Schema to validate people you might know query. */
export const peopleYouMightKnowSchema = {
    type: 'object',
    properties: {
        radius: {
            type: 'string',
            pattern: '^[0-9]+(\\.[0-9]+)?$',
            minLength: 1,
            maxLength: 1000
        },
        limit: {
            type: 'string',
            pattern: '^[0-9]+$',
            minLength: 1,
            maxLength: 100
        }
    },
    additionalProperties: false,
};

/** Schema to validate networks within radius query. */
export const networksWithinRadiusSchema = {
    type: 'object',
    properties: {
        radius: {
            type: 'string',
            pattern: '^[0-9]+(\\.[0-9]+)?$',
            minLength: 1,
            maxLength: 1000
        },
        latitude: {
            type: 'string'
        },
        longitude: {
            type: 'string'
        }
    },
    additionalProperties: false,
};

/** Schema to validate get network connections query. */
export const getNetworkConnectionsSchema = {
    type: 'object',
    properties: {
        userId: {
            type: 'string',
            format: 'uuid'
        },
        page: {
            type: 'string',
            pattern: '^[0-9]+$',
            minLength: 1
        },
        limit: {
            type: 'string',
            pattern: '^[0-9]+$',
            minLength: 1
        },
        search: {
            type: 'string'
        },
        latitude: {
            type: 'string'
        },
        longitude: {
            type: 'string'
        },
        radius: {
            type: 'string',
            pattern: '^[0-9]+(\.[0-9]+)?$'
        }
    },
    additionalProperties: false,
};

/** Schema to validate get all received requests query. */
export const getAllReceivedRequestsSchema = {
    type: 'object',
    properties: {
        page: {
            type: 'string',
            pattern: '^[0-9]+$',
            minLength: 1
        },
        limit: {
            type: 'string',
            pattern: '^[0-9]+$',
            minLength: 1
        },
        search: {
            type: 'string'
        }
    },
    additionalProperties: false,
};