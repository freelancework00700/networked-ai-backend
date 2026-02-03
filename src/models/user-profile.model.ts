import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';
import Media from './media.model';

export class UserProfile extends Model {
    public id!: string;
    public user_id!: string;
    public media_id!: string;
  
    static initModel(connection: Sequelize): void {
        UserProfile.init(
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
                media_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                }
            },
            {
                tableName: 'user_profiles',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        UserProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        UserProfile.belongsTo(Media, { foreignKey: 'media_id', as: 'media' });
    }

    static initHooks(): void {
        
    }
}

export default UserProfile;

