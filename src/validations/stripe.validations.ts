export const createSubscriptionPaymentIntentSchema = {
    type: 'object',
    properties: {
        priceId: {
            type: 'string',
            format: 'uuid',
        },
    },
    required: ['priceId'],
    additionalProperties: false,
};

export const createPaymentIntentSchema = {
    type: 'object',
    properties: {
        event_id: {
            type: 'string',
            format: 'uuid',
        },
        subtotal: {
            type: 'number',
            minimum: 0,
        },
        total: {
            type: 'number',
            minimum: 0,
        },
    },
    required: ['event_id', 'subtotal', 'total'],
    additionalProperties: false,
};

export const updatePaymentIntentSchema = {
    type: 'object',
    properties: {
        stripe_payment_intent_id: {
            type: 'string',
            minLength: 1,
        },
        event_id: {
            type: 'string',
            format: 'uuid',
        },
        subtotal: {
            type: 'number',
            minimum: 0,
        },
        total: {
            type: 'number',
            minimum: 0,
        },
    },
    required: ['stripe_payment_intent_id', 'event_id', 'subtotal', 'total'],
    additionalProperties: false,
};


