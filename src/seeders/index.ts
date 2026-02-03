import { Sequelize } from 'sequelize';
import Logger from '../utils/logger.service';
import { seedEventCategories } from './event-category.seeder';
import { seedGamificationBadges } from './gamification-badge.seeder';
import { seedGamificationDiamonds } from './gamification-diamond.seeder';
import { seedGamificationCategories } from './gamification-category.seeder';
import { seedHobbies } from './hobby.seeder';
import { seedInterests } from './interest.seeder';
import { seedReportReasons } from './report-reason.seeder';
import { seedVibes } from './vibe.seeder';

/**
 * Run all seeders
 */
export const runAllSeeders = async (connection: Sequelize): Promise<void> => {
    try {
        Logger.info('Starting database seeders...');
        
        await seedVibes(connection);
        await seedHobbies(connection);
        await seedInterests(connection);
        await seedEventCategories(connection);
        await seedReportReasons(connection);
        await seedGamificationCategories(connection);
        await seedGamificationBadges(connection);
        await seedGamificationDiamonds(connection);

        Logger.info('All database seeders completed successfully.');
    } catch (error) {
        Logger.error(`Error running seeders: ${error}`);
        throw error;
    }
};

