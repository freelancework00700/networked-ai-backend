import userService from './user.service';
import { Op, Transaction } from 'sequelize';
import { SubscriptionStatus } from '../types/enums';
import { StripeProduct, StripeProductEvent, StripePrice, Event, Subscription, User } from '../models/index';

const stripeProductAttributes = ['id', 'name', 'description', 'plan_benefits', 'is_sponsor', 'active', 'user_id'];
const stripePriceAttributes = ['id', 'amount', 'interval', 'active', 'discount_percentage', 'banner_display_type'];
const userAttributes = ['id', 'name', 'email', 'mobile', 'username', 'image_url', 'thumbnail_url', 'total_events_attended', 'total_gamification_points'];
const subscriptionAttributes = ['id', 'user_id', 'owner_id', 'product_id', 'price_id', 'status', 'start_date', 'end_date', 'cancel_at_end_date', 'canceled_at', 'created_at'];
const eventAttributes = ['id', 'title', 'slug', 'description', 'address', 'latitude', 'longitude', 'is_paid_event', 'start_date', 'end_date', 'capacity', 'is_public', 'thumbnail_url', 'image_url'];
/**
 * Create a new stripe product in database
 * @param data - Product data
 * @param userId - User ID who created the product
 * @param transaction - Database transaction
 * @returns Created stripe product
 */
const createStripeProduct = async (
    data: {
        name: string;
        user_id: string;
        active: boolean;
        is_sponsor: boolean;
        stripe_product_id: string;
        description?: string | null;
        plan_benefits?: string | null;
        stripe_account_id?: string | null;
    },
    userId: string,
    transaction?: Transaction
) => {
    return await StripeProduct.create(
        {
            ...data,
            created_by: userId,
            updated_by: userId,
        },
        { transaction }
    );
};

/**
 * Get stripe product by ID
 * @param id - Product ID
 * @param transaction - Database transaction
 * @returns Stripe product or null
 */
const getStripeProductById = async (id: string, transaction?: Transaction) => {
    return await StripeProduct.findOne({
        where: {
            id,
            is_deleted: false,
        },
        transaction,
    });
};

/**
 * Get stripe product by Stripe product ID
 * @param stripeProductId - Stripe product ID
 * @param transaction - Database transaction
 * @returns Stripe product or null
 */
const getStripeProductByStripeId = async (stripeProductId: string, transaction?: Transaction) => {
    return await StripeProduct.findOne({
        where: {
            stripe_product_id: stripeProductId,
            is_deleted: false,
        },
        transaction,
    });
};

/**
 * Create event-stripe product mappings
 * @param stripeProductId - Stripe product ID (UUID)
 * @param eventIds - Array of event IDs
 * @param transaction - Database transaction
 */
const createEventStripeProductMappings = async (
    stripeProductId: string,
    eventIds: string[],
    transaction?: Transaction
) => {
    if (eventIds.length === 0) {
        return;
    }

    const mappings = eventIds.map((eventId) => ({
        event_id: eventId,
        product_id: stripeProductId,
    }));

    await StripeProductEvent.bulkCreate(mappings, { transaction });
};

/**
 * Update stripe product by Stripe product ID
 * @param stripeProductId - Stripe product ID
 * @param data - Product data to update
 * @param userId - User ID who is updating (optional for webhook updates)
 * @param transaction - Database transaction
 */
const updateStripeProductByStripeId = async (
    stripeProductId: string,
    data: {
        name?: string;
        active?: boolean;
        is_deleted?: boolean;
        description?: string | null;
        plan_benefits?: string | null;
    },
    userId?: string | null,
    transaction?: Transaction
) => {
    await StripeProduct.update(
        {
            ...data,
            updated_by: userId || null,
        },
        {
            where: {
                stripe_product_id: stripeProductId,
                is_deleted: false,
            },
            transaction,
        }
    );
};

/**
 * Remove event mappings for a product
 * @param productId - Product ID (UUID)
 * @param eventIds - Array of event IDs to remove (if empty, removes all)
 * @param transaction - Database transaction
 */
const removeEventStripeProductMappings = async (
    productId: string,
    eventIds?: string[],
    transaction?: Transaction
) => {
    const whereClause: any = { product_id: productId };
    
    if (eventIds && eventIds.length > 0) {
        whereClause.event_id = { [Op.in]: eventIds };
    }

    await StripeProductEvent.destroy({where: whereClause, transaction });
};

/**
 * Update event mappings - removes old and creates new
 * @param productId - Product ID (UUID)
 * @param eventIds - Array of event IDs
 * @param transaction - Database transaction
 */
const updateEventStripeProductMappings = async (
    productId: string,
    eventIds: string[],
    transaction?: Transaction
) => {
    // Remove all existing mappings
    await removeEventStripeProductMappings(productId, undefined, transaction);
    
    // Create new mappings
    if (eventIds.length > 0) {
        await createEventStripeProductMappings(productId, eventIds, transaction);
    }
};

/**
 * Get all stripe products
 * @param userId - User ID to filter by
 * @param authenticatedUserId - Authenticated user ID to include subscriptions
 * @returns Array of products
 */
const getAllStripeProducts = async (userId: string, authenticatedUserId: string) => {
    const whereClause: any = {
        user_id: userId,
        is_deleted: false,
    };

    const priceInclude: any = {
        model: StripePrice,
        as: 'prices',
        attributes: stripePriceAttributes,
        where: { 
            active: true,
            is_deleted: false,
        },
        required: false,
        include: [
            {
                model: Subscription,
                as: 'subscriptions',
                attributes: subscriptionAttributes,
                where: {
                    is_deleted: false,
                    user_id: authenticatedUserId,
                    status: SubscriptionStatus.ACTIVE,
                },
                required: false,
                separate: true, // Use separate query to avoid duplicates
                order: [['created_at', 'DESC']], // Get most recent subscription first
                limit: 1, // Only get the most recent subscription
            },
        ]
    };

    return await StripeProduct.findAll({
        where: whereClause,
        attributes: stripeProductAttributes,
        include: [
            priceInclude,
            {
                model: Event,
                as: 'events',
                attributes: eventAttributes,
                through: { attributes: [] },
                required: false,
            },
        ],
        order: [['created_at', 'DESC']],
    });
};

