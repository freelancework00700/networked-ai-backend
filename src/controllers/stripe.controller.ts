import Stripe from 'stripe';
import stripe from '../utils/stripe';
import { sequelize } from '../server';
import env from '../utils/validate-env';
import userService from '../services/user.service';
import loggerService from '../utils/logger.service';
import { NextFunction, Request, Response } from 'express';
import transactionService from '../services/transaction.service';
import stripePriceService from '../services/stripe-price.service';
import subscriptionService from '../services/subscription.service';
import { responseMessages } from '../utils/response-message.service';
import stripeProductService from '../services/stripe-product.service';
import eventAttendeesService from '../services/event-attendees.service';
import { User, Subscription, Event, EventAttendee } from '../models/index';
import platformSubscriptionService from '../services/platform-subscription.service';
import platformStripeProductService from '../services/platform-stripe-product.service';
import stripeService, { getAccountStatus, getSubscriptionStatus } from '../services/stripe.service';
import { StripeAccountStatus, SubscriptionStatus, TransactionStatus, TransactionType } from '../types/enums';
import { sendBadRequestResponse, sendConflictErrorResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/**
 * POST API: Handle Stripe webhook events for own account (products, prices)
 * This endpoint receives webhook events from Stripe and updates product/price status
 */
export const handleOwnAccountWebhook = async (req: Request, res: Response, next: NextFunction) => {
    const sig = req.headers['stripe-signature'] as string;
    const transaction = await sequelize.transaction();

    try {
        if (!sig) {
            await transaction.rollback();
            return sendBadRequestResponse(res, 'Missing stripe-signature header');
        }

        // Verify webhook signature
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_MAIN_ACCOUNT_WEBHOOK_SECRET);
            loggerService.info(`Webhook event: ${JSON.stringify(event)}`);
        } catch (err: any) {
            await transaction.rollback();
            loggerService.error(`Webhook signature verification failed: ${err.message}`);
            return sendBadRequestResponse(res, `Webhook Error: ${err.message}`);
        }

        // Handle the event
        switch (event.type) {
            case 'product.updated':
                await handleProductUpdated(event.data.object as Stripe.Product, transaction);
                break;

            // for product deletion
            case 'product.deleted':
                await handleProductDeleted(event.data.object as Stripe.Product, transaction);
                break;

            // for price update
            case 'price.updated':
                await handlePriceUpdated(event.data.object as Stripe.Price, transaction);
                break;

            // for price deletion
            case 'price.deleted':
                await handlePriceDeleted(event.data.object as Stripe.Price, transaction);
                break;

            // for subscription update/renew
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, transaction);
                break;

            // for subscription cancellation
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, transaction);
                break;

            //  for subscription payment success
            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, transaction);
                break;

            // for event ticket / other payment intent success
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, transaction);
                break;

            // for payment refund
            case 'charge.refunded':
                await handleChargeRefunded(event.data.object as Stripe.Charge, transaction);
                break;

            default:
                loggerService.info(`Unhandled event type: ${event.type}`);
        }

        await transaction.commit();
        
        // Return a response to acknowledge receipt of the event
        return sendSuccessResponse(res, 'Webhook received and processed', { received: true });
    } catch (error: any) {
        loggerService.error(`Error processing webhook: ${error}`);
        await transaction.rollback();
        const errorMessage = error?.message || 'Failed to process webhook';
        sendServerErrorResponse(res, errorMessage, null);
        next(error);
    }
};

// Handle product.updated webhook event
const handleProductUpdated = async (product: Stripe.Product, transaction: any) => {
    try {
        const dbProduct = await stripeProductService.getStripeProductByStripeId(product.id, transaction);
        
        if (!dbProduct) {
            loggerService.warn(`Product not found in database: ${product.id}`);
            return;
        }

        await stripeProductService.updateStripeProductByStripeId(
            product.id,
            {
                name: product.name,
                active: product.active,
                description: product.description || null,
            },
            null, // No user context in webhook
            transaction
        );

        loggerService.info(`Product updated: ${product.id}`);
    } catch (error) {
        loggerService.error(`Error updating product: ${error}`);
        throw error;
    }
};

