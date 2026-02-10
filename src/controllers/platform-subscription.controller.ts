import loggerService from '../utils/logger.service';
import { SubscriptionStatus } from '../types/enums';
import { NextFunction, Request, Response } from 'express';
import { responseMessages } from '../utils/response-message.service';
import platformSubscriptionService from '../services/platform-subscription.service';
import platformStripeProductService from '../services/platform-stripe-product.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

export const createPlatformSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = res.locals.auth?.user;
        
        const { price_id } = req.body;
        if (!price_id) return sendBadRequestResponse(res, responseMessages.subscription.priceIdRequired);

        const price = await platformStripeProductService.getPlatformStripePriceWithProduct(price_id);
        if (!price) return sendBadRequestResponse(res, responseMessages.subscription.priceNotFound);

        const result = await platformSubscriptionService.createPlatformSubscription(user, price);
        if(!result) return sendBadRequestResponse(res, responseMessages.subscription.failedToCreateSubscription);
        return sendSuccessResponse(res, responseMessages.subscription.subscriptionCreated, result);
    } catch (error: any) {
        loggerService.error(`Error creating platform subscription: ${error}`);
        return sendServerErrorResponse(res, responseMessages.subscription.failedToCreateSubscription, error);
    }
};

export const cancelPlatformSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = res.locals.auth?.user;

        const { subscription_id } = req.body;
        if (!subscription_id) return sendBadRequestResponse(res, responseMessages.subscription.subscriptionIdRequired);

        // Find subscription by database ID
        const dbSubscription = await platformSubscriptionService.getPlatformSubscriptionByStripeId(subscription_id);
        if (!dbSubscription) return sendNotFoundResponse(res, responseMessages.subscription.subscriptionNotFound);

        // Permission check: only subscriber can cancel platform subscriptions
        if (dbSubscription.user_id !== user.id) return sendBadRequestResponse(res, responseMessages.subscription.canCancelOnlyOwnSubscriptions);

        // If already canceled (status + cancel_at_end_date), do nothing
        if (
            dbSubscription.cancel_at_end_date ||
            dbSubscription.status === SubscriptionStatus.CANCELED
        ) {
            return sendSuccessResponse(res, responseMessages.stripe.subscriptionAlreadyCanceled);
        }

        const result = await platformSubscriptionService.cancelPlatformSubscription(user.id, subscription_id);
        return sendSuccessResponse(res, responseMessages.subscription.subscriptionCanceled, result);
    } catch (error: any) {
        loggerService.error(`Error canceling platform subscription: ${error}`);
        return sendServerErrorResponse(res, responseMessages.subscription.failedToCancelSubscription, error);
    }
};

export const createFreeSubscriptionsForAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await platformSubscriptionService.createFreeSubscriptionsForAllUsers();
        
        loggerService.info(`Free subscription creation completed. Success: ${result.success}, Failed: ${result.failed}`);
        
        if (result.errors.length > 0) {
            loggerService.error('Errors during free subscription creation:', result.errors);
        }
        
        return sendSuccessResponse(res, 'Free subscriptions processed successfully', result);
    } catch (error: any) {
        loggerService.error(`Error creating free subscriptions: ${error}`);
        return sendServerErrorResponse(res, 'Failed to create free subscriptions', error);
    }
};