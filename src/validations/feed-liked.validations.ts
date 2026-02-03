export const likeFeedSchema = {
    type: 'object',
    properties: {
        feed_id: { type: 'string', format: 'uuid' },
    },
    required: ['feed_id'],
    additionalProperties: false,
};