// Handle product.deleted webhook event
const handleProductDeleted = async (product: Stripe.Product, transaction: any) => {
    try {
        const dbProduct = await stripeProductService.getStripeProductByStripeId(product.id, transaction);
        
        if (!dbProduct) {
            loggerService.warn(`Product not found in database: ${product.id}`);
            return;
        }

        // Soft delete the product
        await stripeProductService.updateStripeProductByStripeId(
            product.id,
            {
                active: false,
                is_deleted: true,
            },
            null, // No user context in webhook
            transaction
        );

        loggerService.info(`Product deactivated: ${product.id}`);
    } catch (error) {
        loggerService.error(`Error deactivating product: ${error}`);
        throw error;
    }
};

// Handle price.updated webhook event
const handlePriceUpdated = async (price: Stripe.Price, transaction: any) => {
    try {
        const dbPrice = await stripePriceService.getStripePriceByStripeId(price.id, transaction);
        
        if (!dbPrice) {
            loggerService.warn(`Price not found in database: ${price.id}`);
            return;
        }

        await stripePriceService.updateStripePriceByStripeId(
            price.id,
            {
                active: price.active,
            },
            null, // No user context in webhook
            transaction
        );

        loggerService.info(`Price updated: ${price.id}`);
    } catch (error) {
        loggerService.error(`Error updating price: ${error}`);
        throw error;
    }
};

// Handle price.deleted webhook event
const handlePriceDeleted = async (price: Stripe.Price, transaction: any) => {
    try {
        const dbPrice = await stripePriceService.getStripePriceByStripeId(price.id, transaction);
        
        if (!dbPrice) {
            loggerService.warn(`Price not found in database: ${price.id}`);
            return;
        }

        // Soft delete the price
        await stripePriceService.updateStripePriceByStripeId(
            price.id,
            {
                active: false,
                is_deleted: true,
            },
            null, // No user context in webhook
            transaction
        );

        loggerService.info(`Price deactivated: ${price.id}`);
    } catch (error) {
        loggerService.error(`Error deactivating price: ${error}`);
        throw error;
    }
};

/**
 * POST API: Handle Stripe webhook events for connected accounts
 * This endpoint receives webhook events for connected account status changes
 */
export const handleConnectedAccountWebhook = async (req: Request, res: Response, next: NextFunction) => {
    const sig = req.headers['stripe-signature'] as string;
    const transaction = await sequelize.transaction();

    try {
        if (!sig) {
            await transaction.rollback();
            return sendBadRequestResponse(res, 'Missing stripe-signature header');
        }

        // Verify webhook signature
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_CONNECTED_ACCOUNT_WEBHOOK_SECRET);
        } catch (err: any) {
            await transaction.rollback();
            loggerService.error(`Webhook signature verification failed: ${err.message}`);
            return sendBadRequestResponse(res, `Webhook Error: ${err.message}`);
        }

        // Handle connected account events
        switch (event.type) {
            case 'account.updated':
                await handleAccountUpdated(event.data.object as Stripe.Account, transaction);
                break;

            default:
                loggerService.info(`Unhandled connected account event type: ${event.type}`);
        }

        await transaction.commit();
        
        // Return a response to acknowledge receipt of the event
        return sendSuccessResponse(res, 'Connected account webhook received and processed', { received: true });
    } catch (error: any) {
        loggerService.error(`Error processing connected account webhook: ${error}`);
        await transaction.rollback();
        const errorMessage = error?.message || 'Failed to process connected account webhook';
        sendServerErrorResponse(res, errorMessage, null);
        next(error);
    }
};

// Handle account.updated webhook event for connected accounts
const handleAccountUpdated = async (account: Stripe.Account, transaction: any) => {
    try {
        loggerService.info(`Connected account updated: ${account.id}`);
    
        if(account?.metadata?.userId) {
            // Update user's stripe_account_id and stripe_account_status in database
            await userService.updateUser(
                account.metadata.userId,
                { 
                    stripe_account_id: account.id, 
                    stripe_account_status: getAccountStatus(account)
                },
                account.metadata.userId,
                transaction
            );
        } else {
            loggerService.error(`User not found for connected account: ${account.id}`);
        }
    } catch (error) {
        loggerService.error(`Error updating connected account: ${error}`);
        throw error;
    }
};

