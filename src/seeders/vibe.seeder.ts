import { Sequelize } from 'sequelize';
import Vibe from '../models/vibe.model';
import Logger from '../utils/logger.service';
import { DEFAULT_VIBES } from './constants';

export const seedVibes = async (connection: Sequelize) => {
    const transaction = await connection.transaction();
    try {
        const vibesToSeed = await Promise.all(
            DEFAULT_VIBES.map(async (vibe) => {
                return {
                    id: vibe.id,
                    name: vibe.name,
                    icon: vibe.icon
                };
            })
        );

        await Vibe.bulkCreate(vibesToSeed, {
            transaction,
            updateOnDuplicate: ['name', 'icon', 'updated_at']
        });

        Logger.info(`Bulk processed ${DEFAULT_VIBES.length} vibes successfully.`);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        Logger.error("Error seeding vibes: ", error);
        throw error;
    }
}
