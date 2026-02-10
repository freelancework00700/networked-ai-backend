import * as cron from 'node-cron';
import Logger from '../utils/logger.service';
import { User } from '../models';
import eventReminderService from '../services/event-reminder.service';
import platformSubscriptionService from '../services/platform-subscription.service';

/**
 * Initialize all schedulers
 */
export const initSchedulers = () => {
    // Schedule weekly points reset - Every Sunday at 11:59:59 PM
    // Cron format: second minute hour day month dayOfWeek
    // 0 = Sunday
    cron.schedule('59 59 23 * * 0', async () => {
        try {
            Logger.info('Starting weekly gamification points reset...');
            const [affectedRows] = await User.update(
                { total_gamification_points_weekly: 0 },
                {
                    where: { is_deleted: false }
                }
            );
            Logger.info(`Weekly gamification points reset completed. Updated ${affectedRows} users.`);
        } catch (error) {
            Logger.error('Error resetting weekly gamification points:', error);
        }
    });
    Logger.info('Weekly gamification points reset scheduler initialized (Every Sunday at 11:59:59 PM)');

    // Schedule event reminders check - Every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        try {
            Logger.info('Starting event reminders check...');
            await eventReminderService.checkAndSendReminders();
            Logger.info('Event reminders check completed.');
        } catch (error) {
            Logger.error('Error checking event reminders:', error);
        }
    });
    Logger.info('Event reminders scheduler initialized (Every 5 minutes)');

    // Schedule free subscription creation - 1st of every month at 00:00
    cron.schedule('0 0 1 * *', async () => {
        try {
            Logger.info('Starting free subscription creation...');
            const result = await platformSubscriptionService.createFreeSubscriptionsForAllUsers();
            Logger.info(`Free subscription creation completed. Success: ${result.success}, Failed: ${result.failed}`);
            if (result.errors.length > 0) {
                Logger.error('Errors during free subscription creation:', result.errors);
            }
        } catch (error) {
            Logger.error('Error creating free subscriptions:', error);
        }
    });
    Logger.info('Free subscription creation scheduler initialized (1st of every month at 00:00)');
};

