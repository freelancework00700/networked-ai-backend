import { MediaContext } from "../types/enums";

/**
 * Validation schema for uploading media
 * @returns The validation schema for uploading media
 */
export const uploadMediaSchema = {
    type: 'object',
    properties: {
        context: {
            type: 'string',
            enum: Object.values(MediaContext),
        },
    },
    required: ['context'],
    additionalProperties: false,
};