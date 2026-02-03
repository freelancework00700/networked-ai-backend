import * as fs from 'fs';
import axios from 'axios';
import * as path from 'path';
import env from '../utils/validate-env';
import { Event, User } from '../models';
import * as Passkit from 'passkit-generator';
import loggerService from '../utils/logger.service';

// Helper to ensure directory exists
const ensureDirectory = (dirPath: string): void => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const PKPass = Passkit.PKPass;

// Helper to resolve asset paths (works in both dev and production)
const resolveAssetPath = (relativePath: string): string => {
    // Get project root (works in both dev and production)
    // In dev: __dirname = src/services, so ../../ = project root
    // In production: __dirname = dist/services, so ../../ = project root
    const projectRoot = path.resolve(__dirname, '../..');
    
    // Try dist path first (for production builds where assets are copied)
    const distPath = path.join(projectRoot, 'dist', relativePath);
    if (fs.existsSync(distPath)) {
        return distPath;
    }
    
    // Fall back to src path (for dev mode or if assets aren't copied to dist)
    const srcPath = path.join(projectRoot, 'src', relativePath);
    return srcPath;
};

// Paths to certificates and pass model
const CERT_DIR = resolveAssetPath('assets/apple-pass/Certs');
const PASS_MODEL_DIR = resolveAssetPath('assets/apple-pass/Event.pass');
const PASS_MODEL_ICONS_DIR = resolveAssetPath('assets/apple-pass/passModel.pass');

/**
 * Generate Apple Wallet Pass URL for an event attendee
 * This generates the pass directly in Node.js without Firebase dependency
 * 
 * @param event - Event data
 * @param attendeeId - Attendee ID (used for QR code message)
 * @param userId - User ID who is attending
 * @returns Apple Wallet Pass URL or null if generation fails
 */
