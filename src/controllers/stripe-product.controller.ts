import { sequelize } from '../server';
import { Subscription } from '../models';
import { SubscriptionStatus } from '../types/enums';
import loggerService from '../utils/logger.service';
import stripeService from '../services/stripe.service';
import { NextFunction, Request, Response } from 'express';
import stripePriceService from '../services/stripe-price.service';
import subscriptionService from '../services/subscription.service';
import { responseMessages } from '../utils/response-message.service';
import stripeProductService from '../services/stripe-product.service';
import { validateStripeAccount, validateEventIds } from '../utils/stripe-validation.util';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/** POST API: Create a new stripe product. */
export const createStripeProduct = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;
        const { name, description, prices, is_sponsor, plan_benefits, event_ids } = req.body;

        // Validate stripe account of user
        const isStripeAccountValid = await validateStripeAccount(user, res, transaction);
        if (!isStripeAccountValid) {
            return;
        }

        // Validate event_ids if provided
        const areEventIdsValid = await validateEventIds(event_ids || [], res, transaction);
        if (!areEventIdsValid) {
            return;
        }

        // Convert plan_benefits JSON string if provided
        const planBenefitsJson = plan_benefits ? JSON.stringify(plan_benefits) : null;

        // Step 1: Create product in stripe with metadata
        const stripeProduct = await stripeService.createStripeProduct(name, description, { userId: user.id });
        
        // Step 2: Create product in database
        const dbProduct = await stripeProductService.createStripeProduct(
            {
                name,
                active: true,
                user_id: user.id,
                is_sponsor: is_sponsor || false,
                description: description || null,
                stripe_product_id: stripeProduct.id,
                plan_benefits: planBenefitsJson || null,
                stripe_account_id: user.stripe_account_id || null,
            },
            user.id,
            transaction
        );

        // Step 3: Create prices in Stripe and database
        for (const price of prices) {
            // Create price in Stripe
            const stripePrice = await stripeService.createStripePrice(stripeProduct.id, price.amount, 'usd', price.interval);

            // Create price in database
            await stripePriceService.createStripePrice(
                {
                    active: true,
                    currency: 'usd',
                    amount: price.amount,
                    interval: price.interval,
                    product_id: dbProduct.id,
                    stripe_price_id: stripePrice.id,
                    discount_percentage: price.discount_percentage ?? null,
                    banner_display_type: price.banner_display_type ?? null,
                },
                user.id,
                transaction
            );
        }

        // Step 4: Create event mappings if event_ids provided
        if (event_ids && Array.isArray(event_ids) && event_ids.length > 0) {
            await stripeProductService.createEventStripeProductMappings(dbProduct.id, event_ids, transaction);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.stripe.productCreated, dbProduct);
    } catch (error: any) {
        loggerService.error(`Error creating stripe product: ${error}`);
        await transaction.rollback();

        sendServerErrorResponse(res, responseMessages.stripe.failedToCreateProduct, error);
        next(error);
    }
};

