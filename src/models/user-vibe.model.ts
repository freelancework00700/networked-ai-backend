import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';
import Vibe from './vibe.model';

export class UserVibe extends Model {
    public id!: string;
    public user_id!: string;
    public vibe_id!: string;

    static initModel(connection: Sequelize): void {
        UserVibe.init(
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
                vibe_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
            },
            {
                tableName: 'user_vibes',
                sequelize: connection,
                freezeTableName: true,
                timestamps: false,
            }
        );
    }

    static initAssociations(): void {
        UserVibe.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        UserVibe.belongsTo(Vibe, { foreignKey: 'vibe_id', as: 'vibe' });
    }

    static initHooks(): void {

    }
}

export default UserVibe;