const generateAppleWalletPassUrl = async (event: Event, attendeeId: string): Promise<string | null> => {
    try {
        // Validate certificates and model exist
        const wwdrPath = path.join(CERT_DIR, 'WWDR.pem');
        const signerCertPath = path.join(CERT_DIR, 'signerCert.pem');
        const signerKeyPath = path.join(CERT_DIR, 'signerKey.pem');
        const passModelPath = path.join(PASS_MODEL_DIR, 'pass.json');

        // Log paths for debugging
        loggerService.info(`Apple Pass - CERT_DIR: ${CERT_DIR}`);
        loggerService.info(`Apple Pass - PASS_MODEL_DIR: ${PASS_MODEL_DIR}`);
        loggerService.info(`Apple Pass - __dirname: ${__dirname}`);

        if (!fs.existsSync(wwdrPath) || !fs.existsSync(signerCertPath) || !fs.existsSync(signerKeyPath)) {
            loggerService.error(`Apple Pass certificates not found. Checked directory: ${CERT_DIR}`);
            loggerService.error(`WWDR.pem exists: ${fs.existsSync(wwdrPath)} at ${wwdrPath}`);
            loggerService.error(`signerCert.pem exists: ${fs.existsSync(signerCertPath)} at ${signerCertPath}`);
            loggerService.error(`signerKey.pem exists: ${fs.existsSync(signerKeyPath)} at ${signerKeyPath}`);
            
            // List what files are actually in the directory
            if (fs.existsSync(CERT_DIR)) {
                const files = fs.readdirSync(CERT_DIR);
                loggerService.error(`Files found in ${CERT_DIR}: ${files.join(', ')}`);
            } else {
                loggerService.error(`Certificate directory does not exist: ${CERT_DIR}`);
            }
            return null;
        }

        if (!fs.existsSync(passModelPath)) {
            loggerService.error(`Apple Pass model not found. Checked: ${PASS_MODEL_DIR}`);
            loggerService.error(`pass.json path: ${passModelPath}`);
            if (fs.existsSync(PASS_MODEL_DIR)) {
                const files = fs.readdirSync(PASS_MODEL_DIR);
                loggerService.error(`Files found in ${PASS_MODEL_DIR}: ${files.join(', ')}`);
            }
            return null;
        }

        // Get event host information
        const host = await Event.findOne({
            where: { id: event.id, is_deleted: false },
            include: [{
                model: User,
                as: 'created_by_user',
                attributes: ['id', 'name', 'username'],
                required: false,
            }],
        });

        const hostName = (host as any)?.created_by_user?.name || 'Networked AI';

        // Create Pass object
        const pass = await PKPass.from({
            model: PASS_MODEL_DIR,
            certificates: {
                wwdr: fs.readFileSync(wwdrPath),
                signerCert: fs.readFileSync(signerCertPath),
                signerKey: fs.readFileSync(signerKeyPath),
                signerKeyPassphrase: 'Ni-#kaleka@25',
            },
        }, {
            serialNumber: `NAI-${attendeeId}`,
            organizationName: 'Networked AI',
            description: 'Networked AI Event Pass',
            logoText: 'Networked AI',
            foregroundColor: 'rgb(255,255,255)',
            backgroundColor: 'rgb(0,0,0)',
        });

        // Format event date
        const eventStartDate = new Date(event.start_date);

        // Add header field - event date
        pass.headerFields.push({
            key: 'eventDate',
            label: eventStartDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: eventStartDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        });

        // Add primary field - event name
        pass.primaryFields.push({
            key: 'eventName',
            label: 'EVENT TITLE',
            value: event.title,
        });

        // Add secondary field - host name
        pass.secondaryFields.push({
            key: 'hostname',
            label: 'HOSTED BY',
            value: hostName,
        });

        // Add auxiliary field - location
        if (event.address) {
            pass.auxiliaryFields.push({
                key: 'location',
                label: 'LOCATION',
                value: event.address,
            });
        }

        // Add QR code barcode with attendee ID
        pass.setBarcodes({
            message: attendeeId,
            format: 'PKBarcodeFormatQR',
        });

        // Set relevant date for automatic reminder 3 hours before the event
        const threeHoursBefore = new Date(eventStartDate.getTime() - (3 * 60 * 60 * 1000));
        pass.setRelevantDate(threeHoursBefore);

        // Download and add event thumbnail
        const eventImageUrl = event.image_url || event.thumbnail_url;
        if (eventImageUrl) {
            try {
                const imageResponse = await axios.get(eventImageUrl, { responseType: 'arraybuffer' });
                const thumbnailBuffer = Buffer.from(imageResponse.data, 'binary');
                pass.addBuffer('thumbnail.png', thumbnailBuffer);
            } catch (error: any) {
                loggerService.warn(`Failed to download event image for Apple Pass: ${error.message}`);
            }
        }

        // Add icon files if they exist (check both Event.pass and passModel.pass locations)
        const iconSizes = ['29', '40', '60', '76', '83.5', '1024'];
        
        for (const size of iconSizes) {
            // Try passModel.pass directory first (where icon_XX.png files are)
            let iconPath = path.join(PASS_MODEL_ICONS_DIR, `icon_${size}.png`);
            
            // If not found, try Event.pass directory
            if (!fs.existsSync(iconPath)) {
                iconPath = path.join(PASS_MODEL_DIR, `icon_${size}.png`);
            }
            
            if (fs.existsSync(iconPath)) {
                try {
                    const iconBuffer = fs.readFileSync(iconPath);
                    pass.addBuffer(`icon_${size}.png`, iconBuffer);
                } catch (error: any) {
                    loggerService.warn(`Failed to add icon ${size}: ${error.message}`);
                }
            } else {
                loggerService.warn(`Icon ${size} not found at ${iconPath}`);
            }
        }

        // Generate pass buffer
        const passBuffer = pass.getAsBuffer();

        // Ensure upload directory exists
        const applePassDir = path.resolve(__dirname, '../../uploads/apple-passes');
        ensureDirectory(applePassDir);

        // Save pass to local storage
        const passFileName = `${event.id}_${attendeeId}.pkpass`;
        const passFilePath = path.join(applePassDir, passFileName);
        fs.writeFileSync(passFilePath, passBuffer);

        // Generate public URL
        const passUrl = `${env.API_URL}/media/apple-passes/${passFileName}`;
        
        loggerService.info(`Apple Wallet Pass generated successfully: ${passUrl}`);
        return passUrl;
    } catch (error: any) {
        loggerService.error(`Error generating Apple Wallet Pass: ${error.message}`);
        loggerService.error(`Stack trace: ${error.stack}`);
        return null;
    }
};

/**
 * Generate Apple Wallet Pass URL using event ID (fetches event data)
 */
export const generateAppleWalletPassUrlDirect = async (eventId: string, attendeeId: string): Promise<string | null> => {
    try {
        // Fetch event data
        const event = await Event.findOne({
            where: { id: eventId, is_deleted: false },
            attributes: ['id', 'title', 'description', 'address', 'start_date', 'end_date', 'image_url', 'thumbnail_url'],
        });

        if (!event) {
            loggerService.error(`Event with id ${eventId} not found for Apple Pass generation`);
            return null;
        }

        return await generateAppleWalletPassUrl(event, attendeeId);
    } catch (error: any) {
        loggerService.error(`Error in generateAppleWalletPassUrlDirect: ${error.message}`);
        return null;
    }
};
