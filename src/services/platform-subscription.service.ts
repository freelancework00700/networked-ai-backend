import stripeService from './stripe.service';
import loggerService from '../utils/logger.service';
import { SubscriptionStatus, PlatformProductPriority, FeatureKey } from '../types/enums';
import {  User, PlatformStripePrice, PlatformStripeProduct, PlatformUserSubscription, PlatformUserFeatureUsage, PlatformStripeProductFeature } from '../models/index';

// Create a new platform subscription
const createPlatformSubscription = async (user: any, price: any): Promise<{url: string| null} | null> => {
    // Get customer ID from user or lookup/create one
    let customerId = user.stripe_customer_id;
    if (!customerId) {
        // Lookup or create customer by email
        const createdCustomerId = await stripeService.lookupOrCreateCustomer(user.email, user.id);
        if (!createdCustomerId) return null;

        // Update user with customer ID
        await User.update(
            { stripe_customer_id: createdCustomerId },
            { where: { id: user.id } }
        );

        customerId = createdCustomerId;
    }

    // Create Stripe subscription using the price's stripe_price_id
    const stripeSubscription = await stripeService.createSubscriptionCheckout(user.id, price.id, customerId, price.stripe_price_id);
    if (!stripeSubscription) return null;

    return stripeSubscription;
};

const createFreeSubscriptionsForAllUsers = async (): Promise<{
    failed: number;
    success: number;
    errors: { userId: string; error: string }[];
}> => {
    const results = {
        failed: 0,
        success: 0,
        errors: [] as { userId: string; error: string }[],
    };

    const freeProduct = await PlatformStripeProduct.findOne({
        where: {
            active: true,
            is_deleted: false,
            priority: PlatformProductPriority.FREE,
        },
        include: [
            {
                as: 'features',
                model: PlatformStripeProductFeature,
            },
        ],
    });

    if (!freeProduct) {
        loggerService.warn("Free product not found");
        return results;
    }

    const allUsers = await User.findAll({
        attributes: ['id'],
        where: { is_deleted: false },
    });

    for (const user of allUsers) {
        try {
            const existingFreeSubscription =
                await PlatformUserSubscription.findOne({
                    where: {
                        user_id: user.id,
                        platform_stripe_product_id: freeProduct.id,
                    },
                });

            if (existingFreeSubscription) continue;

            const subscription = await PlatformUserSubscription.create({
                user_id: user.id,
                start_date: new Date(),
                status: SubscriptionStatus.ACTIVE,
                platform_stripe_product_id: freeProduct.id
            });

            const features = (freeProduct as any).features ?? [];

            for (const feature of features) {
                await PlatformUserFeatureUsage.create({
                    used_value: 0,
                    limit_value: feature.limit_value,
                    feature_key: feature.feature_key,
                    platform_user_subscription_id: subscription.id,
                });
            }

            results.success++;
        } catch (err) {
            results.failed++;
            results.errors.push({
                userId: user.id,
                error: err instanceof Error ? err.message : String(err),
            });

            // continue explicitly for clarity
            continue;
        }
    }

    return results;
};

// Get platform subscription by Stripe subscription ID
const getPlatformSubscriptionByStripeId = async (stripeSubscriptionId: string, transaction?: any): Promise<PlatformUserSubscription | null> => {
    const whereClause: any = { stripe_subscription_id: stripeSubscriptionId };
    
    return await PlatformUserSubscription.findOne({
        where: whereClause,
        transaction: transaction
    });
};

// Update platform subscription by Stripe subscription ID
const updatePlatformSubscriptionByStripeId = async (stripeSubscriptionId: string, updateData: any, transaction?: any): Promise<PlatformUserSubscription> => {
    const subscription = await PlatformUserSubscription.findOne({
        where: { stripe_subscription_id: stripeSubscriptionId },
        transaction: transaction
    });

    if (!subscription) {
        throw new Error('Platform subscription not found');
    }

    await subscription.update(updateData, { transaction });
    return subscription;
};

// Create platform subscription from webhook
const createPlatformSubscriptionFromWebhook = async (subscriptionData: any, transaction?: any): Promise<PlatformUserSubscription> => {
    // Get price and product details to create feature usage records
    const price = await PlatformStripePrice.findOne({
        where: {
            id: subscriptionData.platform_stripe_price_id,
            active: true,
            is_deleted: false
        },
        include: [
            {
                model: PlatformStripeProduct,
                as: 'product',
                include: [
                    {
                        model: PlatformStripeProductFeature,
                        as: 'features'
                    }
                ]
            }
        ],
        transaction: transaction
    });

    if (!price) {
        throw new Error('Price not found or inactive');
    }

    // Create platform subscription record
    const subscription = await PlatformUserSubscription.create({
        status: subscriptionData.status,
        user_id: subscriptionData.user_id,
        platform_stripe_price_id: price.id,
        end_date: subscriptionData.end_date,
        start_date: subscriptionData.start_date,
        created_by: subscriptionData.created_by,
        platform_stripe_product_id: price.platform_stripe_product_id,
        stripe_subscription_id: subscriptionData.stripe_subscription_id,
    }, { transaction });

    // Create feature usage records
    if ((price as any).product?.features) {
        for (const feature of (price as any).product.features) {
            await PlatformUserFeatureUsage.create({
                used_value: 0,
                limit_value: feature.limit_value,
                feature_key: feature.feature_key,
                created_by: subscriptionData.created_by,
                platform_user_subscription_id: subscription.id,
            }, { transaction });
        }
    }

    return subscription;
};

// Cancel platform subscription
const cancelPlatformSubscription = async (userId: string, subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<any> => {
    // Find the specific platform subscription
    const subscription = await PlatformUserSubscription.findOne({
        where: {
            user_id: userId,
            id: subscriptionId,
        },
        include: [
            {
                as: 'price',
                model: PlatformStripePrice,
                attributes: ['stripe_price_id']
            }
        ]
    });

    if (!subscription) {
        throw new Error('Platform subscription not found');
    }

    if (!subscription.stripe_subscription_id) {
        throw new Error('No Stripe subscription ID found');
    }

    // Cancel subscription in Stripe
    await stripeService.cancelStripeSubscription(subscription.stripe_subscription_id);

    // Update local subscription record
    await subscription.update({
        cancel_at_end_date: cancelAtPeriodEnd,
        canceled_at: cancelAtPeriodEnd ? null : new Date(),
        status: cancelAtPeriodEnd ? SubscriptionStatus.ACTIVE : SubscriptionStatus.CANCELED,
    });

    return subscription;
};

export default {
    cancelPlatformSubscription,
    createPlatformSubscription,
    getPlatformSubscriptionByStripeId,
    createFreeSubscriptionsForAllUsers,
    updatePlatformSubscriptionByStripeId,
    createPlatformSubscriptionFromWebhook,
};