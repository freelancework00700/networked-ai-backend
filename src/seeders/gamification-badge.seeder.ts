import { Sequelize } from 'sequelize';
import GamificationBadge from '../models/gamification-badge.model';
import Logger from '../utils/logger.service';
import { DEFAULT_GAMIFICATION_BADGES } from './constants';

export const seedGamificationBadges = async (connection: Sequelize) => {
    const transaction = await connection.transaction();
    try {
        const gamificationBadgesToSeed = await Promise.all(
            DEFAULT_GAMIFICATION_BADGES.map(async (badge) => {
                return {
                    id: badge.id,
                    event_count: parseInt(badge.event_count as string),
                    badge: badge.badge,
                    title: badge.title,
                    priority: badge.priority || null,
                    locked_url: badge.locked_url || null,
                    event_hosted_url: badge.event_hosted_url || null,
                    event_attended_url: badge.event_attended_url || null,
                    networks_url: badge.networks_url || null,
                    messages_url: badge.messages_url || null,
                    qr_url: badge.qr_url || null,
                };
            })
        );
        await GamificationBadge.bulkCreate(gamificationBadgesToSeed, {
            transaction,
            updateOnDuplicate: [
                'event_count',
                'badge',
                'title',
                'priority',
                'locked_url',
                'event_hosted_url',
                'event_attended_url',
                'networks_url',
                'messages_url',
                'qr_url',
                'updated_at'
            ]
        });

        Logger.info(`Bulk processed ${DEFAULT_GAMIFICATION_BADGES.length} gamification badges successfully.`);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        Logger.error("Error seeding gamification badges: ", error);
        throw error;
    }
}

