export const createFeedCommentSchema = {
    type: 'object',
    properties: {
        feed_id: { type: 'string', format: 'uuid' },
        comment: { type: 'string', minLength: 1 },
        parent_comment_id: { type: 'string' },
        mention_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
    required: ['feed_id', 'comment'],
    additionalProperties: false,
};

export const updateFeedCommentSchema = {
    type: 'object',
    properties: {
        comment: { type: 'string', minLength: 1 },
        mention_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
    required: ['comment'],
    additionalProperties: false,
};

