import { Media } from '../models/index';
import { Transaction } from 'sequelize';

/**
 * Create multiple media records in bulk
 */
const createBulkMedia = async (data: Media[], createdBy?: string | null, transaction?: Transaction) => {
    const media = await Media.bulkCreate(
        data.map(item => ({
            ...item,
            ...(createdBy && { created_by: createdBy }),
        })),
        { transaction }
    );
    return media.map((m: Media) => m.toJSON());
};

/**
 * Delete media records by user ID
 */
const deleteMedia = async (mediaIds: string[], userId?: string | null, transaction?: Transaction) => {
    return await Media.update({
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId,
    }, {
        where: { id: mediaIds, is_deleted: false },
        transaction,
    });
};

export default {
    createBulkMedia,
    deleteMedia,
};