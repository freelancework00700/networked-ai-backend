import { Dialect } from 'sequelize';
import env from '../utils/validate-env';

interface dbConfig {
    [key: string]: {
        username: string;
        password: string;
        database: string;
        host: string;
        port:number;
        dialect: Dialect;
        logging: boolean;
    };
}

export const config: dbConfig = {
    development: {
        username: env.MYSQL_USER,
        password: env.MYSQL_PASSWORD,
        database: `${env.DB_NAME}_dev`,
        host: env.MYSQL_HOST,
        port: env.MYSQL_PORT,
        dialect: 'mysql',
        logging: true
    },
    staging: {
        username: env.MYSQL_USER,
        password: env.MYSQL_PASSWORD,
        database: `${env.DB_NAME}_staging`,
        host: env.MYSQL_HOST,
        port: env.MYSQL_PORT,
        dialect: 'mysql',
        logging: false
    },
    production: {
        username: env.MYSQL_USER,
        password: env.MYSQL_PASSWORD,
        database: env.DB_NAME,
        host: env.MYSQL_HOST,
        port: env.MYSQL_PORT,
        dialect: 'mysql',
        logging: false
    }
};