import { DataTypes, Model, Sequelize } from 'sequelize';
import { OtpVerificationType } from '../types/enums';

export class OtpVerification extends Model {
    public id!: string;
    public email!: string | null;
    public mobile!: string | null;
    public verification_code!: string;
    public verification_type!: OtpVerificationType;
    public expires_at!: Date;
    public created_at!: Date;
    public updated_at!: Date;

    static initModel(connection: Sequelize): void {
        OtpVerification.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                email: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                },
                mobile: {
                    type: DataTypes.STRING(20),
                    allowNull: true,
                },
                verification_code: {
                    type: DataTypes.STRING(10),
                    allowNull: false
                },
                verification_type: {
                    type: DataTypes.ENUM(...Object.values(OtpVerificationType)),
                    allowNull: false,
                    defaultValue: OtpVerificationType.EMAIL,
                },
                expires_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },
            },
            {
                tableName: 'otp_verifications',
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

export default OtpVerification;

