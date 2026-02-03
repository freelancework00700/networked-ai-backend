import { Transaction } from 'sequelize';
import {UserSocial} from '../models/index';

const findByUserId = (userId: string) =>
    UserSocial.findOne({
        where: { user_id: userId }
    });

const upsert = async (userId: string, data: Partial<UserSocial>, actorId?: string | null, transaction?: Transaction) => {
    if (!data) return null;
    const existing = await findByUserId(userId);
    if (existing) {
        existing.website = data.website ?? existing.website;
        existing.twitter = data.twitter ?? existing.twitter;
        existing.linkedin = data.linkedin ?? existing.linkedin;
        existing.facebook = data.facebook ?? existing.facebook;
        existing.snapchat = data.snapchat ?? existing.snapchat;
        existing.instagram = data.instagram ?? existing.instagram;
        if (actorId !== undefined) existing.updated_by = actorId;
        await existing.save({ transaction });
        return existing;
    }
    return UserSocial.create({
        user_id: userId,
        website: data.website ?? null,
        twitter: data.twitter ?? null,
        linkedin: data.linkedin ?? null,
        facebook: data.facebook ?? null,
        snapchat: data.snapchat ?? null,
        instagram: data.instagram ?? null,
        created_by: actorId ?? null,
    }, { transaction });
};

export default { findByUserId, upsert };
