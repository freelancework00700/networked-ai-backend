import { DataTypes, Model, Sequelize } from 'sequelize';
import Vibe from './vibe.model';
import Event from './event.model';

export class EventVibe extends Model {
    public id!: string;
    public event_id!: string;
    public vibe_id!: string;

    static initModel(connection: Sequelize): void {
        EventVibe.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                event_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                vibe_id: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
            },
            {
                tableName: 'event_vibes',
                sequelize: connection,
                freezeTableName: true,
                timestamps: false,
            }
        );
    }

    static initAssociations(): void {
        EventVibe.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
        EventVibe.belongsTo(Vibe, { foreignKey: 'vibe_id', as: 'vibe' });
    }

    static initHooks(): void {
        
    }
}

export default EventVibe;
