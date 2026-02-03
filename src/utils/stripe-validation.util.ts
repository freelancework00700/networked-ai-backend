import { Op, Transaction } from 'sequelize';
import { Response } from 'express';
import { Event } from '../models/index';
import { StripeAccountStatus } from '../types/enums';
import { responseMessages } from './response-message.service';
import { sendBadRequestResponse } from './response.service';

/**
 * Validate user's Stripe account status
 * @param user - User object from auth middleware
 * @param res - Express response object
 * @param transaction - Database transaction (optional, for rollback)
 * @returns true if valid, false if invalid (response already sent)
 */
export const validateStripeAccount = async (
    user: any,
    res: Response,
    transaction?: Transaction
): Promise<boolean> => {
    const { stripe_account_id, stripe_account_status } = user;

    if (!stripe_account_id) {
        if (transaction) await transaction.rollback();
        sendBadRequestResponse(res, responseMessages.stripe.accountNotOnboarded);
        return false;
    }

    if (stripe_account_status !== StripeAccountStatus.ACTIVE) {
        if (transaction) await transaction.rollback();
        sendBadRequestResponse(res, responseMessages.stripe.accountNotActive);
        return false;
    }

    return true;
};

/**
 * Validate event IDs exist in database
 * @param eventIds - Array of event IDs to validate
 * @param res - Express response object
 * @param transaction - Database transaction
 * @returns true if all valid, false if invalid (response already sent)
 */
export const validateEventIds = async (
    eventIds: string[],
    res: Response,
    transaction: Transaction
): Promise<boolean> => {
    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
        return true; // Empty array is valid (no events to validate)
    }

    const existingEvents = await Event.findAll({
        where: {
            id: { [Op.in]: eventIds },
            is_deleted: false,
        },
        attributes: ['id'],
        transaction,
    });

    const existingEventIds = existingEvents.map(event => event.id);
    const invalidEventIds = eventIds.filter(id => !existingEventIds.includes(id));

    if (invalidEventIds.length > 0) {
        await transaction.rollback();
        sendBadRequestResponse(res, `Invalid event id: ${invalidEventIds.join(', ')}`);
        return false;
    }

    return true;
};

