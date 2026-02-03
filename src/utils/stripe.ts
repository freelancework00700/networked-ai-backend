import Stripe from "stripe";
import env from "../utils/validate-env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export default stripe;