// Handle platform subscription payment succeeded webhook event
const handlePlatformSubscriptionPaymentSucceeded = async (subscription: Stripe.Subscription, invoice: Stripe.Invoice, transaction: any) => {
    try {
        const stripeSubscriptionId = subscription.id;
        const periodEnd = new Date(invoice.lines.data[0].period.end * 1000);
        const periodStart = new Date(invoice.lines.data[0].period.start * 1000);

        loggerService.info(`Platform Subscription: ${JSON.stringify(subscription)}`);

        // Get metadata from subscription (includes price_id, user_id)
        const dbUserId = subscription.metadata?.user_id;
        const dbPriceId = subscription.metadata?.price_id;

        if (!dbUserId || !dbPriceId) {
            loggerService.error(`Missing metadata in platform subscription ${stripeSubscriptionId}: user_id or price_id`);
            return;
        }

        // Check if this is a platform subscription by checking if price_id exists in platform_stripe_prices
        const platformPrice = await platformStripeProductService.getPlatformStripePriceWithProduct(dbPriceId);
        if (!platformPrice) {
            loggerService.info(`Price ${dbPriceId} is not a platform price, skipping platform subscription creation`);
            return;
        }

        // Check if platform subscription already exists
        const existingPlatformSubscription = await platformSubscriptionService.getPlatformSubscriptionByStripeId(stripeSubscriptionId, transaction);
        if (existingPlatformSubscription) {
            loggerService.info(`Platform subscription ${stripeSubscriptionId} already exists in database`);
            // Update subscription dates if needed
            await platformSubscriptionService.updatePlatformSubscriptionByStripeId(
                stripeSubscriptionId,
                {
                    end_date: periodEnd,
                    start_date: periodStart,
                    status: getSubscriptionStatus(subscription),
                },
                transaction
            );
            return;
        }

        // Create platform subscription record
        await platformSubscriptionService.createPlatformSubscriptionFromWebhook(
            {
                user_id: dbUserId,
                end_date: periodEnd,
                created_by: dbUserId,
                start_date: periodStart,
                platform_stripe_price_id: dbPriceId,
                status: getSubscriptionStatus(subscription),
                stripe_subscription_id: stripeSubscriptionId,
            },
            transaction
        );

        loggerService.info(`Platform subscription ${stripeSubscriptionId} created successfully for user ${dbUserId}`);
    } catch (error: any) {
        loggerService.error(`Error handling platform subscription payment succeeded: ${error.message}`);
        throw error;
    }
};

// Handle invoice.payment_succeeded webhook event
const handleInvoicePaymentSucceeded = async (invoice: Stripe.Invoice, transaction: any) => {
    try {
        // Check if this invoice is for a subscription
        const periodEnd = new Date(invoice.lines.data[0].period.end * 1000);
        const periodStart = new Date(invoice.lines.data[0].period.start * 1000);
        const stripeSubscriptionId = invoice.lines.data[0].subscription as string;

        if (!stripeSubscriptionId || typeof stripeSubscriptionId !== 'string') {
            loggerService.info(`Invoice ${invoice.id} is not for a subscription, skipping`);
            return;
        }

        // Retrieve full subscription object from Stripe to get metadata
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        loggerService.info(`Subscription: ${JSON.stringify(subscription)}`);

        // Check if this is a platform subscription
        const isPlatform = subscription.metadata?.is_platform === 'true';
        if (isPlatform) {
            await handlePlatformSubscriptionPaymentSucceeded(subscription, invoice, transaction);
            return;
        }

        // Get metadata from subscription (includes product_id, price_id, user_id, owner_id)
        const dbUserId = subscription.metadata?.user_id;
        const dbPriceId = subscription.metadata?.price_id;
        const dbProductId = subscription.metadata?.product_id;
        const dbProductOwnerId = subscription.metadata?.owner_id;

        if (!dbProductId || !dbPriceId) {
            loggerService.error(`Missing metadata in subscription ${stripeSubscriptionId}: product_id or price_id`);
            throw new Error('Missing required metadata in subscription');
        }

        // Check if subscription already exists in database
        const existingSubscription = await subscriptionService.getSubscriptionByStripeId(stripeSubscriptionId, transaction);
        if (existingSubscription) {
            loggerService.info(`Subscription ${stripeSubscriptionId} already exists in database`);
            // Update subscription status if needed
            await subscriptionService.updateSubscriptionByStripeId(
                stripeSubscriptionId,
                {
                    end_date: periodEnd,
                    status: getSubscriptionStatus(subscription),
                    cancel_at_end_date: subscription.cancel_at_period_end || false,
                    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                },
                transaction
            );
            return;
        }

        // Get payment intent from invoice
        const paymentIntentId = (invoice as any).payment_intent as string;

        if (!paymentIntentId) {
            loggerService.error(`Payment intent not found in invoice ${invoice.id}`);
            throw new Error('Payment intent not found');
        }

        // Retrieve payment intent to get payment method and amount details
        const paymentIntentObj = await stripe.paymentIntents.retrieve(paymentIntentId);
        loggerService.info(`Payment intent: ${JSON.stringify(paymentIntentObj)}`);

        // Calculate transfer amount (90% of total)
        const amount = invoice.amount_paid / 100; // Convert from cents to dollars
        const transferAmount = amount * 0.9;

        // Create subscription record
        await subscriptionService.createSubscription(
            {
                user_id: dbUserId,
                end_date: periodEnd,
                price_id: dbPriceId,
                start_date: periodStart,
                product_id: dbProductId,
                owner_id: dbProductOwnerId,
                status: getSubscriptionStatus(subscription),
                stripe_subscription_id: stripeSubscriptionId,
                cancel_at_end_date: subscription.cancel_at_period_end || false,
                canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
            },
            transaction
        );

        // Create transaction record
        await transactionService.createTransaction(
            {
                amount: amount,
                user_id: dbUserId,
                price_id: dbPriceId,
                product_id: dbProductId,
                host_user_id: dbProductOwnerId,
                transfer_amount: transferAmount,
                metadata: JSON.stringify(invoice),
                type: TransactionType.SUBSCRIPTION,
                currency: invoice.currency || 'usd',
                status: TransactionStatus.SUCCEEDED,
                stripe_payment_intent_id: paymentIntentId,
                payment_method: paymentIntentObj.payment_method_types?.[0] || null,
            },
            transaction
        );

        loggerService.info(`Subscription ${stripeSubscriptionId} and transaction created successfully for user ${dbUserId}`);
    } catch (error: any) {
        loggerService.error(`Error handling invoice payment succeeded: ${error.message}`);
        throw error;
    }
};

