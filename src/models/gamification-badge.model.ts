import { DataTypes, Model, Sequelize } from 'sequelize';

export class GamificationBadge extends Model {
    public id!: string;
    public event_count!: number;
    public badge!: string | null;
    public title!: string | null;
    public priority!: number | null;
    public locked_url!: string | null;
    public event_hosted_url!: string | null;
    public event_attended_url!: string | null;
    public networks_url!: string | null;
    public messages_url!: string | null;
    public qr_url!: string | null;
    public is_deleted!: boolean;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;

    static initModel(connection: Sequelize): void {
        GamificationBadge.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                event_count: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                },
                badge: {
                    type: DataTypes.STRING(45),
                    allowNull: true,
                },
                title: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                },
                priority: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                locked_url: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                event_hosted_url: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                event_attended_url: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                networks_url: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                messages_url: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                qr_url: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                is_deleted: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                created_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    defaultValue: null,
                },
                updated_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                deleted_by: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                deleted_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                tableName: 'gamification_badges',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
    }

    static initHooks(): void {

    }
}

export default GamificationBadge;

