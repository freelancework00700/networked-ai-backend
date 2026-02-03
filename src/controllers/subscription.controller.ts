import { User } from '../models/index';
import { SubscriptionStatus } from '../types/enums';
import loggerService from '../utils/logger.service';
import stripeService from '../services/stripe.service';
import { NextFunction, Request, Response } from 'express';
import subscriptionService from '../services/subscription.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/**
 * Get all subscriptions of the current user with pagination
 * @route GET /api/subscription
 */
export const getCurrentUserSubscriptions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = res.locals.auth?.user;
        const { page, limit } = req.query;

        const result = await subscriptionService.getUserSubscriptionsPaginated(user.id, Number(page), Number(limit));

        // Parse plan_benefits JSON string to array for each subscription
        const formattedData = result.data.map((subscription: any) => {
            if (subscription.product && subscription.product.plan_benefits) {
                try {
                    subscription.product.plan_benefits = JSON.parse(subscription.product.plan_benefits);
                } catch (error) {
                    // If parsing fails, keep as is or set to empty array
                    subscription.product.plan_benefits = [];
                }
            }
            return subscription;
        });

        return sendSuccessResponse(res, responseMessages.subscription.subscriptionsRetrieved, {
            data: formattedData,
            pagination: result.pagination,
        });
    } catch (error: any) {
        loggerService.error(`Error getting user subscriptions: ${error}`);
        return sendServerErrorResponse(res, responseMessages.subscription.failedToGetSubscriptions, error);
    }
};

/**
 * Get a single subscription of the current user by ID
 * @route GET /api/subscription/:id
 */
export const getCurrentUserSubscriptionById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = res.locals.auth?.user;
        const { id } = req.params;

        if (!id) {
            return sendServerErrorResponse(res, responseMessages.subscription.subscriptionIdRequired, null);
        }

        const subscription = await subscriptionService.getSubscriptionByIdForUser(id, user.id);

        if (!subscription) {
            return sendServerErrorResponse(res, responseMessages.subscription.subscriptionNotFound, null);
        }

        // Parse plan_benefits JSON string to array
        const formattedSubscription: any = subscription;
        if (formattedSubscription.product && formattedSubscription.product.plan_benefits) {
            try {
                formattedSubscription.product.plan_benefits = JSON.parse(formattedSubscription.product.plan_benefits);
            } catch (error) {
                formattedSubscription.product.plan_benefits = [];
            }
        }

        return sendSuccessResponse(res, responseMessages.subscription.subscriptionRetrieved, formattedSubscription);
    } catch (error: any) {
        loggerService.error(`Error getting subscription by id: ${error}`);
        return sendServerErrorResponse(res, responseMessages.subscription.failedToGetSubscriptions, error);
    }
};

/**
 * Create subscription payment intent
 * @route POST /api/subscription/payment-intent
 */
export const createSubscriptionPaymentIntent = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = res.locals.auth?.user;
        const { priceId } = req.body;

        // Get email from authenticated user
        if (!user.email) {
            return sendBadRequestResponse(res, responseMessages.stripe.emailRequired);
        }

        // Step 1: Find price in database and get stripe account ID, product ID, Stripe price ID, and owner ID
        const priceData = await stripeService.findPriceAndGetStripeAccountId(priceId);
        if (!priceData) {
            return sendNotFoundResponse(res, responseMessages.stripe.priceNotFound);
        }

        const { stripeAccountId, productId, stripePriceId, ownerId } = priceData;

        // Step 3: Get customer ID from user or lookup/create one
        let customerId = user.stripe_customer_id;

        if (!customerId) {
            // Lookup or create customer by email
            customerId = await stripeService.lookupOrCreateCustomer(user.email, user.id);
            if (!customerId) {
                return sendServerErrorResponse(res, responseMessages.stripe.failedToCreateSubscriptionIntent);
            }

            // Update user with customer ID
            await User.update(
                { stripe_customer_id: customerId },
                { where: { id: user.id } }
            );
        }

        // Step 4: Create the subscription payment intent with product, price, user, and owner IDs in metadata
        const subscriptionData = await stripeService.createSubscriptionPaymentIntent(
            stripePriceId,
            stripeAccountId,
            customerId,
            productId,
            priceId,
            user.id,
            ownerId
        );

        if (!subscriptionData) {
            return sendServerErrorResponse(res, responseMessages.stripe.failedToCreateSubscriptionIntent);
        }

        return sendSuccessResponse(res, responseMessages.stripe.subscriptionIntentCreated, subscriptionData);
    } catch (error: any) {
        loggerService.error(`Error creating subscription payment intent: ${error}`);
        return sendServerErrorResponse(res, responseMessages.stripe.failedToCreateSubscriptionIntent, error);
    }
};

/**
 * Cancel a Stripe subscription by database subscription ID
 * @route POST /api/subscription/:subscriptionId/cancel
 */
export const cancelSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = res.locals.auth?.user;
        const { subscriptionId } = req.params;

        if (!subscriptionId) {
            return sendBadRequestResponse(res, responseMessages.stripe.subscriptionIdRequired);
        }

        // Find subscription by database ID
        const dbSubscription = await subscriptionService.getSubscriptionById(subscriptionId);

        if (!dbSubscription) {
            return sendNotFoundResponse(res, responseMessages.stripe.subscriptionNotFound);
        }

        // Permission check: only subscriber or owner can cancel
        if (dbSubscription.user_id !== user.id && dbSubscription.owner_id !== user.id) {
            return sendBadRequestResponse(res, responseMessages.stripe.productPermissionDenied);
        }

        // If already canceled (status + cancel_at_end_date), do nothing
        if (
            dbSubscription.cancel_at_end_date === true ||
            dbSubscription.status === SubscriptionStatus.CANCELED
        ) {
            return sendSuccessResponse(res, responseMessages.stripe.subscriptionAlreadyCanceled);
        }

        // Cancel subscription in Stripe
        await stripeService.cancelStripeSubscription(dbSubscription.stripe_subscription_id);

        // Update subscription status in database
        await subscriptionService.updateSubscriptionByStripeId(
            dbSubscription.stripe_subscription_id,
            {
                canceled_at: new Date(),
                cancel_at_end_date: true,
            }
        );

        loggerService.info(`Subscription ${dbSubscription.stripe_subscription_id} canceled by user ${user.id}`);

        return sendSuccessResponse(res, responseMessages.stripe.subscriptionCanceled);
    } catch (error: any) {
        loggerService.error(`Error canceling subscription: ${error.message}`);
        return sendServerErrorResponse(res, responseMessages.stripe.failedToCancelSubscription, error);
    }
};

export default {
    cancelSubscription,
    getCurrentUserSubscriptions,
    getCurrentUserSubscriptionById,
    createSubscriptionPaymentIntent
};

