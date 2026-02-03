import { Sequelize } from 'sequelize';
import Hobby from '../models/hobby.model';
import Logger from '../utils/logger.service';
import { DEFAULT_HOBBIES } from './constants';

export const seedHobbies = async (connection: Sequelize) => {
    const transaction = await connection.transaction();
    try {
        const hobbiesToSeed = await Promise.all(
            DEFAULT_HOBBIES.map(async (hobby) => {
                return {
                    id: hobby.id,
                    name: hobby.name,
                    icon: hobby.icon
                };
            })
        );
        await Hobby.bulkCreate(hobbiesToSeed, {
            transaction,
            updateOnDuplicate: ['name', 'icon', 'updated_at']
        });

        Logger.info(`Bulk processed ${DEFAULT_HOBBIES.length} hobbies successfully.`);
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        Logger.error("Error seeding hobbies: ", error);
        throw error;
    }
}
