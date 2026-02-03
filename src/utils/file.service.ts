import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import http from 'http';
import https from 'https';
import path, { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RemoveMediaResponse } from '../types/common-interfaces';
import { MediaContext } from '../types/enums';
import env from './validate-env';

// Use path.resolve for absolute path (works correctly in both dev and production builds)
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');


/** Ensure folder exists */
const ensureDir = (folder: MediaContext) => {
    const dir = join(UPLOAD_ROOT, folder);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return dir;
};

/** Download URL directly into the media folder */
const downloadToFolder = async (
    url: string,
    folder: MediaContext
): Promise<string | null> => {
    try {
        const urlObj = new URL(url);
        const ext = extname(urlObj.pathname) || '.jpg';
        const filePath = join(ensureDir(folder), `${uuidv4()}${ext}`);
        const lib = urlObj.protocol === 'https:' ? https : http;

        await new Promise<void>((resolve, reject) => {
            const stream = createWriteStream(filePath);
            lib.get(url, res => {
                if (res.statusCode && res.statusCode >= 400) {
                    stream.close();
                    return reject();
                }
                res.pipe(stream);
                stream.on('finish', resolve);
            }).on('error', reject);
        });

        return filePath;
    } catch (e) {
        console.error('Download failed:', e);
        return null;
    }
};

/** Remove file from uploads folder */
export const removeMediaFile = (mediaUrl: string): RemoveMediaResponse => {
    try {
        if (!mediaUrl) return {
            success: false,
            message: 'Media URL is required.'
        };

        // Extract filename from URL
        const filename = mediaUrl.split('/').pop();
        if (!filename) return {
            success: false,
            message: 'Unable to extract filename from media URL.'
        };

        // Get directory path based on URL segments
        const urlParts = mediaUrl.split('/');
        const folderName = urlParts[urlParts.length - 2]; // e.g. 'profiles'

        // Construct full file path using UPLOAD_ROOT for consistency
        const filePath = path.resolve(UPLOAD_ROOT, folderName, filename);

        // Remove file if exists
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }

        return {
            success: true,
            message: 'Media file removed successfully.'
        };
    } catch (error) {
        console.error('Error removing media file:', error as Error);
        return {
            success: false,
            message: (error as Error).message || 'Unable to remove media file.'
        };
    }
};

/** Resolve local path from URL */
export const resolveLocalPath = async (url: string, folder: MediaContext): Promise<{ local: string; cleanup?: () => void }> => {
    // already on our server
    if (url.startsWith(env.API_URL)) {
        const relative = url.replace(`${env.API_URL}/media/`, ''); // e.g. Event/uuid_thumb.webp or Profile/uuid.png
        // Use path.resolve for absolute path resolution (works in both dev and production builds)
        const localPath = path.resolve(UPLOAD_ROOT, relative);
        return { local: localPath };
    }

    // external URL: download to temp
    const downloaded = await downloadToFolder(url, folder);
    if (!downloaded) throw new Error('Failed to download image');
    return {
        local: downloaded,
        cleanup: () => existsSync(downloaded) && unlinkSync(downloaded),
    };
};

/** Get file meta from URL */
export const getFileMeta = (url: string) => {
    try {
        // const parsed = new URL(url);
        const filename = url.split('/').pop();
        const extension = filename?.split('?')[0].split('#')[0].split('.').pop();
        return {
            filename: filename?.split('?')[0].split('#')[0],
            extension: extension || ''
        };
    } catch (error) {
        console.error('Error getting file meta:', error as Error);
        return {
            filename: '',
            extension: ''
        };
    }
};