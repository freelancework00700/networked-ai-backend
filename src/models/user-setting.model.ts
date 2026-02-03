import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';

export class UserSetting extends Model {
    public id!: string;
    public user_id!: string;
    public hide_email!: boolean;
    public hide_mobile!: boolean;
    public hide_location!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;

    static initModel(connection: Sequelize): void {
        UserSetting.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                user_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                hide_email: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                hide_mobile: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                hide_location: {
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
                }
            },
            {
                tableName: 'user_settings',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                defaultScope: {
                    attributes: { exclude: ['user_id', 'created_by', 'updated_by', 'created_at', 'updated_at'] },
                },
            }
        );
    }

    static initAssociations(): void {
        UserSetting.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

        UserSetting.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        UserSetting.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
    }

    static initHooks(): void {
        
    }
}

export default UserSetting;
