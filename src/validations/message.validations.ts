/** Schema to validate post message request */
export const postMessageSchema = {
    type: 'object',
    properties: {
        room_id: { type: 'string', format: 'uuid' },
        message: { type: ['string', 'null'], maxLength: 5000 },
        post_id: { type: ['string', 'null'], format: 'uuid' },
        event_id: { type: ['string', 'null'], format: 'uuid' }
    },
    required: ['room_id'],
    additionalProperties: false
};

/** Schema to validate update message request */
export const updateMessageSchema = {
    type: 'object',
    properties: {
        room_id: { type: 'string', format: 'uuid' },
        message_id: { type: 'string', format: 'uuid' },
        message: { type: ['string', 'null'], maxLength: 5000 }
    },
    required: ['room_id', 'message_id'],
    additionalProperties: false
};

/** Schema to validate reaction to message request */
export const reactionToMessageSchema = {
    type: 'object',
    properties: {
        reaction_type: { type: 'string', minLength: 1, maxLength: 50 }
    },
    required: ['reaction_type'],
    additionalProperties: false
};

/** Schema to validate send individual message request */
export const sendIndividualMessageSchema = {
    type: 'object',
    properties: {
        user_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        message: { type: ['string', 'null'], maxLength: 5000 },
        post_id: { type: ['string', 'null'], format: 'uuid' },
        event_id: { type: ['string', 'null'], format: 'uuid' }
    },
    required: ['user_ids'],
    additionalProperties: false
};
