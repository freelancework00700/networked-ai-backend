import Stripe from 'stripe';
import stripe from '../utils/stripe';
import env from '../utils/validate-env';
import loggerService from '../utils/logger.service';
import stripePriceService from './stripe-price.service';
import { StripeAccountStatus, StripePriceInterval, SubscriptionStatus } from '../types/enums';

/**
 * Create a product in Stripe
 * @param name - Product name
 * @param description - Product description
 * @param metadata - Optional metadata object
 * @returns Stripe product object
 */
export const createStripeProduct = async (
    name: string, 
    description?: string, 
    metadata?: Record<string, string>
) => {
    return await stripe.products.create({
        name,
        metadata: metadata || undefined,
        description: description || undefined,
    });
};

/**
 * Create a price in Stripe
 * @param productId - Stripe product ID
 * @param amount - Amount in dollars
 * @param currency - Currency code (default: 'usd')
 * @param interval - Billing interval ('month' or 'year')
 * @returns Stripe price object
 */
export const createStripePrice = async (
    productId: string,
    amount: number,
    currency = 'usd',
    interval: StripePriceInterval
) => {
    // Convert amount from dollars to cents
    const amountInCents = Math.round(amount * 100);

    return await stripe.prices.create({
        product: productId,
        recurring: { interval },
        unit_amount: amountInCents,
        currency: currency.toLowerCase()
    });
};

/**
 * Update a product in Stripe
 * @param name - Product name
 * @param productId - Stripe product ID
 * @param description - Product description
 * @returns Updated Stripe product object
 */
export const updateStripeProduct = async (
    name: string,
    productId: string,
    description?: string,
) => {
    return await stripe.products.update(productId, {name, description: description || undefined });
};

/**
 * Retrieve a product from Stripe
 * @param productId - Stripe product ID
 * @returns Stripe product object
 */
export const retrieveStripeProduct = async (productId: string) => {
    return await stripe.products.retrieve(productId);
};

/**
 * List all prices for a product in Stripe
 * @param productId - Stripe product ID
 * @returns List of Stripe price objects
 */
export const listStripePrices = async (productId: string) => {
    return await stripe.prices.list({ product: productId });
};

/**
 * Update a price in Stripe
 * @param priceId - Stripe price ID
 * @param active - Whether the price is active
 * @returns Updated Stripe price object
 */
export const updateStripePrice = async (priceId: string, active: boolean) => {
    return await stripe.prices.update(priceId, { active });
};

/**
 * Archive (delete) a product in Stripe
 * Note: Stripe doesn't allow permanent deletion, only archiving
 * @param productId - Stripe product ID
 * @returns Archived Stripe product object
 */
export const archiveStripeProduct = async (productId: string) => {
    return await stripe.products.update(productId, { active: false });
};

/**
 * Create a Stripe Connect account (Express account)
 * @param email - User email
 * @param userId - User ID for metadata
 * @returns Stripe account object
 */
export const createStripeAccount = async (email: string, userId: string) => {
    return await stripe.accounts.create({
        type: 'express',
        email,
        metadata: {
            userId: userId,
        },
    });
};

/**
 * Retrieve a Stripe Connect account
 * @param accountId - Stripe account ID
 * @returns Stripe account object or null
 */
export const retrieveStripeAccount = async (accountId: string) => {
    try {
        return await stripe.accounts.retrieve(accountId);
    } catch (error: any) {
        return null;
    }
};

/**
 * Create an account link for onboarding
 * @param accountId - Stripe account ID
 * @returns Account link object with URL
 */
export const createAccountLink = async (accountId: string) => {
    return await stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        return_url: `${process.env.FRONT_URL}`,
        refresh_url: `${process.env.FRONT_URL}`,
    });
};


export const getAccountStatus = (account: Stripe.Account): StripeAccountStatus => {
    let status: StripeAccountStatus = StripeAccountStatus.PENDING_VERIFICATION;

    if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
        status = StripeAccountStatus.ACTIVE;
    } else if (account.details_submitted) {
        status = StripeAccountStatus.PENDING_VERIFICATION;
    } else if (account?.requirements?.currently_due && account?.requirements?.currently_due?.length > 0) {
        status = StripeAccountStatus.ACTION_REQUIRED;
    } else if (account.requirements?.errors && account.requirements?.errors?.length > 0) {
        status = StripeAccountStatus.ERROR;
    }

    return status;
};