/** PUT API: Update a stripe product. */
export const updateStripeProduct = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;
        const { productId } = req.params;
        const { name, description, prices, plan_benefits, event_ids } = req.body;

        if (!productId) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.stripe.productIdRequired);
        }

        // Validate stripe account of user
        const isStripeAccountValid = await validateStripeAccount(user, res, transaction);
        if (!isStripeAccountValid) {
            return;
        }

        // Validate event_ids if provided
        const areEventIdsValid = await validateEventIds(event_ids || [], res, transaction);
        if (!areEventIdsValid) {
            return;
        }

        // Step 1: Get database product by ID
        const dbProduct = await stripeProductService.getStripeProductById(productId as string, transaction);
        if (!dbProduct) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.stripe.productNotFoundInDatabase);
        }

        // Verify product belongs to the user
        if (dbProduct.user_id !== user.id) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.stripe.productPermissionDenied);
        }

        // Step 2: Retrieve product from Stripe using stripe_product_id
        const stripeProductId = dbProduct.stripe_product_id;
        try {
            await stripeService.retrieveStripeProduct(stripeProductId);
        } catch (err: any) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.stripe.productNotFoundInStripe);
        }

        // Step 3: Update Stripe product name, and description
        const planBenefitsJson = plan_benefits ? JSON.stringify(plan_benefits) : null;
        const updatedStripeProduct = await stripeService.updateStripeProduct(name, stripeProductId, description);

        // Step 4: Update database product using stripe_product_id
        await stripeProductService.updateStripeProductByStripeId(
            stripeProductId,
            {
                name,
                description: description || null,
                active: updatedStripeProduct.active,
                plan_benefits: planBenefitsJson || null,
            },
            user.id,
            transaction
        );

        // Step 5: Fetch existing prices from Stripe
        const existingStripePrices = await stripeService.listStripePrices(stripeProductId);
        const existingDbPrices = await stripePriceService.getStripePricesByProductId(dbProduct.id, transaction);

        const pricesToKeep: string[] = [];

        // Step 6: Process prices
        for (const price of prices) {
            const amountInCents = Math.round(price.amount * 100);
            const existingStripePrice = existingStripePrices.data.find(
                (p) =>
                    p.unit_amount === amountInCents &&
                    p.recurring?.interval === price.interval
            );

            if (existingStripePrice) {
                // Update existing price in Stripe
                await stripeService.updateStripePrice(existingStripePrice.id, true);
                pricesToKeep.push(existingStripePrice.id);

                // Update database price
                const existingDbPrice = existingDbPrices.find(p => p.stripe_price_id === existingStripePrice.id);
                if (existingDbPrice) {
                    await stripePriceService.updateStripePriceByStripeId(
                        existingStripePrice.id,
                        {
                            active: true,
                            discount_percentage: price.discount_percentage ?? null,
                            banner_display_type: price.banner_display_type ?? null,
                        },
                        user.id,
                        transaction
                    );
                }
            } else {
                // Create new price in Stripe
                const newStripePrice = await stripeService.createStripePrice(stripeProductId, price.amount, 'usd', price.interval);
                pricesToKeep.push(newStripePrice.id);

                // Create new price in database
                await stripePriceService.createStripePrice(
                    {
                        active: true,
                        currency: 'usd',
                        amount: price.amount,
                        interval: price.interval,
                        product_id: dbProduct.id,
                        stripe_price_id: newStripePrice.id,
                        discount_percentage: price.discount_percentage ?? null,
                        banner_display_type: price.banner_display_type ?? null,
                    },
                    user.id,
                    transaction
                );
            }
        }

        // Step 7: Deactivate prices not in request
        for (const stripePrice of existingStripePrices.data) {
            if (!pricesToKeep.includes(stripePrice.id) && stripePrice.active) {
                await stripeService.updateStripePrice(stripePrice.id, false);

                // Update database price
                const existingDbPrice = existingDbPrices.find(p => p.stripe_price_id === stripePrice.id);
                if (existingDbPrice) {
                    await stripePriceService.updateStripePriceByStripeId(stripePrice.id, { active: false }, user.id, transaction);
                }
            }
        }

        // Step 8: Update event mappings if event_ids provided
        if (event_ids && Array.isArray(event_ids) && event_ids.length > 0) {
            await stripeProductService.updateEventStripeProductMappings(dbProduct.id, event_ids, transaction);
        } else if (event_ids !== undefined) {
            // If event_ids is explicitly provided as empty array, remove all mappings
            await stripeProductService.updateEventStripeProductMappings(dbProduct.id, [], transaction);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.stripe.productUpdated, dbProduct);
    } catch (error: any) {
        loggerService.error(`Error updating stripe product: ${error}`);
        await transaction.rollback();

        sendServerErrorResponse(res, responseMessages.stripe.failedToUpdateProduct, error);
        next(error);
    }
};

/** GET API: Get stripe product by ID. */
export const getStripeProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productId } = req.params;
        const { user } = res.locals.auth;
        const authenticatedUserId = user?.id;

        if (!productId) {
            return sendBadRequestResponse(res, responseMessages.stripe.productIdRequired);
        }

        const product = await stripeProductService.getStripeProductByIdWithRelations(productId as string, authenticatedUserId);

        if (!product) {
            return sendNotFoundResponse(res, responseMessages.stripe.productNotFound);
        }

        const productData = product.toJSON ? product.toJSON() : product;
        const formattedProduct = await stripeProductService.formatProductResponse(productData);

        return sendSuccessResponse(res, responseMessages.stripe.productRetrieved, formattedProduct);
    } catch (error: any) {
        loggerService.error(`Error getting stripe product by ID: ${error}`);
        sendServerErrorResponse(res, responseMessages.stripe.failedToGetProduct, error);
        next(error);
    }
};

/** GET API: Get all stripe products of a user.
 * If userId is provided in params, returns products for that user (public).
 * If userId is not provided, returns products for authenticated user (requires auth).
 */
export const getUserStripeProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;
        const authenticatedUser = res.locals.auth?.user;

        // Determine which userId to use
        let targetUserId: string | undefined;
        
        if (userId) {
            // If userId is provided in params, use it (public endpoint)
            targetUserId = userId as string;
        } else if (authenticatedUser) {
            // If no userId in params but user is authenticated, use authenticated user's ID
            targetUserId = authenticatedUser.id;
        } else {
            // Neither userId nor authenticated user available
            return sendBadRequestResponse(res, responseMessages.stripe.userIdOrAuthRequired);
        }

        if (!targetUserId) {
            return sendBadRequestResponse(res, responseMessages.stripe.userIdRequired);
        }

        const products = await stripeProductService.getAllStripeProducts(targetUserId, authenticatedUser.id);

        if (!products.length) {
            return sendSuccessResponse(res, responseMessages.stripe.noProductsFound, []);
        }

        const formattedProducts = await Promise.all(
            products.map(async (product: any) => {
                const productData = product.toJSON ? product.toJSON() : product;
                return await stripeProductService.formatProductResponse(productData);
            })
        );

        return sendSuccessResponse(res, responseMessages.stripe.productsRetrieved, formattedProducts);
    } catch (error: any) {
        loggerService.error(`Error getting user stripe products: ${error}`);
        sendServerErrorResponse(res, responseMessages.stripe.failedToGetUserProducts, error);
        next(error);
    }
};

