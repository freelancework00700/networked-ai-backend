import { PlatformProductPriority, SubscriptionStatus } from '../types/enums';
import { PlatformStripePrice, PlatformStripeProduct, PlatformStripeProductFeature, PlatformUserFeatureUsage, PlatformUserSubscription } from '../models/index';

interface PlatformProductWithFeatures {
    id: string;
    name: string;
    active: boolean;
    stripe_product_id: string;
    description: string | null;
    plan_benefits: string | null;
    prices: PlatformStripePrice[];
    priority: PlatformProductPriority;
    features: PlatformStripeProductFeature[];
    subscription: PlatformUserSubscription | null;
    features_usages: PlatformUserFeatureUsage[] | null;
}
const platformStripeProductAttributes = ['id', 'name', 'description', 'plan_benefits', 'priority'];
const includeDetails = [
    {
        model: PlatformStripeProductFeature,
        as: 'features',
        attributes: ['id', 'feature_key', 'limit_value']
    },
    {
        model: PlatformStripePrice,
        as: 'prices',
        where: {
            active: true,
            is_deleted: false
        },
        attributes: ['id', 'amount', 'currency', 'interval', 'discount_percentage', 'banner_display_type'],
        required: false
    }
];

const fetchSubscriptionAndUsages = async (productId: string, userId: string) => {
    const subscription = await PlatformUserSubscription.findOne({
        where: {
            user_id: userId,
            status: SubscriptionStatus.ACTIVE,
            platform_stripe_product_id: productId,
        },
        attributes: ['id', 'status', 'platform_stripe_product_id', 'platform_stripe_price_id', 'start_date', 'end_date', 'cancel_at_end_date', 'canceled_at']
    });
    if(!subscription) return { subscription: null, features_usages: null };

    const features_usages = await PlatformUserFeatureUsage.findAll({
        where: {
            platform_user_subscription_id: subscription.id
        },
        attributes: ['id', 'feature_key', 'limit_value', 'used_value']
    });
    return { subscription, features_usages };
};

const getPlatformProducts = async (userId?: string): Promise<PlatformProductWithFeatures[]> => {
    const products = await PlatformStripeProduct.findAll({
        where: {
            active: true,
            is_deleted: false
        },
        include: includeDetails,
        attributes: platformStripeProductAttributes,
        order: [
            ['priority', 'ASC']
        ]
    });

    const productsData = products.map(product => product.toJSON()) as PlatformProductWithFeatures[];
    if (!userId) return productsData;

    // Fetch user's subscription and usage for each product
    const productsWithUserData = await Promise.all(
        productsData.map(async (product) => {
            const { subscription, features_usages } = await fetchSubscriptionAndUsages(product.id, userId);
            return { ...product, subscription, features_usages };
        })
    );

    return productsWithUserData;
};

const getPlatformProductById = async (productId: string, userId?: string): Promise<PlatformProductWithFeatures | null> => {
    const product = await PlatformStripeProduct.findOne({
        where: {
            id: productId,
            active: true,
            is_deleted: false
        },
        include: includeDetails,
        attributes: platformStripeProductAttributes,
    });

    if (!product) {
        return null;
    }

    const productData = product.toJSON() as PlatformProductWithFeatures;
    if (!userId) return productData;

    // Fetch user's subscription and usage
    const { subscription, features_usages } = await fetchSubscriptionAndUsages(productId, userId);
    return { ...productData, subscription, features_usages };
};

const createPlatformProduct = async (productData: any): Promise<PlatformProductWithFeatures> => {
    const product = await PlatformStripeProduct.create({
        stripe_product_id: productData.stripe_product_id || null,
        name: productData.name,
        description: productData.description || null,
        plan_benefits: productData.plan_benefits || null,
        active: productData.active !== undefined ? productData.active : true,
        priority: productData.priority || PlatformProductPriority.FREE,
        created_by: productData.created_by || null
    });

    // Create features if provided
    if (productData.features && Array.isArray(productData.features)) {
        for (const feature of productData.features) {
            await PlatformStripeProductFeature.create({
                platform_stripe_product_id: product.id,
                feature_key: feature.feature_key,
                limit_value: feature.limit_value,
                created_by: productData.created_by || null
            });
        }
    }

    // Create prices if provided
    if (productData.prices && Array.isArray(productData.prices)) {
        for (const price of productData.prices) {
            await PlatformStripePrice.create({
                platform_stripe_product_id: product.id,
                stripe_price_id: price.stripe_price_id,
                amount: price.amount,
                currency: price.currency || 'usd',
                interval: price.interval || 'month',
                discount_percentage: price.discount_percentage || null,
                banner_display_type: price.banner_display_type || null,
                active: price.active !== undefined ? price.active : true,
                created_by: productData.created_by || null
            });
        }
    }

    // Return the created product with features and prices
    const createdProduct = await getPlatformProductById(product.id);
    if (!createdProduct) {
        throw new Error('Failed to retrieve created product');
    }
    return createdProduct;
};

const getPlatformStripePriceWithProduct = async (id: string): Promise<PlatformStripePrice | null> => {
    if (!id) return null;

    return await PlatformStripePrice.findOne({
        where: {
            id: id,
            active: true,
            is_deleted: false
        },
        include: [
            {
                as: 'product',
                model: PlatformStripeProduct,
                attributes: platformStripeProductAttributes,
                include: [
                    {
                        as: 'features',
                        model: PlatformStripeProductFeature,
                        attributes: ['id', 'feature_key', 'limit_value']
                    }
                ]
            }
        ]
    });
};

export default {
    getPlatformProducts,
    createPlatformProduct,
    getPlatformProductById,
    getPlatformStripePriceWithProduct
};
