import { Sequelize } from 'sequelize';
import GamificationCategory from '../models/gamification-category.model';
import Logger from '../utils/logger.service';
import { DEFAULT_GAMIFICATION_CATEGORIES } from './constants';

export const seedGamificationCategories = async (connection: Sequelize) => {
    const transaction = await connection.transaction();
    try {
        const gamificationCategoriesToSeed = await Promise.all(
            DEFAULT_GAMIFICATION_CATEGORIES.map(async (gamificationCategory) => {
                return {
                    id: gamificationCategory.id,
                    category_name: gamificationCategory.name,
                    earned_point: gamificationCategory.earned_points
                };
            })
        );
        await GamificationCategory.bulkCreate(gamificationCategoriesToSeed, {
            transaction,
            updateOnDuplicate: ['category_name', 'earned_point', 'updated_at']
        });

        Logger.info(`Bulk processed ${DEFAULT_GAMIFICATION_CATEGORIES.length} gamification categories successfully.`);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        Logger.error("Error seeding gamification categories: ", error);
        throw error;
    }
}
