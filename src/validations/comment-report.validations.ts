export const createCommentReportSchema = {
    type: 'object',
    properties: {
        comment_id: { type: 'string', format: 'uuid' },
        reason_id: { type: 'string', format: 'uuid' },
        reason: { type: 'string', minLength: 1 },
    },
    required: ['comment_id'],
    additionalProperties: false,
};

export const updateCommentReportSchema = {
    type: 'object',
    properties: {
        reason_id: { type: 'string', format: 'uuid' },
        reason: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
    minProperties: 1,
};

