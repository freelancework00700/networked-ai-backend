import { Op, Transaction } from 'sequelize';
import { ReportReason } from '../models/index';

const reportReasonAttributes = ['id', 'reason', 'order'];

/** Get all report reasons with search query. */
const getAllReportReasons = async (search: string = '') => {
    const whereClause: any = { is_deleted: false };

    if (search) {
        whereClause[Op.or] = [
            { reason: { [Op.like]: `%${search}%` } },
        ];
    }

    const reportReasons = await ReportReason.findAll({
        where: whereClause,
        attributes: reportReasonAttributes,
        order: [["order", "ASC"]],
    });

    return reportReasons;
};

/** Get all report reasons with pagination and search query. */
const getAllReportReasonsPaginated = async (page: number = 1, limit: number = 10, search: string = '') => {
    const whereClause: any = { is_deleted: false };
    const offset = (Number(page) - 1) * Number(limit);

    if (search) {
        whereClause[Op.or] = [
            { reason: { [Op.like]: `%${search}%` } },
        ];
    }

    const { count, rows: reportReasons } = await ReportReason.findAndCountAll({
        attributes: reportReasonAttributes,
        where: whereClause,
        order: [["order", "ASC"]],
        limit: Number(limit),
        offset,
    });

    return {
        data: reportReasons,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get a report reason by id. */
const getReportReasonById = async (id: string, transaction?: Transaction) => {
    return await ReportReason.findOne({
        attributes: reportReasonAttributes,
        where: {
            id,
            is_deleted: false
        },
        transaction
    });
};

/** Get a report reason by reason. */
const getReportReasonByReason = async (reason: string, excludeReportReasonId?: string) => {
    const whereClause: any = { reason, is_deleted: false };

    if (excludeReportReasonId) {
        whereClause.id = { [Op.ne]: excludeReportReasonId };
    }

    return await ReportReason.findOne({ where: whereClause });
};

/** Create a new report reason. */
const createReportReason = async (data: Partial<ReportReason>, userId: string, transaction?: Transaction) => {
    return await ReportReason.create({
        ...data,
        created_by: userId,
        updated_by: userId,
    }, { transaction });
};

/** Update a report reason. */
const updateReportReason = async (id: string, data: Partial<ReportReason>, userId: string, transaction?: Transaction) => {
    await ReportReason.update({
        ...data,
        updated_by: userId,
    }, {
        where: { id, is_deleted: false },
        transaction,
    });
};

/** Delete a report reason. */
const deleteReportReason = async (id: string, userId: string, transaction?: Transaction) => {
    await ReportReason.update({
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId,
    }, {
        where: { id, is_deleted: false },
        transaction,
    });
};

export default {
    getAllReportReasons,
    getAllReportReasonsPaginated,
    getReportReasonById,
    getReportReasonByReason,
    createReportReason,
    updateReportReason,
    deleteReportReason,
};
