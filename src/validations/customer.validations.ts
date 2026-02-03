export const createCustomerSchema = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        email: { type: ['string', 'null'], maxLength: 255 },
        mobile: { type: ['string', 'null'], maxLength: 50 },
        tag_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        segment_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
    required: ['name'],
    additionalProperties: false,
};

export const updateCustomerSchema = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        email: { type: ['string', 'null'], maxLength: 255 },
        mobile: { type: ['string', 'null'], maxLength: 50 },
        tag_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        segment_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
    additionalProperties: false,
    minProperties: 1,
};

export const getAllCustomersSchema = {
    type: 'object',
    properties: {
        page: { type: 'string', minLength: 1 },
        limit: { type: 'string', minLength: 1 },
        search: { type: 'string', maxLength: 255 },
        order_by: { type: 'string', enum: ['name', 'email', 'mobile', 'created_at'] },
        order_direction: { type: 'string', enum: ['ASC', 'DESC'] },
        tag_ids: {
            oneOf: [
                { type: 'string', minLength: 1 },
                { type: 'array', items: { type: 'string', format: 'uuid' } },
            ],
        },
        segment_ids: {
            oneOf: [
                { type: 'string', minLength: 1 },
                { type: 'array', items: { type: 'string', format: 'uuid' } },
            ],
        },
    },
    additionalProperties: false,
};
