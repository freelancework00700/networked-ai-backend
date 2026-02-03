import { Sequelize } from 'sequelize';
import { config } from './config';
import env from '../utils/validate-env';
import Logger from '../utils/logger.service';

// Get database configuration
const environment: string = env.NODE_ENV;
const databaseConfiguration = config[environment];

// Create database configuration without database name (for creating database)
const dbConfigurationWithoutDatabase = {
    ...databaseConfiguration,
    database: undefined
};

// Create database configuration with database name (for normal operations)
const dbConfigurationWithDatabase = {
    ...databaseConfiguration
};

/**
 * Create a new Sequelize instance for database operations
 * @param includeDatabase - Whether to include the database name in the configuration
 * @returns Sequelize instance
 */
export const createSequelizeInstance = (includeDatabase: boolean = true): Sequelize => {
    const configuration = includeDatabase ? dbConfigurationWithDatabase : dbConfigurationWithoutDatabase;
    return new Sequelize({
        ...configuration,
        define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
        },
    });
};

/**
 * Initialize database connection and create database if it doesn't exist
 * @returns Promise<Sequelize> - Connected Sequelize instance
 */
export const initializeDatabase = async (): Promise<Sequelize> => {
    try {
        // Create instance without database name to create database
        const sequelizeWithoutDB = createSequelizeInstance(false);
        
        // Create database if it doesn't exist
        await sequelizeWithoutDB.query(`CREATE DATABASE IF NOT EXISTS \`${databaseConfiguration.database}\`;`);
        await sequelizeWithoutDB.close();
        
        // Create instance with database name
        const sequelize = createSequelizeInstance(true);
        
        // Test connection
        await sequelize.authenticate();
        Logger.info('Database connection has been established successfully.');
        
        return sequelize;
    } catch (error) {
        Logger.error('Unable to connect to the database:', error);
        throw error;
    }
};

/**
 * Get database configuration for reference
 */
export const getDatabaseConfig = () => ({
    host: databaseConfiguration.host,
    port: databaseConfiguration.port,
    username: databaseConfiguration.username,
    password: databaseConfiguration.password,
    database: databaseConfiguration.database,
    dialect: databaseConfiguration.dialect,
    logging: databaseConfiguration.logging
});

export { databaseConfiguration }; 