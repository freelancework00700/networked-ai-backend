import { RSVPStatus, TicketType } from "../types/enums";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const csvEnumPattern = (values: string[]) => {
    const group = values.map(escapeRegex).join('|');
    // allow optional whitespace after commas (e.g. "Yes, No")
    return `^(?:${group})(?:,\\s*(?:${group}))*$`;
};

/** Schema to validate event attendees */
export const createEventAttendeeSchema = {
    type: 'object',
    properties: {
        event_id: { type: 'string', format: 'uuid' },
        stripe_payment_intent_id: { 
            type: ['string', 'null'], 
            minLength: 1,
            nullable: true 
        },
        attendees: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                properties: {
                    parent_user_id: { type: ['string', 'null'] },
                    name: { type: ['string', 'null'] },
                    is_incognito: { type: 'boolean' },
                    rsvp_status: { type: 'string', enum: Object.values(RSVPStatus) },
                    event_ticket_id: { type: ['string', 'null'] },
                    event_promo_code_id: { type: ['string', 'null'] },
                    platform_fee_amount: { type: 'number', minimum: 0 },
                    amount_paid: { type: 'number', minimum: 0 },
                    host_payout_amount: { type: 'number', minimum: 0 }
                },
                required: ['rsvp_status'],
                additionalProperties: false
            }
        }
    },
    required: ['event_id', 'attendees'],
    additionalProperties: false
};

/** Schema to validate updating event attendees - only allows rsvp_status, is_incognito, and name */
export const updateEventAttendeeSchema = {
    type: 'object',
    properties: {
        rsvp_status: { type: 'string', enum: Object.values(RSVPStatus) },
        is_incognito: { type: 'boolean' },
        name: { type: ['string', 'null'] }
    },
    additionalProperties: false
};

/** Schema to validate attendee listing with filters */
export const getEventAttendeesQuerySchema = {
    type: 'object',
    properties: {
        event_id: { type: 'string', format: 'uuid' },
        rsvp_status: {
            anyOf: [
                { type: 'string', enum: Object.values(RSVPStatus) },
                { type: 'string', pattern: csvEnumPattern(Object.values(RSVPStatus)) },
            ],
        },
        is_checked_in: { type: 'string', enum: ['true', 'false', '1', '0'] },
        ticket_type: {
            anyOf: [
                { type: 'string', enum: Object.values(TicketType) },
                { type: 'string', pattern: csvEnumPattern(Object.values(TicketType)) },
            ],
        },
        is_connected: { type: 'string', enum: ['true', 'false', '1', '0'] },
        page: { type: 'string', pattern: '^[0-9]+$' },
        limit: { type: 'string', pattern: '^[0-9]+$' },
        search: { type: 'string' },
    },
    required: ['event_id'],
    additionalProperties: false
};

/** Schema to validate update attendee check-in status */
export const updateAttendeeCheckInSchema = {
    type: 'object',
    properties: {
        is_scanned: { type: 'boolean' },
        is_checked_in: { type: 'boolean' },
        event_id: { type: 'string', format: 'uuid' },
        attendee_id: { type: 'string', format: 'uuid' },
    },
    required: ['event_id', 'attendee_id', 'is_checked_in'],
    additionalProperties: false
};
