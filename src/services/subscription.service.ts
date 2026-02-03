import { Transaction } from 'sequelize';
import { SubscriptionStatus } from '../types/enums';
import { Subscription, User, StripeProduct, StripePrice, Event } from '../models/index';

const stripePriceAttributes = ['id', 'amount', 'interval', 'active'];
const userAttributes = ['id', 'name', 'email', 'mobile', 'username', 'image_url', 'thumbnail_url'];
const stripeProductAttributes = ['id', 'name', 'description', 'plan_benefits', 'is_sponsor', 'active', 'is_deleted'];
const subscriptionAttributes = ['id', 'user_id', 'owner_id', 'product_id', 'price_id', 'status', 'start_date', 'end_date', 'cancel_at_end_date', 'canceled_at', 'created_at'];
const eventAttributes = ['id', 'title', 'slug', 'description', 'address', 'latitude', 'longitude', 'is_paid_event', 'start_date', 'end_date', 'capacity', 'is_public', 'thumbnail_url', 'image_url'];

export const includeDetails = [
    { model: User, as: 'user', attributes: userAttributes },
    { model: User, as: 'owner', attributes: userAttributes },
    { model: StripePrice, as: 'price', attributes: stripePriceAttributes },
    {
        model: StripeProduct,
        as: 'product',
        attributes: stripeProductAttributes,
        include: [
            { model: Event, as: 'events', attributes: eventAttributes, through: { attributes: [] } },
        ],
    },
];
/**
 * Create a new subscription in database
 * @param data - Subscription data
 * @param transaction - Database transaction
 * @returns Created subscription
 */
const createSubscription = async (
    data: {
        end_date: Date;
        user_id: string;
        price_id: string;
        owner_id: string;
        start_date: Date;
        product_id: string;
        canceled_at?: Date | null;
        status: SubscriptionStatus;
        cancel_at_end_date?: boolean;
        stripe_subscription_id: string;
    },
    transaction?: Transaction
) => {
    return await Subscription.create(
        {
            ...data,
            canceled_at: data.canceled_at || null,
            cancel_at_end_date: data.cancel_at_end_date || false,
        },
        { transaction }
    );
};

/**
 * Get subscription by Stripe subscription ID
 * @param stripeSubscriptionId - Stripe subscription ID
 * @param transaction - Database transaction
 * @returns Subscription or null
 */
const getSubscriptionByStripeId = async (stripeSubscriptionId: string, transaction?: Transaction) => {
    return await Subscription.findOne({
        where: {
            is_deleted: false,
            stripe_subscription_id: stripeSubscriptionId,
        },
        transaction,
    });
};

/**
 * Update subscription by Stripe subscription ID
 * @param stripeSubscriptionId - Stripe subscription ID
 * @param data - Subscription data to update
 * @param transaction - Database transaction
 */
const updateSubscriptionByStripeId = async (
    stripeSubscriptionId: string,
    data: {
        end_date?: Date;
        start_date?: Date;
        canceled_at?: Date | null;
        status?: SubscriptionStatus;
        cancel_at_end_date?: boolean;
    },
    transaction?: Transaction
) => {
    await Subscription.update(
        data,
        {
            where: {
                is_deleted: false,
                stripe_subscription_id: stripeSubscriptionId,
            },
            transaction,
        }
    );
};

/**
 * Get subscription by database ID
 * @param id - Subscription ID (UUID)
 * @param transaction - Database transaction
 * @returns Subscription or null
 */
const getSubscriptionById = async (id: string, transaction?: Transaction) => {
    return await Subscription.findOne({
        where: {
            id,
            is_deleted: false,
        },
        transaction,
    });
};

/**
 * Get a single subscription by ID for a specific user
 * @param id - Subscription ID
 * @param userId - User ID (subscriber)
 * @param transaction - Database transaction
 */
const getSubscriptionByIdForUser = async (
    id: string,
    userId: string,
    transaction?: Transaction
) => {
    return await Subscription.findOne({
        where: {
            id,
            user_id: userId,
            is_deleted: false,
        },
        include: includeDetails,
        attributes: subscriptionAttributes,
        transaction,
    });
};

/**
 * Get all subscriptions for a user with pagination
 * @param userId - User ID
 * @param page - Page number
 * @param limit - Items per page
 * @param transaction - Database transaction
 */
const getUserSubscriptionsPaginated = async (
    userId: string,
    page: number = 1,
    limit: number = 10,
    transaction?: Transaction
) => {
    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Subscription.findAndCountAll({
        where: {
            user_id: userId,
            is_deleted: false,
        },
        include: includeDetails,
        attributes: subscriptionAttributes,
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        transaction,
    });

    return {
        data: rows,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

export default {
    createSubscription,
    getSubscriptionById,
    getSubscriptionByIdForUser,
    getSubscriptionByStripeId,
    updateSubscriptionByStripeId,
    getUserSubscriptionsPaginated,
};

