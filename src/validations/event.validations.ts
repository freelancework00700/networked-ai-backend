import {
    MediaType,
    EventParticipantRole,
    EventPhase,
    QuestionType,
    RepeatingFrequency,
    PromoCodeType,
    TicketType,
} from '../types/enums';

/** Schema to validate event creation. */
export const createEventSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: ['string', 'null'] },
            address: { type: ['string', 'null'], maxLength: 255 },
            latitude: { type: ['string', 'null'] },
            longitude: { type: ['string', 'null'] },
            city: { type: ['string', 'null'], maxLength: 100 },
            state: { type: ['string', 'null'], maxLength: 100 },
            country: { type: ['string', 'null'], maxLength: 100 },
            category_id: { type: 'string', minLength: 1 },
            is_paid_event: { type: 'boolean' },
            start_date: { type: 'string', format: 'date-time' },
            end_date: { type: 'string', format: 'date-time' },
            capacity: { type: ['integer', 'null'], minimum: 0 },
            is_public: { type: 'boolean' },
            parent_event_id: { type: ['string', 'null'] },
    
            /** Vibes input */
            vibes: {
                type: 'array',
                items: { type: 'string', minLength: 1 }
            },
    
            /** Settings input */
            settings: {
                type: 'object',
                properties: {
                    is_repeating_event: { type: 'boolean' },
                    repeating_frequency: { type: ['string', 'null'], enum: [...Object.values(RepeatingFrequency), null] },
                    is_rsvp_approval_required: { type: 'boolean' },
                    is_show_timer: { type: 'boolean' },
                    max_attendees_per_user: { type: ['integer', 'null'], minimum: 0 },
                    host_pays_platform_fee: { type: 'boolean' },
                    additional_fees: { type: ['number', 'null'], minimum: 0 },
                    is_subscriber_exclusive: { type: 'boolean' }
                },
                required: [],
                additionalProperties: false
            },
    
            /** Media input */
            medias: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        media_url: { type: 'string', minLength: 1, maxLength: 255 },
                        media_type: { type: 'string', enum: Object.values(MediaType) },
                        order: { type: ['integer', 'null'], minimum: 0 }
                    },
                    required: ['media_url', 'media_type'],
                    additionalProperties: false
                }
            },
    
            /** Tickets input */
            tickets: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', minLength: 1, maxLength: 100 },
                        price: { type: 'number', minimum: 0 },
                        quantity: { type: 'integer', minimum: 0 },
                        description: { type: 'string' },
                        ticket_type: { type: 'string', enum: Object.values(TicketType) },
                        sales_start_date: { type: 'string', format: 'date-time' },
                        sales_end_date: { type: 'string', format: 'date-time' },
                        end_at_event_start: { type: 'boolean' },
                        order: { type: ['integer', 'null'], minimum: 0 }
                    },
                    required: ['name', 'price', 'quantity', 'description', 'ticket_type', 'sales_start_date', 'sales_end_date', 'end_at_event_start'],
                    additionalProperties: false
                }
            },
    
            /** Promo codes input */
            promo_codes: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        promo_code: { type: 'string', minLength: 1, maxLength: 100 },
                        type: { type: 'string', enum: Object.values(PromoCodeType) },
                        value: { type: 'number', minimum: 0 },
                        capped_amount: { type: ['number', 'null'], minimum: 0 },
                        quantity: { type: ['integer', 'null'], minimum: 0 },
                        max_uses_per_user: { type: ['integer', 'null'], minimum: 0 }
                    },
                    required: ['promo_code', 'type', 'value'],
                    additionalProperties: false
                }
            },
    
            /** Participants input */
            participants: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        user_id: { type: 'string', minLength: 1 },
                        role: { type: 'string', enum: Object.values(EventParticipantRole) }
                    },
                    required: ['user_id', 'role'],
                    additionalProperties: false
                }
            },
    
            /** Questionnaire input */
            questionnaire: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        question: { type: 'string', minLength: 1 },
                        event_phase: { type: 'string', enum: Object.values(EventPhase) },
                        question_type: { type: 'string', enum: Object.values(QuestionType) },
                        is_required: { type: 'boolean' },
                        max: { type: ['integer', 'null'] },
                        min: { type: ['integer', 'null'] },
                        rating_scale: { type: ['integer', 'null'], minimum: 1 },
                        is_public: { type: 'boolean' },
                        order: { type: ['integer', 'null'], minimum: 0 },
                        options: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    option: { type: 'string', minLength: 1 },
                                    order: { type: ['integer', 'null'], minimum: 0 }
                                },
                                required: ['option'],
                                additionalProperties: false
                            }
                        }
                    },
                    required: ['question', 'event_phase', 'question_type', 'is_required', 'is_public'],
                    additionalProperties: false
                }
            },
    
            /** Plan IDs input */
            plan_ids: {
                type: 'array',
                items: { type: 'string', minLength: 1 }
            }
        },
    },
    required: ['title', 'category_id', 'start_date', 'end_date', 'settings'],
    additionalProperties: false
};

