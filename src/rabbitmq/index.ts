import amqp from 'amqplib';
import env from '../utils/validate-env';
import Logger from '../utils/logger.service';

let connection: any = null;
export let channel: amqp.Channel | null = null;

/**
 * Get RabbitMQ connection URL
 */
const getRabbitMQUrl = (): string => {
    const host = env.RABBITMQ_HOST || 'localhost';
    const port = env.RABBITMQ_PORT || 5672;
    const user = env.RABBITMQ_USERNAME || 'guest';
    const pass = env.RABBITMQ_PASSWORD || 'guest';
    const vhost = env.RABBITMQ_VHOST || '/';
    
    return `amqp://${user}:${pass}@${host}:${port}${vhost === '/' ? '' : `/${encodeURIComponent(vhost)}`}`;
};

/**
 * Connect to RabbitMQ server
 */
export const connectRabbitMQ = async (): Promise<void> => {
    try {
        const url = getRabbitMQUrl();
        const conn = await amqp.connect(url);
        connection = conn;
        
        conn.on('error', (err) => {
            Logger.error('RabbitMQ connection error:', err);
        });

        conn.on('close', () => {
            Logger.warn('RabbitMQ connection closed.');
            channel = null;
            connection = null;
        });

        channel = await conn.createChannel();
        
        Logger.info('RabbitMQ connection established successfully.');
    } catch (error) {
        Logger.error('Failed to connect to RabbitMQ:', error);
        throw error;
    }
};

/**
 * Check if RabbitMQ is connected
 */
export const isConnected = (): boolean => {
    return channel !== null && connection !== null;
};

/**
 * Close RabbitMQ connection
 */
export const closeRabbitMQ = async (): Promise<void> => {
    try {
        if (channel) {
            await channel.close();
            channel = null;
        }
        if (connection) {
            const conn = connection;
            connection = null;
            await conn.close();
        }
        Logger.info('RabbitMQ connection closed successfully.');
    } catch (error) {
        Logger.error('Error closing RabbitMQ connection:', error);
        throw error;
    }
};
