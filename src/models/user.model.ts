import { DataTypes, Model, Sequelize } from 'sequelize';
import UserSetting from './user-setting.model';
import UserSocial from './user-social.model';
import { AccountType, StripeAccountStatus } from '../types/enums';
import UserVibe from './user-vibe.model';
import UserHobby from './user-hobby.model';
import UserInterest from './user-interest.model';
import Vibe from './vibe.model';
import Hobby from './hobby.model';
import Interest from './interest.model';
import Feed from './feed.model';
import BlockedUser from './blocked-user.model';
import EventAttendee from './event-attendee.model';
import loggerService from '../utils/logger.service';
import { sendWelcomeEmail } from '../services/email.service';
import { emitUserUpdated } from '../socket/event';

export class User extends Model {
    public id!: string;
    public firebase_uid!: string;
    public dob!: Date | null;
    public description!: string | null;
    public title!: string | null;
    public name!: string | null;
    public email!: string | null;
    public username!: string | null;
    public password!: string | null;
    public mobile!: string | null;
    public is_admin!: boolean;
    public account_type!: AccountType;
    public company_name!: string | null;
    public stripe_account_id!: string | null;
    public stripe_customer_id!: string | null;
    public stripe_account_status!: string | null;
    public fcm_tokens!: string | null;
    public address!: string | null;
    public latitude!: string | null;
    public longitude!: string | null;
    public college_university_name!: string | null;
    public image_url!: string | null;
    public thumbnail_url!: string | null;
    public total_networks!: number;
    public total_network_requests!: number;
    public total_events_liked!: number;
    public total_events_hosted!: number;
    public total_events_staffed!: number;
    public total_events_spoken!: number;
    public total_events_cohosted!: number;
    public total_events_sponsored!: number;
    public total_events_attended!: number;
    public total_messages_sent!: number;
    public total_qr_codes_scanned!: number;
    public total_gamification_points!: number;
    public total_gamification_points_weekly!: number;
    public is_deleted!: boolean;
    public created_by!: string | null;
    public updated_by!: string | null;
    public deleted_by!: string | null;
    public created_at!: Date;
    public updated_at!: Date;
    public deleted_at!: Date | null;
    public vibes!: Vibe[];
    public interests!: Interest[];
    public hobbies!: Hobby[];
    public settings!: UserSetting;

    static initModel(connection: Sequelize): void {
        User.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                firebase_uid: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                dob: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                description: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                title: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                name: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                email: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                mobile: {
                    type: DataTypes.STRING(20),
                    allowNull: true,
                },
                is_admin: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                account_type: {
                    type: DataTypes.ENUM(...Object.values(AccountType)),
                    allowNull: false,
                    defaultValue: AccountType.INDIVIDUAL,
                },
                company_name: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                },
                stripe_account_id: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                stripe_customer_id: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                stripe_account_status: {
                    type: DataTypes.ENUM(...Object.values(StripeAccountStatus)),
                    allowNull: true,
                },
                fcm_tokens: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                address: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                latitude: {
                    type: DataTypes.STRING(50),
                    allowNull: true,
                },
                longitude: {
                    type: DataTypes.STRING(50),
                    allowNull: true,
                },
                college_university_name: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                image_url: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                thumbnail_url: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                username: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                },
                total_networks: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_network_requests: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_events_sponsored: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_events_liked: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_events_hosted: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_events_staffed: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_events_spoken: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_events_cohosted: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_events_attended: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_gamification_points: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_gamification_points_weekly: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_messages_sent: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                total_qr_codes_scanned: {
                    type: DataTypes.INTEGER.UNSIGNED,
                    allowNull: false,
                    defaultValue: 0,
                },
                password: {
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
                tableName: 'users',
                sequelize: connection,
                freezeTableName: true,
                timestamps: true,
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            }
        );
    }

    static initAssociations(): void {
        User.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
        User.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
        User.belongsTo(User, { foreignKey: 'deleted_by', as: 'deleted_by_user' });

        User.hasOne(UserSetting, { foreignKey: 'user_id', as: 'settings' });
        User.hasOne(UserSocial, { foreignKey: 'user_id', as: 'socials' });
        User.hasMany(BlockedUser, { foreignKey: 'peer_id', as: 'blocked_users' });

        User.belongsToMany(Interest, {
            through: UserInterest,
            foreignKey: 'user_id',
            otherKey: 'interest_id',
            constraints: false,
            as: 'interests'
        });

        User.belongsToMany(Hobby, {
            through: UserHobby,
            foreignKey: 'user_id',
            otherKey: 'hobby_id',
            constraints: false,
            as: 'hobbies'
        });

        User.belongsToMany(Vibe, {
            through: UserVibe,
            foreignKey: 'user_id',
            otherKey: 'vibe_id',
            constraints: false,
            as: 'vibes'
        });

        User.hasMany(Feed, { foreignKey: 'user_id', as: 'feeds' });
        User.hasMany(EventAttendee, { foreignKey: 'user_id', as: 'event_attendances' });
    }

    static initHooks(): void {
        User.afterCreate(async (user: User, options: any) => {
            try {
                if (!user?.email) return;
                await sendWelcomeEmail(user, options?.transaction);
            } catch (error: any) {
                loggerService.error(`Error sending welcome email in user hook: ${error.message || error}`);
            }
        });

        User.afterUpdate(async (user: User) => {
            try {
                if (!user?.id) return;
                const payload = user.get({ plain: true });
                emitUserUpdated(user.id, payload);
            } catch (error: any) {
                loggerService.error(`Error emitting user:updated in user hook: ${error?.message || error}`);
            }
        });
    }
}

export default User;
