export const createFeedReportSchema = {
    type: 'object',
    properties: {
        feed_id: { type: 'string', format: 'uuid' },
        reason_id: { type: 'string', format: 'uuid' },
        reason: { type: 'string', minLength: 1 },
    },
    required: ['feed_id'],
    additionalProperties: false,
};

export const updateFeedReportSchema = {
    type: 'object',
    properties: {
        reason_id: { type: 'string', format: 'uuid' },
        reason: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
    minProperties: 1,
};

