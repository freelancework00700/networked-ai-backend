import { Op, Transaction } from 'sequelize';
import { Segment, Customer, CustomerSegment } from '../models/index';

const segmentAttributes = ['id', 'name', 'created_at', 'updated_at', 'created_by', 'updated_by'];

type PaginatedOptions = {
    page?: number;
    limit?: number;
    search?: string;
    order_by?: string;
    order_direction?: 'ASC' | 'DESC';
};

const getSegmentCustomerCounts = async (segmentIds: string[], userId: string): Promise<Record<string, number>> => {
    const countBySegmentId: Record<string, number> = {};
    segmentIds.forEach((id) => (countBySegmentId[id] = 0));
    if (segmentIds.length === 0) return countBySegmentId;

    const countResults = (await CustomerSegment.count({
        where: { segment_id: { [Op.in]: segmentIds } },
        include: [
            { 
                as: 'customer',
                required: true,
                attributes: [],
                model: Customer,
                where: { is_deleted: false, created_by: userId },
            }
        ],
        col: 'customer_id',
        group: ['segment_id'],
    })) as unknown as { segment_id: string; count: number }[];

    (countResults || []).forEach((r) => countBySegmentId[r.segment_id] = r.count);

    return countBySegmentId;
};

/** Get all segments with pagination, search, order (scoped by created_by). Includes total_customer per segment. */
const getAllSegmentsPaginated = async (
    userId: string,
    options: PaginatedOptions = {}
): Promise<{ data: (Segment & { total_customer?: number })[]; pagination: { totalCount: number; currentPage: number; totalPages: number } }> => {
    const { page = 1, limit = 10, search = '', order_by = 'name', order_direction = 'ASC' } = options;
    const whereClause: any = { is_deleted: false, created_by: userId };
    const offset = (Number(page) - 1) * Number(limit);

    if (search) {
        whereClause.name = { [Op.like]: `%${search}%` };
    }

    const validOrderColumns = ['name', 'created_at', 'updated_at'];
    const orderColumn = validOrderColumns.includes(order_by) ? order_by : 'name';

    const { count, rows } = await Segment.findAndCountAll({
        attributes: segmentAttributes,
        where: whereClause,
        order: [[orderColumn, order_direction]],
        limit: Number(limit),
        offset,
    });

    const segmentIds = rows.map((r) => r.id);
    const countBySegmentId = await getSegmentCustomerCounts(segmentIds, userId);

    const data = rows.map((segment) => {
        const segmentData = segment.toJSON ? segment.toJSON() : (segment as any);
        return { ...segmentData, total_customer: countBySegmentId[segment.id] ?? 0 };
    });

    return {
        data,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get segment by id (scoped by created_by). */
const getSegmentById = async (id: string, userId: string, transaction?: Transaction): Promise<(Segment & { total_customer: number }) | null> => {
    const segment = await Segment.findOne({
        where: { id, is_deleted: false, created_by: userId },
        attributes: segmentAttributes,
        transaction,
    });

    if (!segment) return null;
    const countBySegmentId = await getSegmentCustomerCounts([segment.id], userId);
    const segmentData = segment.toJSON ? segment.toJSON() : (segment as any);
    return { ...segmentData, total_customer: countBySegmentId[segment.id] ?? 0 } as Segment & { total_customer: number };
};

/** Create segment. */
const createSegment = async (data: { name: string }, userId: string, transaction?: Transaction): Promise<Segment> => {
    return Segment.create(
        {
            ...data,
            created_by: userId,
            updated_by: userId,
        },
        { transaction }
    );
};

/** Update segment (scoped by created_by). */
const updateSegment = async (id: string, data: Partial<{ name: string }>, userId: string, transaction?: Transaction): Promise<void> => {
    await Segment.update(
        { ...data, updated_by: userId },
        { where: { id, is_deleted: false, created_by: userId }, transaction }
    );
};

/** Soft delete segment. */
const deleteSegment = async (id: string, userId: string, transaction?: Transaction): Promise<void> => {
    await Segment.update(
        { is_deleted: true, deleted_at: new Date(), deleted_by: userId },
        { where: { id, is_deleted: false, created_by: userId }, transaction }
    );
};

/** Get customers for a segment with pagination, search (name/email/mobile), order. */
const getSegmentCustomersPaginated = async (
    segmentId: string,
    userId: string,
    options: PaginatedOptions = {}
): Promise<{ data: Customer[]; pagination: { totalCount: number; currentPage: number; totalPages: number } }> => {
    const { page = 1, limit = 10, search = '', order_by = 'name', order_direction = 'ASC' } = options;
    const offset = (Number(page) - 1) * Number(limit);

    const segment = await Segment.findOne({
        where: { id: segmentId, is_deleted: false, created_by: userId },
        attributes: ['id'],
    });
    if (!segment) return { data: [], pagination: { totalCount: 0, currentPage: page, totalPages: 0 } };

    const customerWhere: any = { is_deleted: false, created_by: userId };
    if (search) {
        customerWhere[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { mobile: { [Op.like]: `%${search}%` } },
        ];
    }

    const validOrderColumns = ['name', 'email', 'mobile', 'created_at'];
    const orderColumn = validOrderColumns.includes(order_by) ? order_by : 'name';

    const { count, rows } = await Customer.findAndCountAll({
        attributes: ['id', 'name', 'email', 'mobile', 'created_at', 'updated_at', 'created_by', 'updated_by'],
        where: customerWhere,
        include: [
            {
                model: Segment,
                as: 'segments',
                required: true,
                where: { id: segmentId },
                attributes: [],
                through: { attributes: [] },
            },
        ],
        order: [[orderColumn, order_direction]],
        limit: Number(limit),
        offset,
        distinct: true,
    });

    return {
        data: rows,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

export default {
    deleteSegment,
    createSegment,
    updateSegment,
    getSegmentById,
    getAllSegmentsPaginated,
    getSegmentCustomersPaginated,
};
