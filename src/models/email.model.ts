import User from './user.model';
import { EmailType } from '../types/enums';
import { sendEmail } from '../utils/smtp.service';
import loggerService from '../utils/logger.service';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class Email extends Model {
    public id!: string;
    public bcc!: string[];
    public type!: EmailType;
    public subject!: string;
    public html!: string;
    public from!: string;
    public attachments!: any[] | null;
    
    public created_by!: string | null;
    public updated_by!: string | null;
    
    public created_at!: Date;
    public updated_at!: Date;

    static initModel(connection: Sequelize): void {
        Email.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                bcc: {
                    type: DataTypes.JSON,
                    allowNull: false,
                    defaultValue: [],
                },
                type: {
                    type: DataTypes.ENUM(...Object.values(EmailType)),
                    allowNull: false,
                },
                subject: {
                    type: DataTypes.STRING(500),
                    allowNull: false,
                },
                html: {
                    type: DataTypes.TEXT('long'),
                    allowNull: false,
                },
                from: {
                    type: DataTypes.STRING(500),
                    allowNull: false,
                },
                attachments: {
                    type: DataTypes.JSON,
                    allowNull: true,
                    defaultValue: null,
                },
                created_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                updated_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
            },
            {
                tableName: 'email',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        Email.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        Email.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
    }

    static initHooks(): void {
        // Send email after creation with rate limiting (14 emails per second)
        Email.afterCreate(async (email: Email) => {
            try {
                const bcc = email.bcc || [];
                
                if (bcc.length > 0) {
                    // Batch BCC emails into groups of 14
                    const batchSize = 14;
                    for (let i = 0; i < bcc.length; i += batchSize) {
                        const emailBatch = bcc.slice(i, i + batchSize);

                        const mailOptions: any = {
                            bcc: emailBatch,
                            html: email.html,
                            from: email.from,
                            subject: email.subject,
                        };

                        // Add attachments if they exist
                        if (email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0) {
                            mailOptions.attachments = email.attachments.map((att: any) => {
                                // If attachment has base64 content, convert it back to buffer
                                if (att.content && att.encoding === 'base64') {
                                    return {
                                        ...att,
                                        content: Buffer.from(att.content, 'base64'),
                                    };
                                }
                                return att;
                            });
                        }

                        const res = await sendEmail(mailOptions);
                        loggerService.info(`Email batch sent. Email ID: ${email.id}, Batch: ${Math.floor(i / batchSize) + 1}, Recipients: ${emailBatch.length}`);
                        loggerService.info(`res: ${res.toString()}`);
                        loggerService.info(`res: ${JSON.stringify(res)}`);

                        // Wait 1 second before sending next batch (except for the last batch)
                        if (i + batchSize < bcc.length) {
                            await new Promise((resolve) => setTimeout(resolve, 1000));
                        }
                    }

                    loggerService.info(`All emails sent successfully. Email ID: ${email.id}, Type: ${email.type}`);
                } else {
                    loggerService.warn(`No recipients specified. Email ID: ${email.id}`);
                }
            } catch (emailError: any) {
                loggerService.error(`Error sending email in hook (record created): ${emailError.message}`);
            }
        });
    }
}

export default Email;
