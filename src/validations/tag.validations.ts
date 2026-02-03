export const createTagSchema = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
    },
    required: ['name'],
    additionalProperties: false,
};

export const updateTagSchema = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
    },
    additionalProperties: false,
    minProperties: 1,
};

export const getAllTagsSchema = {
    type: 'object',
    properties: {
        page: { type: 'string', minLength: 1 },
        limit: { type: 'string', minLength: 1 },
        search: { type: 'string', maxLength: 255 },
        order_by: { type: 'string', enum: ['name', 'created_at'] },
        order_direction: { type: 'string', enum: ['ASC', 'DESC'] },
    },
    additionalProperties: false,
};

export const getTagCustomersSchema = {
    type: 'object',
    properties: {
        page: { type: 'string', minLength: 1 },
        limit: { type: 'string', minLength: 1 },
        search: { type: 'string', maxLength: 255 },
        order_by: { type: 'string', enum: ['name', 'email', 'mobile', 'created_at'] },
        order_direction: { type: 'string', enum: ['ASC', 'DESC'] },
    },
    additionalProperties: false,
};