/** Schema to validate event update. */
export const updateEventSchema = {
    type: 'object',
    properties: {
        notify: { type: 'boolean' },
        title: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: ['string', 'null'] },
        address: { type: ['string', 'null'], maxLength: 255 },
        latitude: { type: ['string', 'null'] },
        longitude: { type: ['string', 'null'] },
        city: { type: ['string', 'null'], maxLength: 100 },
        state: { type: ['string', 'null'], maxLength: 100 },
        country: { type: ['string', 'null'], maxLength: 100 },
        category_id: { type: 'string', minLength: 1 },
        is_paid_event: { type: 'boolean' },
        start_date: { type: 'string', format: 'date-time' },
        end_date: { type: 'string', format: 'date-time' },
        capacity: { type: ['integer', 'null'], minimum: 0 },
        is_public: { type: 'boolean' },
        parent_event_id: { type: ['string', 'null'] },

        /** Vibes input */
        vibes: {
            type: 'array',
            items: { type: 'string', minLength: 1 }
        },

        /** Settings input */
        settings: {
            type: 'object',
            properties: {
                is_repeating_event: { type: 'boolean' },
                repeating_frequency: { type: ['string', 'null'], enum: [...Object.values(RepeatingFrequency), null] },
                is_rsvp_approval_required: { type: 'boolean' },
                is_show_timer: { type: 'boolean' },
                max_attendees_per_user: { type: ['integer', 'null'], minimum: 0 },
                host_pays_platform_fee: { type: 'boolean' },
                additional_fees: { type: ['number', 'null'], minimum: 0 },
                is_subscriber_exclusive: { type: 'boolean' }
            },
            required: [],
            additionalProperties: false
        },

        /** Media input */
        medias: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    media_url: { type: 'string', minLength: 1, maxLength: 255 },
                    media_type: { type: 'string', enum: Object.values(MediaType) },
                    order: { type: ['integer', 'null'], minimum: 0 }
                },
                required: ['media_url', 'media_type'],
                additionalProperties: false
            }
        },

        /** Tickets input */
        tickets: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string', minLength: 1, maxLength: 100 },
                    price: { type: 'number', minimum: 0 },
                    quantity: { type: 'integer', minimum: 0 },
                    description: { type: 'string' },
                    ticket_type: { type: 'string', enum: Object.values(TicketType) },
                    sales_start_date: { type: 'string', format: 'date-time' },
                    sales_end_date: { type: 'string', format: 'date-time' },
                    end_at_event_start: { type: 'boolean' },
                    order: { type: ['integer', 'null'], minimum: 0 }
                },
                required: ['name', 'price', 'quantity', 'description', 'ticket_type', 'sales_start_date', 'sales_end_date', 'end_at_event_start'],
                additionalProperties: false
            }
        },

        /** Promo codes input */
        promo_codes: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    promo_code: { type: 'string', minLength: 1, maxLength: 100 },
                    type: { type: 'string', enum: Object.values(PromoCodeType) },
                    value: { type: 'number', minimum: 0 },
                    capped_amount: { type: ['number', 'null'], minimum: 0 },
                    quantity: { type: ['integer', 'null'], minimum: 0 },
                    max_uses_per_user: { type: ['integer', 'null'], minimum: 0 }
                },
                required: ['promo_code', 'type', 'value'],
                additionalProperties: false
            }
        },

        /** Participants input */
        participants: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    user_id: { type: 'string', minLength: 1 },
                    role: { type: 'string', enum: Object.values(EventParticipantRole) }
                },
                required: ['user_id', 'role'],
                additionalProperties: false
            }
        },

        /** Questionnaire input */
        questionnaire: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    question: { type: 'string', minLength: 1 },
                    event_phase: { type: 'string', enum: Object.values(EventPhase) },
                    question_type: { type: 'string', enum: Object.values(QuestionType) },
                    is_required: { type: 'boolean' },
                    max: { type: ['integer', 'null'] },
                    min: { type: ['integer', 'null'] },
                    rating_scale: { type: ['integer', 'null'], minimum: 1 },
                    is_public: { type: 'boolean' },
                    order: { type: ['integer', 'null'], minimum: 0 },
                    options: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                option: { type: 'string', minLength: 1 },
                                order: { type: ['integer', 'null'], minimum: 0 }
                            },
                            required: ['option'],
                            additionalProperties: false
                        }
                    }
                },
                required: ['question', 'event_phase', 'question_type', 'is_required', 'is_public'],
                additionalProperties: false
            }
        },

        /** Plan IDs input */
        plan_ids: {
            type: 'array',
            items: { type: 'string', minLength: 1 }
        }
    },
    additionalProperties: false
};

