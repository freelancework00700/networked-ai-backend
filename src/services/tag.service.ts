import { Op, Transaction } from 'sequelize';
import { Tag, Customer, CustomerTag } from '../models/index';

const tagAttributes = ['id', 'name', 'created_at', 'updated_at', 'created_by', 'updated_by'];

type PaginatedOptions = {
    page?: number;
    limit?: number;
    search?: string;
    order_by?: string;
    order_direction?: 'ASC' | 'DESC';
};

const getTagCustomerCounts = async (tagIds: string[], userId: string): Promise<Record<string, number>> => {
    const countByTagId: Record<string, number> = {};
    tagIds.forEach((id) => (countByTagId[id] = 0));
    if (tagIds.length === 0) return countByTagId;
    const countResults = (await CustomerTag.count({
        where: { tag_id: { [Op.in]: tagIds } },
        include: [
            { 
                as: 'customer',
                required: true,
                attributes: [],
                model: Customer,
                where: { is_deleted: false, created_by: userId },
            }
        ],
        group: ['tag_id'],
        col: 'customer_id',
    })) as unknown as { tag_id: string; count: number }[];

    (countResults || []).forEach((r) => countByTagId[r.tag_id] = r.count);
    return countByTagId;
};

const getAllTagsPaginated = async (
    userId: string,
    options: PaginatedOptions = {}
): Promise<{ data: (Tag & { total_customer?: number })[]; pagination: { totalCount: number; currentPage: number; totalPages: number } }> => {
    const { page = 1, limit = 10, search = '', order_by = 'created_at', order_direction = 'DESC' } = options;
    const whereClause: any = { is_deleted: false, created_by: userId };
    const offset = (Number(page) - 1) * Number(limit);

    if (search) {
        whereClause.name = { [Op.like]: `%${search}%` };
    }

    const validOrderColumns = ['name', 'created_at', 'updated_at'];
    const orderColumn = validOrderColumns.includes(order_by) ? order_by : 'name';

    const { count, rows } = await Tag.findAndCountAll({
        attributes: tagAttributes,
        where: whereClause,
        order: [[orderColumn, order_direction]],
        limit: Number(limit),
        offset,
    });

    const tagIds = rows.map((r) => r.id);
    const countByTagId = await getTagCustomerCounts(tagIds, userId);

    const data = rows.map((tag) => {
        const tagData = tag.toJSON ? tag.toJSON() : (tag as any);
        return { ...tagData, total_customer: countByTagId[tag.id] ?? 0 };
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

const getTagById = async (id: string, userId: string, transaction?: Transaction): Promise<(Tag & { total_customer: number }) | null> => {
    const tag = await Tag.findOne({
        where: { id, is_deleted: false, created_by: userId },
        attributes: tagAttributes,
        transaction,
    });

    if (!tag) return null;
    const countByTagId = await getTagCustomerCounts([tag.id], userId);
    const tagData = tag.toJSON ? tag.toJSON() : (tag as any);
    return { ...tagData, total_customer: countByTagId[tag.id] ?? 0 } as Tag & { total_customer: number };
};

const createTag = async (data: { name: string }, userId: string, transaction?: Transaction): Promise<Tag> => {
    return Tag.create(
        {
            ...data,
            created_by: userId,
            updated_by: userId,
        },
        { transaction }
    );
};

const updateTag = async (id: string, data: Partial<{ name: string }>, userId: string, transaction?: Transaction): Promise<void> => {
    await Tag.update(
        { ...data, updated_by: userId },
        { where: { id, is_deleted: false, created_by: userId }, transaction }
    );
};

const deleteTag = async (id: string, userId: string, transaction?: Transaction): Promise<void> => {
    await Tag.update(
        { is_deleted: true, deleted_at: new Date(), deleted_by: userId },
        { where: { id, is_deleted: false, created_by: userId }, transaction }
    );
};

const getTagCustomersPaginated = async (
    tagId: string,
    userId: string,
    options: PaginatedOptions = {}
): Promise<{ data: Customer[]; pagination: { totalCount: number; currentPage: number; totalPages: number } }> => {
    const { page = 1, limit = 10, search = '', order_by = 'created_at', order_direction = 'DESC' } = options;
    const offset = (Number(page) - 1) * Number(limit);

    const tag = await Tag.findOne({
        where: { id: tagId, is_deleted: false, created_by: userId },
        attributes: ['id'],
    });
    if (!tag) return { data: [], pagination: { totalCount: 0, currentPage: page, totalPages: 0 } };

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
                model: Tag,
                as: 'tags',
                required: true,
                where: { id: tagId },
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
    deleteTag,
    createTag,
    updateTag,
    getTagById,
    getAllTagsPaginated,
    getTagCustomersPaginated,
};
