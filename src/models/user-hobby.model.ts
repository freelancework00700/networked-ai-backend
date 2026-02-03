import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';
import Hobby from './hobby.model';

export class UserHobby extends Model {
    public id!: string;
    public user_id!: string;
    public hobby_id!: string;

    static initModel(connection: Sequelize): void {
        UserHobby.init(
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
                hobby_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
            },
            {
                tableName: 'user_hobbies',
                sequelize: connection,
                freezeTableName: true,
                timestamps: false,
            }
        );
    }

    static initAssociations(): void {
        UserHobby.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
        UserHobby.belongsTo(Hobby, { foreignKey: 'hobby_id', as: 'hobby' });
    }

    static initHooks(): void {
        
    }
}

export default UserHobby;
