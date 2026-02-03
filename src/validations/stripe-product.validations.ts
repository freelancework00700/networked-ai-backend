export const createStripeProductSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
        },
        description: {
            type: 'string',
        },
        prices: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                properties: {
                    amount: {
                        type: 'number',
                        minimum: 0,
                    },
                    interval: {
                        type: 'string',
                        enum: ['month', 'year'],
                    },
                    discount_percentage: {
                        type: ['number', 'null'],
                        minimum: 0,
                        maximum: 100,
                    },
                    banner_display_type: {
                        anyOf: [
                            { type: 'null' },
                            { type: 'string', enum: ['fixed', 'percentage'] }
                        ]
                    },
                },
                required: ['amount', 'interval'],
                additionalProperties: false,
            },
        },
        is_sponsor: {
            type: 'boolean',
        },
        plan_benefits: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        event_ids: {
            type: 'array',
            items: {
                type: 'string',
                format: 'uuid',
            },
        },
    },
    required: ['name', 'prices'],
    additionalProperties: false,
};

export const updateStripeProductSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
        },
        description: {
            type: 'string',
        },
        prices: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                properties: {
                    amount: {
                        type: 'number',
                        minimum: 0,
                    },
                    interval: {
                        type: 'string',
                        enum: ['month', 'year'],
                    },
                    discount_percentage: {
                        type: ['number', 'null'],
                        minimum: 0,
                        maximum: 100,
                    },
                    banner_display_type: {
                        anyOf: [
                            { type: 'null' },
                            { type: 'string', enum: ['fixed', 'percentage'] }
                        ]
                    },
                },
                required: ['amount', 'interval'],
                additionalProperties: false,
            },
        },
        is_sponsor: {
            type: 'boolean',
        },
        plan_benefits: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        event_ids: {
            type: 'array',
            items: {
                type: 'string',
                format: 'uuid',
            },
        },
    },
    required: ['name', 'prices'],
    additionalProperties: false,
};

