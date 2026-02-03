import { Sequelize } from 'sequelize';
import Interest from '../models/interest.model';
import Logger from '../utils/logger.service';
import { DEFAULT_INTERESTS } from './constants';

export const seedInterests = async (connection: Sequelize) => {
    const transaction = await connection.transaction();
    try {
        const interestsToSeed = await Promise.all(
            DEFAULT_INTERESTS.map(async (interest) => {
                return {
                    id: interest.id,
                    name: interest.name,
                    icon: interest.icon
                };
            })
        );
        await Interest.bulkCreate(interestsToSeed, {
            transaction,
            updateOnDuplicate: ['name', 'icon', 'updated_at']
        });

        Logger.info(`Bulk processed ${DEFAULT_INTERESTS.length} interests successfully.`);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        Logger.error("Error seeding interests: ", error);
        throw error;
    }
}