// Handle payment_intent.succeeded webhook event for event ticket payments
const handlePaymentIntentSucceeded = async (paymentIntent: Stripe.PaymentIntent, transaction: any) => {
    try {
        const metadata = (paymentIntent.metadata || {}) as any;
        const paymentIntentId = paymentIntent.id;

        if (!paymentIntentId) {
            loggerService.warn('Payment intent ID missing in payment_intent.succeeded event, skipping');
            return;
        }

        // We only care about event-based payments (created by our event ticket API)
        const eventId = metadata.event_id as string | undefined;
        const userId = metadata.user_id as string | undefined;

        if (!eventId || !userId) {
            loggerService.info(`payment_intent.succeeded ${paymentIntentId} does not contain event_id or user_id metadata, skipping`);
            return;
        }

        // Check if transaction already exists (idempotency)
        const existingTransaction = await transactionService.getTransactionByPaymentIntentId(paymentIntentId, transaction);
        if (existingTransaction) {
            loggerService.info(`Transaction already exists for payment intent ${paymentIntentId}, skipping creation`);
            return;
        }

        const amount = (paymentIntent.amount || 0) / 100;
        const currency = paymentIntent.currency || 'usd';
        const subtotal = (paymentIntent.transfer_data?.amount || 0) / 100;

        // Get host user (event creator) for host_user_id
        let hostUserId: string | null = null;
        const event = await Event.findOne({
            where: {
                id: eventId,
                is_deleted: false,
            },
            attributes: ['id', 'created_by'],
            transaction,
        });

        if (event && event.created_by) {
            hostUserId = event.created_by as string;
        }

        const createdTransaction = await transactionService.createTransaction(
            {
                amount,
                currency,
                user_id: userId,
                event_id: eventId,
                host_user_id: hostUserId,
                transfer_amount: subtotal,
                type: TransactionType.EVENT,
                status: TransactionStatus.SUCCEEDED,
                metadata: JSON.stringify(paymentIntent),
                stripe_payment_intent_id: paymentIntentId,
                payment_method: paymentIntent?.payment_method_types?.[0] || null,
            },
            transaction
        );

        // If attendees were created before the webhook processed, link them to the transaction
        if (createdTransaction && createdTransaction.id) {
            const updatedCount = await EventAttendee.update(
                { transaction_id: createdTransaction.id },
                {
                    where: {
                        user_id: userId,
                        event_id: eventId,
                        is_deleted: false,
                        transaction_id: null,
                    },
                    transaction,
                }
            );
            
            if (updatedCount[0] > 0) {
                loggerService.info(`Linked ${updatedCount[0]} existing attendee(s) to transaction ${createdTransaction.id} for payment intent ${paymentIntentId}`);
            }
        }

        loggerService.info(`Transaction created for event payment. PaymentIntent: ${paymentIntentId}, user: ${userId}, event: ${eventId}`);
    } catch (error: any) {
        loggerService.error(`Error handling payment_intent.succeeded: ${error.message}`);
        throw error;
    }
};

