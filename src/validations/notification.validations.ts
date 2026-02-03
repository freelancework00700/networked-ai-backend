import { NotificationType } from '../types/enums';

/** Schema to validate query parameters for getting notifications. */
export const getNotificationsSchema = {
    type: 'object',
    properties: {
        page: {
            type: 'string',
            minLength: 1,
        },
        limit: {
            type: 'string',
            minLength: 1,
        },
        type: {
            type: 'string',
            enum: [...Object.values(NotificationType), 'All', 'Unread'],
        }
    },
    additionalProperties: false,
};