/**
 * GET API: Get subscribers of a plan with pagination
 * @route GET /api/stripe-products/:productId/subscribers
 */
export const getPlanSubscribers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productId } = req.params;
        const { page, limit } = req.query;

        if (!productId) {
            return sendBadRequestResponse(res, responseMessages.stripe.productIdRequired);
        }

        // Verify product exists and belongs to the authenticated user
        const user = res.locals.auth?.user;
        const product = await stripeProductService.getStripeProductById(productId as string);

        if (!product) {
            return sendNotFoundResponse(res, responseMessages.stripe.productNotFound);
        }

        // Only product owner can view subscribers
        if (product.user_id !== user.id) {
            return sendBadRequestResponse(res, responseMessages.stripe.productPermissionDenied);
        }

        const result = await stripeProductService.getPlanSubscribersPaginated(
            productId as string,
            Number(page),
            Number(limit),
            user?.id || null
        );

        return sendSuccessResponse(res, responseMessages.stripe.subscribersRetrieved, result);
    } catch (error: any) {
        loggerService.error(`Error getting plan subscribers: ${error}`);
        sendServerErrorResponse(res, responseMessages.stripe.failedToGetSubscribers, error);
        next(error);
    }
};

/** DELETE API: Delete a stripe product. */
export const deleteStripeProduct = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;
        const { productId } = req.params;

        if (!productId) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.stripe.productIdRequired);
        }

        // Step 1: Get database product by ID
        const dbProduct = await stripeProductService.getStripeProductById(productId as string, transaction);
        if (!dbProduct) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.stripe.productNotFoundInDatabase);
        }

        // Step 2: Verify product belongs to the user
        if (dbProduct.user_id !== user.id) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.stripe.productPermissionDenied);
        }

        // Step 3: Archive product in Stripe (set active: false)
        try {
            await stripeService.archiveStripeProduct(dbProduct.stripe_product_id);
        } catch (err: any) {
            loggerService.error(`Error archiving product in Stripe: ${err}`);
            // Continue with database deletion even if Stripe archiving fails
        }

        // Step 4: Deactivate all prices in Stripe
        try {
            const stripePrices = await stripeService.listStripePrices(dbProduct.stripe_product_id);
            for (const price of stripePrices.data) {
                if (price.active) {
                    await stripeService.updateStripePrice(price.id, false);
                }
            }
        } catch (err: any) {
            loggerService.error(`Error deactivating prices in Stripe: ${err}`);
            // Continue with database deletion even if price deactivation fails
        }

        // Step 5: Soft delete product in database
        await stripeProductService.deleteStripeProduct(productId as string, user.id, transaction);

        // Step 6: Soft delete all associated prices in database
        const dbPrices = await stripePriceService.getStripePricesByProductId(dbProduct.id, transaction);
        for (const price of dbPrices) {
            await stripePriceService.updateStripePriceByStripeId(
                price.stripe_price_id,
                { active: false, is_deleted: true },
                user.id,
                transaction
            );
        }

        // Step 7: Cancel all active subscriptions for this product
        try {
            const activeSubscriptions = await Subscription.findAll({
                where: {
                    product_id: productId,
                    is_deleted: false,
                    status: SubscriptionStatus.ACTIVE
                },
                transaction
            });

            loggerService.info(`Found ${activeSubscriptions.length} active subscriptions to cancel for product ${productId}`);

            for (const subscription of activeSubscriptions) {
                try {
                    // Cancel subscription in Stripe
                    await stripeService.cancelStripeSubscription(subscription.stripe_subscription_id);

                    // Update subscription status in database
                    await subscriptionService.updateSubscriptionByStripeId(
                        subscription.stripe_subscription_id,
                        {
                            canceled_at: new Date(),
                            cancel_at_end_date: true,
                        },
                        transaction
                    );

                    loggerService.info(`Canceled subscription ${subscription.stripe_subscription_id} for product ${productId}`);
                } catch (subError: any) {
                    loggerService.error(`Error canceling subscription ${subscription.stripe_subscription_id}: ${subError.message}`);
                    // Continue with other subscriptions even if one fails
                }
            }
        } catch (err: any) {
            loggerService.error(`Error canceling subscriptions for product ${productId}: ${err.message}`);
            // Continue even if subscription cancellation fails
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.stripe.productDeleted, null);
    } catch (error: any) {
        loggerService.error(`Error deleting stripe product: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.stripe.failedToDeleteProduct, error);
        next(error);
    }
};
