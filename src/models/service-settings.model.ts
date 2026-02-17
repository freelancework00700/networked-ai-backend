import { DataTypes, Model, Sequelize } from 'sequelize';

export class ServiceSettings extends Model {
    public id!: string;
    public sms_enabled!: boolean;
    public email_enabled!: boolean;
    
    public created_by!: string | null;
    public updated_by!: string | null;
    
    public created_at!: Date;
    public updated_at!: Date;

    static initModel(connection: Sequelize): void {
        ServiceSettings.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                sms_enabled: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true,
                },
                email_enabled: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true,
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
                tableName: 'service_settings',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        // No associations needed for this model
    }

    static initHooks(): void {
        // Ensure there's only one record
        ServiceSettings.beforeCreate(async (settings: ServiceSettings) => {
            const existingCount = await ServiceSettings.count();
            if (existingCount > 0) {
                throw new Error('Only one service settings record is allowed');
            }
        });
    }
}

export default ServiceSettings;
