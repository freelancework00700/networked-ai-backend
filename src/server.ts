import 'dotenv/config';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { App } from './app';
import { initializeDatabase } from './config/database';
import { initMySQLModels } from './models';
import { Sequelize } from 'sequelize';
import Logger from './utils/logger.service';
import env from './utils/validate-env';
import { initializeFirebaseAdmin } from './utils/firebase.service';
import { runAllSeeders } from './seeders';
import { initSchedulers } from './schedulers';
import { connectRabbitMQ } from './rabbitmq';
import { initSocketServer } from './socket';

const app = new App();
const port = env.PORT;

// Create HTTP server
const httpServer = createServer(app.express);

export let io: IOServer;

export let sequelize: Sequelize;

try {
    (async () => {
        // Initialize Firebase Admin SDK
        initializeFirebaseAdmin();

        // Initialize database connection
        sequelize = await initializeDatabase();

        // Initialize models, associations, and hooks
        initMySQLModels(sequelize);
        Logger.info('Models, associations, and hooks initialized successfully.');
        
        // alter: false prevents automatic table modifications
        // This avoids issues with MySQL's 64 key limit and table structure conflicts
        // Use migrations for schema changes in production
        await sequelize.sync({ alter: false });
        Logger.info('Database and models synchronized successfully.');

        // Seed default data
        if (env.SEED) {
            await runAllSeeders(sequelize);
            Logger.info('Database seeders completed successfully.');
        } else {
            Logger.info('Database seeders skipped.');
        }

        // Initialize schedulers
        initSchedulers();

        // // Initialize RabbitMQ connection
        // try {
        //     await connectRabbitMQ();
        // } catch (error) {
        //     Logger.warn('RabbitMQ connection failed. Continuing without RabbitMQ...');
        // }

        // Start the server
        httpServer.listen(port, async () => {
            Logger.info(`Server is running on port ${port}... 🚀🚀`);
        });

        // Initialize socket server
        io = initSocketServer(httpServer);
        Logger.info('Socket server initialized successfully.');
    })();
}catch(err) {
    Logger.error('Error: ', err);
    Logger.error('Unable to connect to the database.');
}