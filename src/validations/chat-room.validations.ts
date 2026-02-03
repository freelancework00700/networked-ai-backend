/** Schema to validate create chat room request */
export const createChatRoomSchema = {
    type: 'object',
    properties: {
        user_ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' }
        },
        name: { type: ['string', 'null'], maxLength: 255 },
        is_personal: { type: 'boolean' },
        event_id: { type: ['string', 'null'], format: 'uuid' },
        event_image: { type: ['string', 'null'], maxLength: 500 },
        profile_image: { type: ['string', 'null'], maxLength: 500 }
    },
    additionalProperties: false
};

/** Schema to validate create broadcast room request */
export const broadcastCreateSchema = {
    type: 'object',
    properties: {
        user_ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1
        },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        broadcast_owner: { type: 'string', format: 'uuid' }
    },
    required: ['user_ids', 'name', 'broadcast_owner'],
    additionalProperties: false
};

/** Schema to validate join room request */
export const joinRoomSchema = {
    type: 'object',
    properties: {
        user_ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1
        },
        chat_room_id: { type: 'string', format: 'uuid' }
    },
    required: ['user_ids', 'chat_room_id'],
    additionalProperties: false
};

/** Schema to validate get room by ID request */
export const getRoomSchema = {
    type: 'object',
    properties: {
        room_id: { type: 'string', format: 'uuid' }
    },
    required: ['room_id'],
    additionalProperties: false
};

/** Schema to validate get room by event ID request */
export const getRoomByEventIdSchema = {
    type: 'object',
    properties: {
        event_id: { type: 'string', format: 'uuid' }
    },
    required: ['event_id'],
    additionalProperties: false
};

/** Schema to validate get all rooms by user ID request */
export const getAllRoomsSchema = {
    type: 'object',
    properties: {
        user_id: { type: 'string', format: 'uuid' }
    },
    required: ['user_id'],
    additionalProperties: false
};

/** Schema to validate delete room request */
export const deleteRoomSchema = {
    type: 'object',
    properties: {
        room_id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string', format: 'uuid' }
    },
    required: ['room_id', 'user_id'],
    additionalProperties: false
};

/** Schema to validate get rooms by user ID request */
export const getRoomByUserSchema = {
    type: 'object',
    properties: {
        filter: {
            type: 'string',
            enum: ['all', 'unread', 'group', 'event', 'network']
        },
        page: {
            type: 'string',
            pattern: '^[0-9]+$'
        },
        limit: {
            type: 'string',
            pattern: '^[0-9]+$'
        },
        search: {
            type: 'string'
        }
    },
    required: [],
    additionalProperties: false
};

export const updateChatRoomSchema = {
    type: 'object',
    properties: {
        name: { type: ['string', 'null'], maxLength: 255 },
        profile_image: { type: ['string', 'null'], maxLength: 500 }
    },
    anyOf: [
        { required: ['name'] },
        { required: ['profile_image'] }
    ],
    additionalProperties: false
};

/** Schema to validate share in chat request */
export const shareInChatSchema = {
    type: 'object',
    properties: {
        peer_ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 0
        },
        send_entire_network: { type: 'boolean' },
        message: { type: ['string', 'null'] },
        type: {
            type: 'string',
            enum: ['Text', 'Image', 'Video', 'File', 'Post', 'Event']
        },
        feed_id: {
            type: ['string', 'null'],
            format: 'uuid'
        },
        event_id: {
            type: ['string', 'null'],
            format: 'uuid'
        }
    },
    required: ['send_entire_network'],
    additionalProperties: false
};

