import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import env from './validate-env';
import { MediaContext } from '../types/enums';
import { v4 as uuidv4 } from 'uuid';

const MAX_SIZE = env.THUMBNAIL_SIZE * 1024; // 5KB

/**
 * Create a thumbnail of the source image
 * @param sourcePath - The path to the source image
 * @returns The path to the thumbnail
 */
export const generateThumbnail = async (
    sourcePath: string,
    folder: MediaContext
): Promise<string | null> => {
    try {
        // uploads root: ../../uploads relative to this file
        const uploadsRoot = path.resolve(__dirname, '../../uploads');
        const targetDir = path.join(uploadsRoot, folder.toString());

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const fileName = `${uuidv4()}_thumb.webp`;
        const thumbPath = path.join(targetDir, fileName);

        let width = 200;
        let quality = 70;

        let buffer = await sharp(sourcePath)
            .resize(width, width, { fit: 'inside' })
            .webp({ quality })
            .toBuffer();

        while (buffer.length > MAX_SIZE && (width > 30 || quality > 15)) {
            width = Math.floor(width * 0.8);
            quality -= 5;

            buffer = await sharp(sourcePath)
                .resize(width, width, { fit: 'inside' })
                .webp({ quality })
                .toBuffer();
        }

        fs.writeFileSync(thumbPath, buffer);
        return thumbPath;
    } catch (e) {
        console.error('Thumbnail error:', e);
        return null;
    }
};