// Handle platform subscription updated webhook event
const handlePlatformSubscriptionUpdated = async (subscription: Stripe.Subscription, transaction: any) => {
    try {
        const stripeSubscriptionId = subscription.id;
        const subscriptionObj = subscription as any;
        const currentPeriodEnd = subscriptionObj.current_period_end;
        const currentPeriodStart = subscriptionObj.current_period_start;

        // Check if this is a platform subscription
        const existingPlatformSubscription = await platformSubscriptionService.getPlatformSubscriptionByStripeId(stripeSubscriptionId, transaction);
        if (!existingPlatformSubscription) {
            loggerService.info(`Platform subscription ${stripeSubscriptionId} not found in database, skipping update`);
            return;
        }

        // Update platform subscription
        const updateData: any = {
            status: getSubscriptionStatus(subscription),
            cancel_at_end_date: subscription.cancel_at_period_end || false,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        };

        if (currentPeriodStart) {
            updateData.start_date = new Date(currentPeriodStart * 1000);
        }

        if (currentPeriodEnd) {
            updateData.end_date = new Date(currentPeriodEnd * 1000);
        }

        await platformSubscriptionService.updatePlatformSubscriptionByStripeId(
            stripeSubscriptionId,
            updateData,
            transaction
        );

        loggerService.info(`Platform subscription ${stripeSubscriptionId} updated successfully`);
    } catch (error: any) {
        loggerService.error(`Error handling platform subscription updated: ${error.message}`);
        throw error;
    }
};

// Handle customer.subscription.updated webhook event
const handleSubscriptionUpdated = async (subscription: Stripe.Subscription, transaction: any) => {
    try {
        const stripeSubscriptionId = subscription.id;

        // Check if this is a platform subscription
        const isPlatform = subscription.metadata?.is_platform === 'true';
        if (isPlatform) {
            await handlePlatformSubscriptionUpdated(subscription, transaction);
            return;
        }

        // Check if subscription exists in database
        const existingSubscription = await subscriptionService.getSubscriptionByStripeId(stripeSubscriptionId, transaction);
        
        if (!existingSubscription) {
            loggerService.warn(`Subscription ${stripeSubscriptionId} not found in database for update`);
            return;
        }

        const subscriptionObj = subscription as any;
        const currentPeriodEnd = subscriptionObj.current_period_end;
        const currentPeriodStart = subscriptionObj.current_period_start;

        // Update subscription status and dates
        const updateData: any = {
            status: getSubscriptionStatus(subscription),
            cancel_at_end_date: subscription.cancel_at_period_end || false,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        };

        if (currentPeriodStart) {
            updateData.start_date = new Date(currentPeriodStart * 1000);
        }

        if (currentPeriodEnd) {
            updateData.end_date = new Date(currentPeriodEnd * 1000);
        }

        await subscriptionService.updateSubscriptionByStripeId(
            stripeSubscriptionId,
            updateData,
            transaction
        );

        loggerService.info(`Subscription ${stripeSubscriptionId} updated successfully`);
    } catch (error: any) {
        loggerService.error(`Error handling subscription updated: ${error.message}`);
        throw error;
    }
};

// Handle customer.subscription.deleted webhook event
const handleSubscriptionDeleted = async (subscription: Stripe.Subscription, transaction: any) => {
    try {
        const stripeSubscriptionId = subscription.id;

        // Check if this is a platform subscription
        const isPlatform = subscription.metadata?.is_platform === 'true';
        if (isPlatform) {
            await handlePlatformSubscriptionDeleted(subscription, transaction);
            return;
        }

        // Check if subscription exists in database
        const existingSubscription = await subscriptionService.getSubscriptionByStripeId(stripeSubscriptionId, transaction);
        
        if (!existingSubscription) {
            loggerService.warn(`Subscription ${stripeSubscriptionId} not found in database for deletion`);
            return;
        }

        // Update subscription status to canceled
        await subscriptionService.updateSubscriptionByStripeId(
            stripeSubscriptionId,
            {
                status: SubscriptionStatus.CANCELED,
                canceled_at: new Date(),
                cancel_at_end_date: false,
            },
            transaction
        );

        loggerService.info(`Subscription ${stripeSubscriptionId} marked as canceled`);
    } catch (error: any) {
        loggerService.error(`Error handling subscription deleted: ${error.message}`);
        throw error;
    }
};