/**
 * Get stripe product by ID with prices and events
 * @param id - Product ID
 * @param currentUserId - Optional current user ID to include subscriptions
 * @param transaction - Database transaction
 * @returns Stripe product with prices and events or null
 */
const getStripeProductByIdWithRelations = async (id: string, authenticatedUserId: string) => {
    const priceInclude: any = {
        model: StripePrice,
        as: 'prices',
        attributes: stripePriceAttributes,
        where: { 
            active: true,
            is_deleted: false
        },
        required: false,
        include: [
            {
                model: Subscription,
                as: 'subscriptions',
                attributes: subscriptionAttributes,
                where: {
                    user_id: authenticatedUserId,
                    status: SubscriptionStatus.ACTIVE,
                    is_deleted: false,
                },
                required: false,
                separate: true, // Use separate query to avoid duplicates
                order: [['created_at', 'DESC']], // Get most recent subscription first
                limit: 1, // Only get the most recent subscription
            },
        ]
    };

    return await StripeProduct.findOne({
        where: {
            id,
            is_deleted: false,
        },
        attributes: stripeProductAttributes,
        include: [
            priceInclude,
            { model: User, as: 'user', attributes: userAttributes },
            {
                model: Event,
                as: 'events',
                attributes: eventAttributes,
                through: { attributes: [] },
                required: false,
            },
        ]
    });
};

/**
 * Get total subscribers count for a product
 * @param productId - Product ID
 * @param transaction - Database transaction
 * @returns Total subscribers count
 */
const getTotalSubscribersCount = async (productId: string): Promise<number> => {
    const count = await Subscription.count({
        where: {
            product_id: productId,
            is_deleted: false,
        },
    });
    return count;
};

const formatProductResponse = async (product: any) => {
    // parse plan_benefits from JSON string to array
    let planBenefits: string[] = [];
    if (product.plan_benefits) {
        if (typeof product.plan_benefits === 'string') {
            try {
                planBenefits = JSON.parse(product.plan_benefits);
            } catch (e) {
                planBenefits = [];
            }
        }
    }

    const eventIds = product.events ? product.events.map((event: any) => event.id) : [];

    // Get total subscribers count
    const total_subscribers = await getTotalSubscribersCount(product.id);

    return {
        ...product,
        total_subscribers,
        event_ids: eventIds,
        plan_benefits: planBenefits,
    };
};

/**
 * Soft delete stripe product by database ID
 * @param productId - Product ID (UUID)
 * @param userId - User ID who is deleting
 * @param transaction - Database transaction
 */
const deleteStripeProduct = async (
    productId: string,
    userId: string,
    transaction?: Transaction
) => {
    await StripeProduct.update(
        {
            active: false,
            is_deleted: true,
            updated_by: userId,
            deleted_by: userId,
            deleted_at: new Date(),
        },
        {
            where: {
                id: productId,
                is_deleted: false,
            },
            transaction,
        }
    );
};

/**
 * Get subscribers of a plan with pagination
 * @param productId - Product ID
 * @param page - Page number
 * @param limit - Items per page
 * @param currentUserId - Current authenticated user ID (for connection status)
 * @param transaction - Database transaction
 */
const getPlanSubscribersPaginated = async (
    productId: string,
    page: number = 1,
    limit: number = 10,
    currentUserId: string | null = null,
    transaction?: Transaction
) => {
    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Subscription.findAndCountAll({
        where: {
            product_id: productId,
            is_deleted: false,
        },
        include: [
            { model: User, as: 'user', attributes: userAttributes },
            { model: StripePrice, as: 'price', attributes: stripePriceAttributes },
        ],
        attributes: subscriptionAttributes,
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        transaction,
    });

    // Extract users from subscriptions and convert to JSON
    const users = rows
        .map((row: any) => row.user)
        .filter((user: User | null) => user !== null)
        .map((user: User) => (user.toJSON ? user.toJSON() : user));

    // Add connection status to users (let it transform users by default)
    const usersWithStatus = await userService.addConnectionStatusToUsers(
        users as User[],
        currentUserId || null
    );

    // Map subscriptions with connection status (match by user ID)
    const dataWithConnectionStatus = rows.map((row: any) => {
        const subscriptionData = row.get({ plain: true });
        const userFromRow = row.user;
        const userId = userFromRow?.id || subscriptionData.user?.id;
        
        // Find the user with connection status by matching ID
        const userWithStatus = usersWithStatus.find((u: any) => u.id === userId);
        
        return {
            ...subscriptionData,
            user: subscriptionData.user ? {
                ...subscriptionData.user,
                connection_status: userWithStatus?.connection_status || null
            } : null
        };
    });

    return {
        data: dataWithConnectionStatus,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

export default {
    deleteStripeProduct,
    createStripeProduct,
    getStripeProductById,
    getAllStripeProducts,
    formatProductResponse,
    getTotalSubscribersCount,
    getStripeProductByStripeId,
    getPlanSubscribersPaginated,
    updateStripeProductByStripeId,
    createEventStripeProductMappings,
    removeEventStripeProductMappings,
    updateEventStripeProductMappings,
    getStripeProductByIdWithRelations,
};

