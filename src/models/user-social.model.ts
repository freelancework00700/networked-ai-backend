import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';

export class UserSocial extends Model {
    public id!: string;
    public user_id!: string;
    public website!: string | null;
    public twitter!: string | null;
    public linkedin!: string | null;
    public facebook!: string | null;
    public snapchat!: string | null;
    public instagram!: string | null;
    public created_by!: string | null;
    public updated_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;

    static initModel(connection: Sequelize): void {
        UserSocial.init(
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
                website: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                twitter: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                linkedin: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                facebook: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                snapchat: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                instagram: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
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
                tableName: 'user_socials',
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
        UserSocial.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

        UserSocial.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        UserSocial.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
    }

    static initHooks(): void {
        
    }
}

export default UserSocial;