// Handle platform subscription deleted webhook event
const handlePlatformSubscriptionDeleted = async (subscription: Stripe.Subscription, transaction: any) => {
    try {
        const stripeSubscriptionId = subscription.id;

        // Check if this is a platform subscription
        const existingPlatformSubscription = await platformSubscriptionService.getPlatformSubscriptionByStripeId(stripeSubscriptionId, transaction);
        if (!existingPlatformSubscription) {
            loggerService.info(`Platform subscription ${stripeSubscriptionId} not found in database, skipping deletion`);
            return;
        }

        // Update platform subscription status to canceled
        await platformSubscriptionService.updatePlatformSubscriptionByStripeId(
            stripeSubscriptionId,
            {
                canceled_at: new Date(),
                status: SubscriptionStatus.CANCELED,
            },
            transaction
        );

        loggerService.info(`Platform subscription ${stripeSubscriptionId} canceled successfully`);
    } catch (error: any) {
        loggerService.error(`Error handling platform subscription deleted: ${error.message}`);
        throw error;
    }
};

// Handle charge.refunded webhook event
const handleChargeRefunded = async (charge: Stripe.Charge, transaction: any) => {
    try {
        // Get payment intent ID from charge
        const paymentIntentId = charge.payment_intent as string;

        if (!paymentIntentId || typeof paymentIntentId !== 'string') {
            loggerService.warn(`Payment intent not found in charge ${charge.id}, skipping refund handling`);
            return;
        }

        // Find transaction by payment intent ID
        const existingTransaction = await transactionService.getTransactionByPaymentIntentId(paymentIntentId, transaction);
        
        if (!existingTransaction) {
            loggerService.warn(`Transaction not found for payment intent ${paymentIntentId}, skipping refund handling`);
            return;
        }

        // Check if charge is fully refunded or partially refunded
        const originalAmount = charge.amount / 100;
        const refundAmount = charge.amount_refunded / 100; // Convert from cents to dollars
        const isFullyRefunded = refundAmount >= originalAmount;

        // Update transaction status to REFUNDED
        await transactionService.updateTransactionByPaymentIntentId(
            paymentIntentId,
            {
                status: TransactionStatus.REFUNDED,
            },
            transaction
        );

        loggerService.info(`Transaction ${paymentIntentId} marked as refunded. Amount: ${refundAmount}, Original: ${originalAmount}, Fully refunded: ${isFullyRefunded}`);

        // If this is a subscription transaction and fully refunded, we might want to cancel the subscription
        if (existingTransaction.type === TransactionType.SUBSCRIPTION && isFullyRefunded) {
            // Find subscription by product_id and user_id
            const subscription = await Subscription.findOne({
                where: {
                    is_deleted: false,
                    status: SubscriptionStatus.ACTIVE,
                    user_id: existingTransaction.user_id,
                    product_id: existingTransaction.product_id,
                },
                transaction,
            });

            if (subscription) {
                await subscriptionService.updateSubscriptionByStripeId(
                    subscription.stripe_subscription_id,
                    {
                        canceled_at: new Date(),
                        status: SubscriptionStatus.CANCELED,
                    },
                    transaction
                );
                loggerService.info(`Subscription ${subscription.stripe_subscription_id} canceled due to full refund`);
            }
        }
    } catch (error: any) {
        loggerService.error(`Error handling charge refunded: ${error.message}`);
        throw error;
    }
};

/**
 * Create or refresh Stripe Connect account and get onboarding link
 * @route POST /api/stripe/account
 */
