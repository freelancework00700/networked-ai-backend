import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { errorMiddleware } from './middlewares/error.middleware';
import env from './utils/validate-env';
import routes from './routes/index.routes';
import { handleOwnAccountWebhook, handleConnectedAccountWebhook } from './controllers/stripe.controller';

export class App {
    public express: Express = express();
    
    constructor() {
        // Trust proxy for HTTPS behind reverse proxy (nginx, load balancer, etc.)
        // This prevents infinite redirect loops and ensures correct protocol detection
        this.express.set('trust proxy', true);
        
        // Middlewares
        // Use 'combined' format instead of 'dev' to avoid logging request bodies
        // 'dev' format can log full request bodies which causes memory issues
        this.express.use(morgan('combined'));
        
        // Stripe webhook routes - must be before express.json() to receive raw body
        // Own account webhook (products, prices)
        this.express.post('/api/stripe/webhook/main-account', express.raw({ type: 'application/json', limit: '1mb' }), handleOwnAccountWebhook);
        
        // Connected account webhook (account status changes)
        this.express.post('/api/stripe/webhook/connected-account', express.raw({ type: 'application/json', limit: '1mb' }), handleConnectedAccountWebhook);
        
        // Reduce body size limit from 200mb to 10mb to prevent memory exhaustion
        // Large payloads should use file upload endpoints instead
        this.express.use(express.json({ limit: '10mb' }));
        this.express.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
            allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'access-token']
        }));

        // Configure EJS as view engine
        // this.express.set('view engine', 'ejs');
        // this.express.set('views', path.join(__dirname, 'views'));

        // Static file serving for uploaded files
        this.express.use('/media', express.static(path.resolve(__dirname, '../uploads')));
        // Static file serving for Apple Passes
        this.express.use('/media/apple-passes', express.static(path.resolve(__dirname, '../uploads/apple-passes')));

        // Routes
        this.express.use('/api', routes);

        // Route to check if server is working or not
        this.express.get('/', (req: Request, res: Response) => {
            res.send('Server Works! 🚀🚀 ');
        });

        this.express.get('/health', (req: Request, res: Response) => {
            res.status(200).json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: env.NODE_ENV
            });
        });

        this.express.use(errorMiddleware);

        // If no route is matched
        this.express.use((req: Request, res: Response) => {
            res.status(404).send('Endpoint not found!');
        });
    }
}