import { DataTypes, Model, Sequelize } from 'sequelize';
import Event from './event.model';
import Feed from './feed.model';

export class FeedEvents extends Model {
    public id!: string;
    public feed_id!: string;
    public event_id!: string;

    static initModel(connection: Sequelize): void {
        FeedEvents.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                feed_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                event_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
            },
            {
                tableName: 'feed_events',
                sequelize: connection,
                freezeTableName: true,
                timestamps: false,
            }
        );
    }

    static initAssociations(): void {
        FeedEvents.belongsTo(Feed, { foreignKey: 'feed_id', as: 'feed' });
        FeedEvents.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
    }

    static initHooks(): void {
        
    }
}

export default FeedEvents;