export const createOrRefreshStripeAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const transaction = await sequelize.transaction();
    try {
        const user = res.locals.auth?.user;

        if (!user) {
            await transaction.rollback();
            return sendBadRequestResponse(res, 'User not authenticated');
        }

        if (!user.email) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.stripe.emailRequired);
        }

        let account;
        let stripeAccountId = user.stripe_account_id;

        // Check if stripe account already exists
        if (stripeAccountId) {
            account = await stripeService.retrieveStripeAccount(stripeAccountId);

            if (account) {
                // If account is already fully onboarded
                const accountStatus = getAccountStatus(account);
                if (accountStatus === StripeAccountStatus.ACTIVE) {
                    await transaction.commit();
                    return sendSuccessResponse(
                        res,
                        responseMessages.stripe.accountAlreadySetUp,
                        {
                            account_id: account.id,
                            status: StripeAccountStatus.ACTIVE,
                            message: responseMessages.stripe.accountAlreadySetUp,
                        }
                    );
                }

                // Account exists but not fully onboarded - will create link to complete onboarding
                loggerService.info(`Stripe account exists but not fully onboarded for user: ${user?.id}`);
            } else {
                // Account id exists in db but not in stripe (edge case)
                stripeAccountId = null; // Reset to create new account
            }
        }

        // Create new stripe account if not exists
        if (!stripeAccountId) {
            account = await stripeService.createStripeAccount(user.email, user.id);
            stripeAccountId = account.id;

            // Update user's stripe_account_id in database
            await userService.updateUser(
                user.id,
                { stripe_account_id: stripeAccountId },
                user.id,
                transaction
            );
        }

        // Create onboarding link (for new accounts or incomplete existing accounts)
        const accountLink = await stripeService.createAccountLink(stripeAccountId);

        await transaction.commit();

        return sendSuccessResponse(
            res,
            responseMessages.stripe.onboardingLinkCreated,
            {
                url: accountLink.url,
                account_id: stripeAccountId,
                is_active: account?.details_submitted || false,
            }
        );
    } catch (error: any) {
        loggerService.error(`Error creating or refreshing Stripe account: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.stripe.failedToCreateOrRefreshAccount, error);
        next(error);
    }
};

/**
 * Create Stripe dashboard login link for connected account
 * @route GET /api/stripe/dashboard
 */
export const createStripeDashboardLink = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = res.locals.auth?.user;

        // Get stripeAccountId from user
        const stripeAccountId = user.stripe_account_id;

        if (!stripeAccountId) {
            return sendBadRequestResponse(res, responseMessages.stripe.accountNotOnboarded);
        }

        // Create dashboard login link
        const loginLink = await stripeService.createDashboardLoginLink(stripeAccountId);
        loggerService.info(`Created dashboard login link for user: ${user.id}, account: ${stripeAccountId}`);

        return sendSuccessResponse(
            res,
            responseMessages.stripe.dashboardLinkCreated,
            {
                url: loginLink.url,
                stripe_account_id: stripeAccountId,
            }
        );
    } catch (error: any) {
        loggerService.error(`Error creating Stripe dashboard link: ${error}`);
        sendServerErrorResponse(res, responseMessages.stripe.failedToCreateDashboardLink, error);
        next(error);
    }
};

/**
 * Create payment intent for event ticket purchase
 * @route POST /api/stripe/payment-intent
 */
export const createPaymentIntent = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = res.locals.auth?.user;
        const { event_id, subtotal, total } = req.body;

        // Check if user is already attending this event
        const isAlreadyAttending = await eventAttendeesService.checkUserAlreadyAttending(event_id, user.id);
        if (isAlreadyAttending) {
            return sendConflictErrorResponse(res, 'User is already attending this event');
        }

        // Validate that total is not less than subtotal
        if (total < subtotal) {
            return sendBadRequestResponse(res, responseMessages.stripe.totalLessThanSubtotal);
        }

        // Find the event
        const event = await Event.findOne({
            where: {
                id: event_id,
                is_deleted: false,
            },
            attributes: ['id', 'title', 'created_by'],
        });

        if (!event) {
            return sendNotFoundResponse(res, responseMessages.stripe.eventNotFound);
        }

        if (!event.created_by) {
            return sendBadRequestResponse(res, responseMessages.stripe.eventNoHost);
        }

        // Get the host user (event host)
        const hostUser = await User.findByPk(event.created_by, {
            attributes: ['id', 'stripe_account_id', 'stripe_account_status'],
        });

        if (!hostUser) {
            return sendNotFoundResponse(res, responseMessages.stripe.eventHostNotFound);
        }

        // Verify host has Stripe account
        if (!hostUser.stripe_account_id) {
            return sendBadRequestResponse(res, responseMessages.stripe.accountNotOnboarded);
        }

        // Verify Stripe account status is active
        if (hostUser.stripe_account_status !== StripeAccountStatus.ACTIVE) {
            return sendBadRequestResponse(res, responseMessages.stripe.accountNotFullyOnboarded);
        }

        // Convert dollars to cents (Stripe requires amounts in cents)
        const totalInCents = Math.round(total * 100);
        const subtotalInCents = Math.round(subtotal * 100);

        // Create payment intent options
        const options: Stripe.PaymentIntentCreateParams = {
            amount: totalInCents, // Total amount in cents
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            transfer_data: {
                amount: subtotalInCents, // Amount to transfer to host in cents
                destination: hostUser.stripe_account_id!,
            },
            metadata: {
                event_id,
                user_id: user.id,
                total: total.toString(),
                subtotal: subtotal.toString(),
            },
        };

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripeService.createPaymentIntent(options);

        if (!paymentIntent) {
            return sendServerErrorResponse(res, responseMessages.stripe.failedToCreatePaymentIntent);
        }

        return sendSuccessResponse(res, responseMessages.stripe.paymentIntentCreated, {
            currency: paymentIntent.currency,
            amount: paymentIntent.amount / 100,
            stripe_payment_intent_id: paymentIntent.id,
            client_secret: paymentIntent.client_secret,
        });
    } catch (error: any) {
        loggerService.error(`Error creating payment intent: ${error}`);
        return sendServerErrorResponse(res, responseMessages.stripe.failedToCreatePaymentIntent, error);
    }
};

/**
 * Update payment intent
 * @route PUT /api/stripe/payment-intent
 */
export const updatePaymentIntent = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = res.locals.auth?.user;
        const { stripe_payment_intent_id, event_id, subtotal, total } = req.body;

        // Validate that total is not less than subtotal (business logic validation)
        if (total < subtotal) {
            return sendBadRequestResponse(res, responseMessages.stripe.totalLessThanSubtotal);
        }

        // Find the event
        const event = await Event.findOne({
            where: {
                id: event_id,
                is_deleted: false,
            },
            attributes: ['id', 'title', 'created_by'],
        });

        if (!event) {
            return sendNotFoundResponse(res, responseMessages.stripe.eventNotFound);
        }

        if (!event.created_by) {
            return sendBadRequestResponse(res, responseMessages.stripe.eventNoHost);
        }

        // Get the host user (event host)
        const hostUser = await User.findByPk(event.created_by, {
            attributes: ['id', 'stripe_account_id', 'stripe_account_status'],
        });

        if (!hostUser) {
            return sendNotFoundResponse(res, responseMessages.stripe.eventHostNotFound);
        }

        // Verify host has Stripe account
        if (!hostUser.stripe_account_id) {
            return sendBadRequestResponse(res, responseMessages.stripe.accountNotOnboarded);
        }

        // Verify Stripe account status is active
        if (hostUser.stripe_account_status !== StripeAccountStatus.ACTIVE) {
            return sendBadRequestResponse(res, responseMessages.stripe.accountNotFullyOnboarded);
        }

        // Convert dollars to cents (Stripe requires amounts in cents)
        const totalInCents = Math.round(total * 100);
        const subtotalInCents = Math.round(subtotal * 100);

        // Create payment intent update options
        const options: Stripe.PaymentIntentUpdateParams = {
            amount: totalInCents, // Total amount in cents
            currency: 'usd',
            transfer_data: {
                amount: subtotalInCents, // Amount to transfer to host in cents
            },
            metadata: {
                event_id,
                user_id: user.id,
                total: total.toString(),
                subtotal: subtotal.toString(),
            },
        };

        // Update the PaymentIntent
        const updated = await stripeService.updatePaymentIntent(stripe_payment_intent_id, options);

        if (!updated) {
            return sendServerErrorResponse(res, responseMessages.stripe.failedToUpdatePaymentIntent);
        }

        return sendSuccessResponse(res, responseMessages.stripe.paymentIntentUpdated, {
            currency: updated.currency,
            amount: updated.amount / 100,
            stripe_payment_intent_id: updated.id,
            client_secret: updated.client_secret,
        });
    } catch (error: any) {
        loggerService.error(`Error updating payment intent: ${error}`);
        return sendServerErrorResponse(res, responseMessages.stripe.failedToUpdatePaymentIntent, error);
    }
};

