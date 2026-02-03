import { Transaction } from 'sequelize';
import {UserSetting} from '../models/index';

const findByUserId = (userId: string) =>
    UserSetting.findOne({
        where: { user_id: userId }
    });

const upsert = async (userId: string, data: Partial<UserSetting>, actorId?: string | null, transaction?: Transaction) => {
    if (!data) return null;
    const existing = await findByUserId(userId);
    if (existing) {
        existing.hide_email = data.hide_email ?? existing.hide_email;
        existing.hide_mobile = data.hide_mobile ?? existing.hide_mobile;
        existing.hide_location = data.hide_location ?? existing.hide_location;
        if (actorId !== undefined) existing.updated_by = actorId;
        await existing.save({ transaction });
        return existing;
    }
    return UserSetting.create({
        user_id: userId,
        hide_email: data.hide_email ?? false,
        hide_mobile: data.hide_mobile ?? false,
        hide_location: data.hide_location ?? false,
        created_by: actorId ?? null,
    }, { transaction });
};

export default { findByUserId, upsert };
