import { channel } from './index';
import { ConsumeMessage } from 'amqplib';

/**
 * Start consuming messages from a queue
 * @param queueName - Name of the queue to consume from
 * @param onMessage - Callback function to handle messages
 */
export const startConsumer = async (
    queueName: string,
    onMessage: (message: any, rawMsg: ConsumeMessage) => Promise<void> | void
): Promise<void> => {
    if (!channel) throw new Error('RabbitMQ channel not initialized');

    await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
        if (msg === null) {
            return;
        }

        try {
            const messageContent = JSON.parse(msg.content.toString());
            await onMessage(messageContent, msg);
            if (channel) {
                channel.ack(msg);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            if (channel) {
                channel.nack(msg, false, false);
            }
        }
    });

    console.log(`Consumer started for queue: ${queueName}`);
};
