import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { MediaContext } from '../types/enums';

// Base directory where all uploaded documents will be stored
const BASE_UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure that a given directory exists (create if needed)
const ensureDir = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

// Define the storage engine
const storage = multer.diskStorage({
    // Destination depends on the `context` field in the request body
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        // Read folder name from req.body.context
        const rawType = (req.body && (req.body.context as MediaContext)) || MediaContext.OTHER;

        // Sanitize the folder name a bit (avoid path traversal, spaces, etc.)
        const safeFolder = rawType.toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_') || MediaContext.OTHER;

        // Ensure base and target directories exist
        ensureDir(BASE_UPLOAD_DIR);
        const targetDir = ensureDir(path.join(BASE_UPLOAD_DIR, safeFolder));

        cb(null, targetDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const ext = file.originalname.split('.').pop();
        cb(null, `${uuidv4()}.${ext}`);
    }
});

// Multer upload configuration
export const upload = multer({ storage });