/** Schema to validate upserting an event participant role. */
export const upsertEventParticipantRoleSchema = {
    type: 'object',
    properties: {
        user_id: { type: 'string', minLength: 1 },
        role: { type: 'string', enum: [...Object.values(EventParticipantRole), 'None'] },
    },
    required: ['user_id', 'role'],
    additionalProperties: false,
};

/** Schema to validate event report. */
export const reportEventSchema = {
    type: 'object',
    properties: {
        report_reason_id: { type: 'string', minLength: 1 },
        reason: { type: ['string', 'null'], maxLength: 500 }
    },
    required: ['report_reason_id'],
    additionalProperties: false
};

/** Schema to validate event feedback. */
export const saveEventFeedbackSchema = {
    type: 'object',
    properties: {
        feedback: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    question_id: { type: 'string', minLength: 1 },
                    answer_option_id: { type: ['string', 'null'] },
                    answer: { type: ['string', 'null'], maxLength: 1000 }
                },
                required: ['question_id'],
                additionalProperties: false
            },
            minItems: 1
        }
    },
    required: ['feedback'],
    additionalProperties: false
};

/** Schema to validate event view. */
export const createEventViewSchema = {
    type: 'object',
    properties: {
        device_id: { type: ['string', 'null'] }
    },
    additionalProperties: false
};

/** Schema to validate query parameters for getting previous event attendees. */
export const getPreviousEventAttendeesSchema = {
    type: 'object',
    properties: {
        page: { type: 'string', minLength: 1 },
        limit: { type: 'string', minLength: 1 },
        user_id: { type: 'string' },
        event_id: { type: 'string' }
    },
    additionalProperties: false
};

/** Schema to validate query parameters for getting event attendees. */
export const getEventAttendeesSchema = {
    type: 'object',
    properties: {
        page: { type: 'string', minLength: 1 },
        limit: { type: 'string', minLength: 1 },
        search: { type: 'string', maxLength: 255 },
        rsvp_status: {
            type: 'string',
            pattern: '^(Yes|Maybe|No)(,(Yes|Maybe|No))*$',
            description: 'Comma-separated list of RSVP statuses (Yes,Maybe,No)'
        },
        order_by: { type: 'string', enum: ['name', 'created_at'], default: 'created_at' },
        order_direction: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' },
    },
    additionalProperties: false,
};

/** Schema to validate query parameters for getting event participants. */
export const getEventParticipantsSchema = {
    type: 'object',
    properties: {
        page: { type: 'string', minLength: 1 },
        limit: { type: 'string', minLength: 1 },
        search: { type: 'string', maxLength: 255 },
        role: { 
            type: 'string', 
            pattern: '^(Host|CoHost|Speaker|Sponsor|Staff)(,(Host|CoHost|Speaker|Sponsor|Staff))*$',
            description: 'Comma-separated list of roles (Host,CoHost,Speaker,Sponsor,Staff)'
        },
        order_by: { type: 'string', enum: ['name', 'role', 'created_at'], default: 'created_at' },
        order_direction: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' },
    },
    additionalProperties: false,
};