import { ServiceSettings } from '../models';
import loggerService from '../utils/logger.service';

// Get service settings (creates default record if none exists)
export const getServiceSettings = async (): Promise<ServiceSettings> => {
    try {
        let settings = await ServiceSettings.findOne();
        
        if (!settings) {
            // Create default settings if none exist
            settings = await ServiceSettings.create({
                sms_enabled: true,
                email_enabled: true,
            });
            loggerService.info('Created default service settings');
        }
        
        return settings;
    } catch (error: any) {
        loggerService.error(`Error getting service settings: ${error.message}`);
        throw error;
    }
};

// Check if SMS service is enabled
export const isSmsEnabled = async (): Promise<boolean> => {
    try {
        const settings = await getServiceSettings();
        return settings.sms_enabled;
    } catch (error: any) {
        loggerService.error(`Error checking SMS enabled status: ${error.message}`);
        // Default to true if there's an error to avoid breaking existing functionality
        return true;
    }
};

// Check if Email service is enabled
export const isEmailEnabled = async (): Promise<boolean> => {
    try {
        const settings = await getServiceSettings();
        return settings.email_enabled;
    } catch (error: any) {
        loggerService.error(`Error checking Email enabled status: ${error.message}`);
        // Default to true if there's an error to avoid breaking existing functionality
        return true;
    }
};