export const likeCommentSchema = {
    type: 'object',
    properties: {
        comment_id: { type: 'string', format: 'uuid' },
    },
    required: ['comment_id'],
    additionalProperties: false,
};

