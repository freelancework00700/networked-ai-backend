import * as admin from 'firebase-admin';
import loggerService from './logger.service';
import serviceAccount from '../config/firebase-adminsdk.json';

// Initialize Firebase Admin SDK
let firebaseAdminInitialized = false;

/**
 * Initialize Firebase Admin SDK with service account credentials
 */
export const initializeFirebaseAdmin = (): void => {
    if (firebaseAdminInitialized) {
        return;
    }   

    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });

        firebaseAdminInitialized = true;
        loggerService.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
        loggerService.error(`Error initializing Firebase Admin SDK: ${error}`);
        throw error;
    }
};

/**
 * Verify Firebase ID token
 * @param idToken - Firebase ID token to verify
 * @returns Decoded token with user information
 * @throws Error if token is invalid
 */
export const verifyFirebaseToken = async (idToken: string): Promise<admin.auth.DecodedIdToken> => {
    if (!firebaseAdminInitialized) {
        initializeFirebaseAdmin();
    }

    try {
        return await admin.auth().verifyIdToken(idToken);
    } catch (error: any) {
        loggerService.error(`Firebase token verification failed: ${error.message}`);
        
        // Handle specific Firebase errors
        if (error.code === 'auth/id-token-expired') {
            throw new Error('Firebase token has expired');
        } else if (error.code === 'auth/id-token-revoked') {
            throw new Error('Firebase token has been revoked');
        } else if (error.code === 'auth/argument-error') {
            throw new Error('Invalid Firebase token format');
        } else {
            throw new Error('Invalid Firebase token');
        }
    }
};

/**
 * Get user information from Firebase token
 * @param idToken - Firebase ID token
 * @returns User information from Firebase
 */
export const getFirebaseUser = async (idToken: string): Promise<admin.auth.DecodedIdToken> => {
    return await verifyFirebaseToken(idToken);
};

/**
 * Send push notification to a user via FCM
 * @param fcmTokens - Array of FCM tokens or comma-separated string
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data payload (optional)
 * @returns Promise with send result
 */
export const sendPushNotification = async (
    fcmTokens: string | string[],
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<admin.messaging.BatchResponse> => {
    if (!firebaseAdminInitialized) {
        initializeFirebaseAdmin();
    }

    try {
        // Convert comma-separated string to array if needed
        const tokens = typeof fcmTokens === 'string' 
            ? fcmTokens.split(',').map(t => t.trim()).filter(t => t.length > 0)
            : fcmTokens;

        if (tokens.length === 0) {
            loggerService.warn('No FCM tokens provided for push notification');
            throw new Error('No FCM tokens provided');
        }

        const message: admin.messaging.MulticastMessage = {
            tokens,
            data: data || {},
            notification: { title, body},
            android: {
                notification: {
                    sound: "default", // Add sound for Android devices
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default", // Add sound for iOS devices
                        badge: 1, // Add badge number here
                    },
                },
            },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        
        loggerService.info(
            `Push notification sent. Success: ${response.successCount}, Failure: ${response.failureCount}`
        );

        // Log failures if any
        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                    loggerService.error(`Failed to send to token ${tokens[idx]}: ${resp.error?.message}`);
                }
            });
        }

        return response;
    } catch (error: any) {
        loggerService.error(`Error sending push notification: ${error.message}`);
        throw error;
    }
};
