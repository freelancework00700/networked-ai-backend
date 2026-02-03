import { Sequelize } from 'sequelize';
import GamificationDiamond from '../models/gamification-diamond.model';
import Logger from '../utils/logger.service';
import { DEFAULT_GAMIFICATION_DIAMONDS } from './constants';

export const seedGamificationDiamonds = async (connection: Sequelize) => {
    const transaction = await connection.transaction();
    try {
        const gamificationDiamondsToSeed = await Promise.all(
            DEFAULT_GAMIFICATION_DIAMONDS.map(async (diamond) => {
                return {
                    id: diamond.id,
                    color: diamond.color,
                    points: parseInt(diamond.points as string),
                    description: diamond.description,
                    priority: diamond.priority,
                    icon_url: diamond.icon_url
                };
            })
        );
        await GamificationDiamond.bulkCreate(gamificationDiamondsToSeed, {
            transaction,
            updateOnDuplicate: ['color', 'points', 'description', 'priority', 'icon_url', 'updated_at']
        });

        Logger.info(`Bulk processed ${DEFAULT_GAMIFICATION_DIAMONDS.length} gamification diamonds successfully.`);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        Logger.error("Error seeding gamification diamonds: ", error);
        throw error;
    }
}

