import { DataTypes, Model, Sequelize } from 'sequelize';
import User from './user.model';
import Event from './event.model';

export class ChatRoom extends Model {
    public id!: string;
    public user_ids!: string[];
    public is_personal!: boolean;
    public name!: string
    public event_id!: string;
    public event_image!: string;
    public profile_image!: string;
    public is_broadcast!: boolean;
    public broadcast_owner!: string;
    public deleted_users!: string[];
    public delete_history_by!:string[];
    public is_deleted!: boolean;
    public created_by!: string;
    public updated_by!: string;
    public deleted_by!: string;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public users!: User[];
    public lastMessage!: string;
    public lastMessageTime!: Date;

    static initModel(connection: Sequelize) {
        ChatRoom.init({
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            user_ids: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: []
            },
            is_personal: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            event_id: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: null
            },
            event_image: {
                type: DataTypes.STRING(255),
                allowNull: true,
                defaultValue: ''
            },
            profile_image: {
                type: DataTypes.STRING(255),
                allowNull: true,
                defaultValue: ''
            },
            is_broadcast: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            broadcast_owner: {
                type: DataTypes.UUID,
                allowNull: true
            },
            deleted_users: {
                type: DataTypes.JSON,
                defaultValue: [],
            },
            delete_history_by: {
                type: DataTypes.JSON,
                defaultValue: [],
            },
            is_deleted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            deleted_at: {
                type: DataTypes.DATE,
                allowNull: true,
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
        }, {
            tableName: 'chat_rooms',
            sequelize: connection,
            freezeTableName: true,
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        });
    }

    static initAssociations() {
        ChatRoom.belongsTo(User, { as: 'created_by_user', foreignKey: 'created_by' });
        ChatRoom.belongsTo(Event, { as: 'event', foreignKey: 'event_id' });
    }

    static initHooks(): void {
    }
}

export default ChatRoom;