export const getSubscriptionStatus = (subscription: Stripe.Subscription): SubscriptionStatus => {
    let status: SubscriptionStatus = SubscriptionStatus.UNPAID;

    if (subscription.status === SubscriptionStatus.ACTIVE) {
        status = SubscriptionStatus.ACTIVE;
    } else if (subscription.status === SubscriptionStatus.TRIALING) {
        status = SubscriptionStatus.TRIALING;
    } else if (subscription.status === SubscriptionStatus.PAST_DUE) {
        status = SubscriptionStatus.PAST_DUE;
    } else if (subscription.status === SubscriptionStatus.CANCELED) {
        status = SubscriptionStatus.CANCELED;
    } else if (subscription.status === SubscriptionStatus.UNPAID) {
        status = SubscriptionStatus.UNPAID;
    } else if (subscription.status === SubscriptionStatus.INCOMPLETE) {
        status = SubscriptionStatus.INCOMPLETE;
    }

    return status;
};

/**
 * Create a dashboard login link for a connected account
 * @param stripeAccountId - Stripe account ID
 * @returns Stripe login link object
 */
export const createDashboardLoginLink = async (stripeAccountId: string): Promise<Stripe.LoginLink> => {
    return await stripe.accounts.createLoginLink(stripeAccountId);
};

/**
 * Retrieve a Stripe price
 * @param priceId - Stripe price ID
 * @returns Stripe price object or null
 */
export const retrieveStripePrice = async (priceId: string) => {
    try {
        return await stripe.prices.retrieve(priceId);
    } catch (error: any) {
        return null;
    }
};

/**
 * Lookup or create a Stripe customer
 * @param email - Customer email
 * @param userId - User ID for metadata
 * @returns Stripe customer ID or null
 */
export const lookupOrCreateCustomer = async (email: string, userId: string): Promise<string | null> => {
    try {
        // First, try to find existing customer by email
        const customers = await stripe.customers.list({ email, limit: 1 });

        if (customers.data.length > 0) {
            return customers.data[0].id;
        }

        // If not found, create new customer
        const customer = await stripe.customers.create({ email, metadata: { userId } });

        return customer.id;
    } catch (error: any) {
        return null;
    }
};

/**
 * Find price and get Stripe account ID, product ID, and Stripe price ID
 * @param priceId - Database price ID (UUID)
 * @returns Object with stripeAccountId, productId, and stripePriceId or null
 */
export const findPriceAndGetStripeAccountId = async (priceId: string) => {
    const priceData: any = await stripePriceService.getStripePriceByIdWithProduct(priceId);
    
    if (!priceData || !priceData.product || !priceData.product.user) {
        return null;
    }

    const product = priceData.product;
    const owner = product.user;

    if (!owner.stripe_account_id) {
        return null;
    }

    return {
        productId: product.id,
        stripeAccountId: owner.stripe_account_id,
        stripePriceId: priceData.stripe_price_id,
        ownerId: owner.id,
    };
};

/**
 * Cancel a Stripe subscription
 * @param stripeSubscriptionId - Stripe subscription ID
 * @returns Stripe subscription object
 */
export const cancelStripeSubscription = async (stripeSubscriptionId: string) => {
    return await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
};

/**
 * Create a generic payment intent (for event tickets, etc.)
 * @param options - Stripe PaymentIntentCreateParams
 * @returns Created PaymentIntent or null
 */
export const createPaymentIntent = async (options: Stripe.PaymentIntentCreateParams) => {
    try {
        return await stripe.paymentIntents.create(options);
    } catch (error: any) {
        loggerService.error(`Error creating payment intent: ${error.message}`);
        return null;
    }
};

/**
 * Update an existing payment intent
 * @param paymentIntentId - Stripe payment intent ID
 * @param options - Stripe PaymentIntentUpdateParams
 * @returns Updated PaymentIntent or null
 */
