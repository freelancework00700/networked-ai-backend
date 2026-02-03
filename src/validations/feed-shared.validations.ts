export const shareFeedSchema = {
    type: 'object',
    properties: {
        feed_id: { type: 'string', format: 'uuid' },
        peer_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        send_entire_network: { type: 'boolean' },
    },
    required: ['feed_id'],
    additionalProperties: false,
};

