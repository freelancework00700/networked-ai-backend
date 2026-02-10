import { bool, cleanEnv, num, port, str } from 'envalid';

const env = cleanEnv(process.env, {
    NODE_ENV: str({ choices: ['development', 'production', 'staging'] }),

    PORT: port(),

    API_URL: str(),
    FRONT_URL: str(),
    ADMIN_URL: str(),

    // Database Configuration
    MYSQL_USER: str(),
    MYSQL_PASSWORD: str(),
    MYSQL_HOST: str(),
    MYSQL_PORT: port(),
    DB_NAME: str(),

    SECRET_KEY: str(),

    // AWS Configuration
    AWS_API_VERSION: str(),
    AWS_SES_ACCESS_KEY_ID: str(),
    AWS_SES_SECRET_ACCESS_KEY: str(),
    AWS_SES_REGION: str(),
    AWS_SES_FROM_EMAIL: str(),
    AWS_SES_SENDING_RATE: num(),
    AWS_SES_MAX_CONNECTIONS: num(),

    // Twilio Configuration
    TWILIO_PHONE_NUMBER: str(),
    TWILIO_ACCOUNT_SID: str(),
    TWILIO_AUTHTOKEN: str(),

    // Seeding
    SEED: bool(),

    // Thumbnail size
    THUMBNAIL_SIZE: num(),

    // Stripe Configuration
    STRIPE_SECRET_KEY: str(),
    STRIPE_MAIN_ACCOUNT_WEBHOOK_SECRET: str(),
    STRIPE_CONNECTED_ACCOUNT_WEBHOOK_SECRET: str(),

    // Redis configuration
    RABBITMQ_HOST: str(),
    RABBITMQ_PORT: port(),
    RABBITMQ_USERNAME: str(),
    RABBITMQ_PASSWORD: str(),
    RABBITMQ_VHOST: str(),

    // Unsplash Configuration
    UNSPLASH_API_KEY: str(),
});

export default env; 