import { Transaction } from 'sequelize';
import { StripePrice, StripeProduct, User } from '../models/index';

/**
 * Create a new stripe price in database
 * @param data - Price data
 * @param userId - User ID who created the price
 * @param transaction - Database transaction
 * @returns Created stripe price
 */
const createStripePrice = async (
    data: {
        amount: number;
        active: boolean;
        interval: string;
        currency: string;
        product_id: string;
        stripe_price_id: string;
        discount_percentage?: number | null;
        banner_display_type?: string | null;
    },
    userId: string,
    transaction?: Transaction
) => {
    return await StripePrice.create(
        {
            ...data,
            created_by: userId,
            updated_by: userId,
        },
        { transaction }
    );
};

/**
 * Get stripe prices by product ID
 * @param productId - Product ID
 * @param transaction - Database transaction
 * @returns Array of stripe prices
 */
const getStripePricesByProductId = async (productId: string, transaction?: Transaction) => {
    return await StripePrice.findAll({
        where: {
            product_id: productId,
            is_deleted: false,
        },
        transaction,
    });
};

/**
 * Get stripe price by amount, interval, and product
 * @param productId - Product ID
 * @param amount - Price amount
 * @param interval - Price interval
 * @param transaction - Database transaction
 * @returns Stripe price or null
 */
const getStripePriceByAmountAndInterval = async (
    productId: string,
    amount: number,
    interval: string,
    transaction?: Transaction
) => {
    return await StripePrice.findOne({
        where: {
            amount,
            interval,
            is_deleted: false,
            product_id: productId,
        },
        transaction,
    });
};

/**
 * Get stripe price by Stripe price ID
 * @param stripePriceId - Stripe price ID
 * @param transaction - Database transaction
 * @returns Stripe price or null
 */
const getStripePriceByStripeId = async (stripePriceId: string, transaction?: Transaction) => {
    return await StripePrice.findOne({
        where: {
            stripe_price_id: stripePriceId,
            is_deleted: false,
        },
        transaction,
    });
};

/**
 * Get stripe price by database ID with product and owner information
 * @param priceId - Price ID (UUID)
 * @param transaction - Database transaction
 * @returns Stripe price with product and owner info or null
 */
const getStripePriceByIdWithProduct = async (priceId: string, transaction?: Transaction) => {
    return await StripePrice.findOne({
        where: {
            id: priceId,
            is_deleted: false,
        },
        include: [
            {
                model: StripeProduct,
                as: 'product',
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'stripe_account_id'],
                    },
                ],
            },
        ],
        transaction,
    });
};

/**
 * Update stripe price by Stripe price ID
 * @param stripePriceId - Stripe price ID
 * @param data - Price data to update
 * @param userId - User ID who is updating (optional for webhook updates)
 * @param transaction - Database transaction
 */
const updateStripePriceByStripeId = async (
    stripePriceId: string,
    data: {
        active?: boolean;
        is_deleted?: boolean;
        discount_percentage?: number | null;
        banner_display_type?: string | null;
    },
    userId?: string | null,
    transaction?: Transaction
) => {
    await StripePrice.update(
        {
            ...data,
            updated_by: userId || null,
        },
        {
            where: {
                stripe_price_id: stripePriceId,
                is_deleted: false,
            },
            transaction,
        }
    );
};

export default {
    createStripePrice,
    getStripePriceByStripeId,
    getStripePricesByProductId,
    updateStripePriceByStripeId,
    getStripePriceByIdWithProduct,
    getStripePriceByAmountAndInterval,
};

