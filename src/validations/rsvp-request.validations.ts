import { RSVPRequestStatus } from "../types/enums";

/** Schema to validate approve/reject RSVP request. */
export const approveRejectRSVPSchema = {
    type: 'object',
    properties: {
        action: { type: 'string', enum: [RSVPRequestStatus.APPROVED, RSVPRequestStatus.REJECTED] }
    },
    required: ['action'],
    additionalProperties: false
};

/** Schema to validate query parameters for getting RSVP requests. */
export const getRSVPRequestsSchema = {
    type: 'object',
    properties: {
        page: { type: 'string', minLength: 1 },
        limit: { type: 'string', minLength: 1 },
    },
    additionalProperties: false
};