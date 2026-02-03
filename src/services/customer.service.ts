import { Op, Transaction, IncludeOptions } from 'sequelize';
import { Customer, CustomerTag, CustomerSegment, Tag, Segment } from '../models/index';

const customerAttributes = ['id', 'name', 'email', 'mobile', 'created_at', 'updated_at', 'created_by', 'updated_by'];

type PaginatedOptions = {
    page?: number;
    limit?: number;
    search?: string;
    order_by?: string;
    tag_ids?: string[];
    segment_ids?: string[];
    order_direction?: 'ASC' | 'DESC';
};

const getCustomerIncludes = (tag_ids?: string[], segment_ids?: string[]): IncludeOptions[] => {
    const hasTagFilter = !!(tag_ids && tag_ids.length > 0);
    const hasSegmentFilter = !!(segment_ids && segment_ids.length > 0);
  
    return [
      {
        model: Tag,
        as: "tags",
        required: hasTagFilter,
        where: hasTagFilter
          ? {
              is_deleted: false,
              id: { [Op.in]: tag_ids },
            }
          : { is_deleted: false },
        through: { attributes: [] },
        attributes: ['id', 'name'],
      },
      {
        model: Segment,
        as: "segments",
        required: hasSegmentFilter,
        where: hasSegmentFilter
          ? {
              is_deleted: false,
              id: { [Op.in]: segment_ids },
            }
          : { is_deleted: false },
        through: { attributes: [] },
        attributes: ['id', 'name'],
      },
    ];
};

const getAllCustomersPaginated = async (
    userId: string,
    options: PaginatedOptions = {}
): Promise<{ data: Customer[]; pagination: { totalCount: number; currentPage: number; totalPages: number } }> => {
    const {
        tag_ids,
        page = 1,
        limit = 10,
        segment_ids,
        search = '',
        order_by = 'created_at',
        order_direction = 'DESC',
    } = options;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = { is_deleted: false, created_by: userId };
    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { mobile: { [Op.like]: `%${search}%` } },
        ];
    }

    const validOrderColumns = ['name', 'email', 'mobile', 'created_at', 'updated_at'];
    const orderColumn = validOrderColumns.includes(order_by) ? order_by : 'name';

    const { count, rows } = await Customer.findAndCountAll({
        offset,
        distinct: true,
        where: whereClause,
        limit: Number(limit),
        attributes: customerAttributes,
        order: [[orderColumn, order_direction]],
        include: getCustomerIncludes(tag_ids, segment_ids),
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

const getCustomerById = async (id: string, userId: string, transaction?: Transaction): Promise<Customer | null> => {
    return Customer.findOne({
        transaction,
        attributes: customerAttributes,
        include: getCustomerIncludes([], []),
        where: { id, is_deleted: false, created_by: userId },
    });
};

const createCustomer = async (
    data: { name: string; email?: string | null; mobile?: string | null },
    userId: string,
    transaction?: Transaction
): Promise<Customer> => {
    return Customer.create(
        {
            ...data,
            created_by: userId,
            updated_by: userId,
        },
        { transaction }
    );
};

const updateCustomer = async (
    id: string,
    data: Partial<{ name: string; email: string | null; mobile: string | null }>,
    userId: string,
    transaction?: Transaction
): Promise<void> => {
    await Customer.update(
        { ...data, updated_by: userId },
        { where: { id, is_deleted: false, created_by: userId }, transaction }
    );
};

const deleteCustomer = async (id: string, userId: string, transaction?: Transaction): Promise<void> => {
    await Customer.update(
        { is_deleted: true, deleted_at: new Date(), deleted_by: userId },
        { where: { id, is_deleted: false, created_by: userId }, transaction }
    );
};

const setCustomerTags = async (customerId: string, tagIds: string[], transaction?: Transaction): Promise<void> => {
    await CustomerTag.destroy({ where: { customer_id: customerId }, transaction });
    if (tagIds.length) {
        await CustomerTag.bulkCreate(
            tagIds.map((tag_id) => ({ customer_id: customerId, tag_id })),
            { transaction }
        );
    }
};

const setCustomerSegments = async (customerId: string, segmentIds: string[], transaction?: Transaction): Promise<void> => {
    await CustomerSegment.destroy({ where: { customer_id: customerId }, transaction });
    if (segmentIds.length) {
        await CustomerSegment.bulkCreate(
            segmentIds.map((segment_id) => ({ customer_id: customerId, segment_id })),
            { transaction }
        );
    }
};

export default {
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    setCustomerTags,
    setCustomerSegments,
    getAllCustomersPaginated,
};
