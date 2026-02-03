import User from './user.model';
import { sendSms } from '../utils/twilio.service';
import loggerService from '../utils/logger.service';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class Sms extends Model {
    public id!: string;
    public user_id!: string | null;
    public to!: string[];
    public type!: string;
    public message!: string;
    public from!: string;
    public is_deleted!: boolean;
    
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;

    static initModel(connection: Sequelize): void {
        Sms.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                to: {
                    type: DataTypes.JSON,
                    allowNull: false,
                    defaultValue: [],
                },
                type: {
                    type: DataTypes.STRING(100),
                    allowNull: false,
                },
                message: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                },
                from: {
                    type: DataTypes.STRING(500),
                    allowNull: false,
                },
                is_deleted: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                created_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                updated_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                deleted_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                deleted_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                tableName: 'sms',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        Sms.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        Sms.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        Sms.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        Sms.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });
    }

    static initHooks(): void {
        // Send SMS after creation
        Sms.afterCreate(async (sms: Sms) => {
            try {
                const recipients = sms.to || [];
                
                if (recipients.length > 0) {
                    const sendPromises = recipients.map(async (recipient) => {
                        try {
                            // Format phone number to E.164 format (ensure it starts with +)
                            const formattedPhoneNumber = String(recipient)
                                .replace(/\s+/g, '')
                                .replace(/-/g, '')
                                .startsWith('+') ? String(recipient) : `+${String(recipient)}`;

                            await sendSms(formattedPhoneNumber, sms.message);
                            loggerService.info(`SMS sent to ${formattedPhoneNumber}. SMS ID: ${sms.id}`);
                            return { success: true, to: formattedPhoneNumber };
                        } catch (error: any) {
                            loggerService.error(`Error sending SMS to ${recipient}: ${error.message || error}`);
                            return { success: false, to: recipient, error: error.message || 'Unknown error' };
                        }
                    });

                    await Promise.all(sendPromises);
                    loggerService.info(`Bulk SMS sending completed. SMS ID: ${sms.id}, Type: ${sms.type}`);
                } else {
                    loggerService.warn(`No recipients specified. SMS ID: ${sms.id}`);
                }
            } catch (smsError: any) {
                loggerService.error(`Error sending SMS in hook (record created): ${smsError.message || smsError}`);
            }
        });
    }
}

export default Sms;
