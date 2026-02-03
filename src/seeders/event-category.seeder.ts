import { Sequelize } from 'sequelize';
import EventCategory from '../models/event-category.model';
import Logger from '../utils/logger.service';
import { DEFAULT_EVENT_CATEGORIES } from './constants';

export const seedEventCategories = async (connection: Sequelize) => {
    const transaction = await connection.transaction();
    try {
        const eventCategoriesToSeed = await Promise.all(
            DEFAULT_EVENT_CATEGORIES.map(async (eventCategory) => {
                return {
                    id: eventCategory.id,
                    name: eventCategory.name,
                    icon: eventCategory.icon
                };
            })
        );
        await EventCategory.bulkCreate(eventCategoriesToSeed, {
            transaction,
            updateOnDuplicate: ['name', 'icon', 'updated_at']
        });

        Logger.info(`Bulk processed ${DEFAULT_EVENT_CATEGORIES.length} event categories successfully.`);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        Logger.error("Error seeding event categories: ", error);
        throw error;
    }
}
