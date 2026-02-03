import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';
import Interest from './interest.model';

export class UserInterest extends Model {
    public id!: string;
    public user_id!: string;
    public interest_id!: string;

    static initModel(connection: Sequelize): void {
        UserInterest.init(
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
                interest_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
            },
            {
                tableName: 'user_interests',
                sequelize: connection,
                freezeTableName: true,
                timestamps: false,
            }
        );
    }

    static initAssociations(): void {
        UserInterest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        UserInterest.belongsTo(Interest, { foreignKey: 'interest_id', as: 'interest' });
    }

    static initHooks(): void {
        
    }
}

export default UserInterest;