export const updatePaymentIntent = async (
    paymentIntentId: string,
    options: Stripe.PaymentIntentUpdateParams
) => {
    try {
        return await stripe.paymentIntents.update(paymentIntentId, options);
    } catch (error: any) {
        loggerService.error(`Error updating payment intent ${paymentIntentId}: ${error.message}`);
        return null;
    }
};
/**
 * Create subscription payment intent
 * @param stripePriceId - Stripe price ID
 * @param stripeAccountId - Stripe Connect account ID (destination)
 * @param customerId - Stripe customer ID
 * @param productId - Database product ID to store in metadata
 * @param priceId - Database price ID to store in metadata
 * @param userId - User ID (subscriber) to store in metadata
 * @param ownerId - Owner ID (product creator) to store in metadata
 * @returns Subscription data with client secret or null on error
 */
const createSubscriptionPaymentIntent = async (
    stripePriceId: string,
    stripeAccountId: string,
    customerId: string,
    productId: string,
    priceId: string,
    userId: string,
    ownerId: string
  ): Promise<{
    status: string;
    price_id: string;
    end_date: number;
    start_date: number;
    customer_id: string;
    client_secret: string;
    subscription_id: string;
    hosted_invoice_url: string;
  } | null> => {
    try {
      const subscriptionPayload: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: stripePriceId }],
        payment_behavior: "default_incomplete",
        expand: ['latest_invoice.confirmation_secret'],
        transfer_data: {
          destination: stripeAccountId,
          amount_percent: 90,
        },
        metadata: {
            user_id: userId,
            owner_id: ownerId,
            price_id: priceId,
            product_id: productId
        },
      };
  
      const subscription: any = await stripe.subscriptions.create(subscriptionPayload);
      const clientSecret = subscription?.latest_invoice?.confirmation_secret?.client_secret;
  
      if (!clientSecret) {
        loggerService.error("Client secret not found in subscription");
        return null;
      }
  
      return {
        price_id: stripePriceId,
        customer_id: customerId,
        client_secret: clientSecret,
        status: subscription.status,
        subscription_id: subscription.id,
        end_date: subscription.items.data[0].current_period_end * 1000,
        start_date: subscription.items.data[0].current_period_start * 1000,
        hosted_invoice_url: subscription.latest_invoice.hosted_invoice_url,
      };
    } catch (err: any) {
      loggerService.error(`Error creating subscription payment intent: ${err.message}`);
      return null;
    }
};

const createSubscriptionCheckout = async (
    userId: string,
    dbPriceId: string,
    customerId: string, 
    stripePriceId: string,
): Promise<{ url: string | null } | null> => {
  try {
    const metadata = {
        user_id: userId,
        price_id: dbPriceId,
        is_platform: 'true'
    };

    const { url } = await stripe.checkout.sessions.create({
      metadata,
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      allow_promotion_codes: false,
      subscription_data: { metadata },
      cancel_url: `${env.ADMIN_URL}/plans`,
      success_url: `${env.ADMIN_URL}/plans`,
      line_items: [{ price: stripePriceId, quantity: 1 }],
    });

    return { url };
  } catch (err: any) {
    loggerService.error(`Error creating subscription checkout: ${err.message}`);
    return null;
  }
};

const refundTransaction = async (
    eventId: string,
    attendeeId: string,
    refundAmount: number,
    stripePaymentIntentId: string,
) => {
    return await stripe.refunds.create({
        reason: 'requested_by_customer',
        payment_intent: stripePaymentIntentId,
        amount: Math.round(refundAmount * 100),
        metadata: {
            event_id: eventId,
            attendee_id: attendeeId,
        },
    });
}

export default {
    listStripePrices,
    createStripePrice,
    updateStripePrice,
    createAccountLink,
    refundTransaction,
    updateStripeProduct,
    retrieveStripePrice,
    archiveStripeProduct,
    createStripeProduct,
    createPaymentIntent,
    createStripeAccount,
    updatePaymentIntent,
    retrieveStripeProduct,
    retrieveStripeAccount,
    lookupOrCreateCustomer,
    createDashboardLoginLink,
    cancelStripeSubscription,
    createSubscriptionCheckout,
    findPriceAndGetStripeAccountId,
    createSubscriptionPaymentIntent,
};

