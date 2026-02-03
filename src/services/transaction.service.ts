import { Transaction } from 'sequelize';
import { TransactionStatus, TransactionType } from '../types/enums';
import { Transaction as TransactionModel, User, Event, StripeProduct, StripePrice } from '../models/index';

const stripePriceAttributes = ['id', 'amount', 'interval', 'active'];
const userAttributes = ['id', 'name', 'email', 'mobile', 'username', 'image_url', 'thumbnail_url'];
const stripeProductAttributes = ['id', 'name', 'description', 'plan_benefits', 'is_sponsor', 'active'];
const eventAttributes = ['id', 'title', 'slug', 'description', 'address', 'latitude', 'longitude', 'is_paid_event', 'start_date', 'end_date', 'capacity', 'is_public', 'thumbnail_url', 'image_url'];
const transactionAttributes = ['id', 'type', 'product_id', 'price_id', 'event_id', 'user_id', 'amount', 'currency', 'status', 'payment_method', 'transfer_amount', 'host_user_id', 'created_at'];


export const includeDetails = [
    { model: User, as: 'user', attributes: userAttributes },
    { model: Event, as: 'event', attributes: eventAttributes },
    { model: User, as: 'host_user', attributes: userAttributes },
    { model: StripePrice, as: 'price', attributes: stripePriceAttributes },
    { model: StripeProduct, as: 'product', attributes: stripeProductAttributes },
];

/**
 * Create a new transaction in database
 * @param data - Transaction data
 * @param transaction - Database transaction
 * @returns Created transaction
 */
const createTransaction = async (
    data: {
        type: TransactionType;
        user_id: string;
        stripe_payment_intent_id: string;
        amount: number;
        currency: string;
        status: TransactionStatus;
        product_id?: string | null;
        price_id?: string | null;
        event_id?: string | null;
        payment_method?: string | null;
        transfer_amount?: number | null;
        host_user_id?: string | null;
        metadata?: string | null;
    },
    transaction?: Transaction
) => {
    return await TransactionModel.create(
        {
            ...data,
            product_id: data.product_id || null,
            price_id: data.price_id || null,
            event_id: data.event_id || null,
            payment_method: data.payment_method || null,
            transfer_amount: data.transfer_amount || null,
            host_user_id: data.host_user_id || null,
            metadata: data.metadata || null,
        },
        { transaction }
    );
};

/**
 * Get transaction by Stripe payment intent ID
 * @param stripePaymentIntentId - Stripe payment intent ID
 * @param transaction - Database transaction
 * @returns Transaction or null
 */
const getTransactionByPaymentIntentId = async (stripePaymentIntentId: string, transaction?: Transaction) => {
    return await TransactionModel.findOne({
        where: {
            stripe_payment_intent_id: stripePaymentIntentId,
            is_deleted: false,
        },
        transaction,
    });
};

/**
 * Update transaction by Stripe payment intent ID
 * @param stripePaymentIntentId - Stripe payment intent ID
 * @param data - Transaction data to update
 * @param transaction - Database transaction
 */
const updateTransactionByPaymentIntentId = async (
    stripePaymentIntentId: string,
    data: {
        status?: TransactionStatus;
        payment_method?: string | null;
    },
    transaction?: Transaction
) => {
    await TransactionModel.update(
        data,
        {
            where: {
                stripe_payment_intent_id: stripePaymentIntentId,
                is_deleted: false,
            },
            transaction,
        }
    );
};

/**
 * Get all transactions for a user with pagination
 * @param userId - User ID
 * @param page - Page number
 * @param limit - Items per page
 */
const getUserTransactionsPaginated = async (
    userId: string,
    page: number = 1,
    limit: number = 10,
    transaction?: Transaction
) => {
    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await TransactionModel.findAndCountAll({
        where: {
            user_id: userId,
            is_deleted: false,
        },
        include: includeDetails,
        attributes: transactionAttributes,
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

/**
 * Get a single transaction by ID for a specific user
 * @param id - Transaction ID
 * @param userId - User ID (owner/payer)
 */
const getTransactionByIdForUser = async (
    id: string,
    userId: string,
    transaction?: Transaction
) => {
    return await TransactionModel.findOne({
        where: {
            id,
            user_id: userId,
            is_deleted: false,
        },
        include: includeDetails,
        attributes: transactionAttributes,
        transaction,
    });
};

export default {
    createTransaction,
    getTransactionByIdForUser,
    getUserTransactionsPaginated,
    getTransactionByPaymentIntentId,
    updateTransactionByPaymentIntentId,
};

