import tagService from './tag.service';
import { Op, Transaction, IncludeOptions } from 'sequelize';
import { isNetworkTagForUser } from '../utils/tag.constants';
import { Customer, CustomerTag, CustomerSegment, Tag, Segment } from '../models/index';

/** Split tag ids into system (Network + hosted-event) and regular (user-created tags). */
const splitTagIdsIntoRegularAndSystem = async (tagIds: string[], userId: string): Promise<{ regular: string[]; system: string[] }> => {
    const results = await Promise.all(
        tagIds.map(async (id) => {
            if (isNetworkTagForUser(id, userId)) return { id, system: true };
            if (await tagService.isHostedEventByUser(id, userId)) return { id, system: true };
            return { id, system: false };
        })
    );

    return {
        regular: results.filter((r) => !r.system).map((r) => r.id),
        system: results.filter((r) => r.system).map((r) => r.id),
    };
};

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
    const customer = await Customer.findOne({
        transaction,
        attributes: ['id'],
        where: { id, is_deleted: false, created_by: userId },
    });
    if (!customer) return;

    await Customer.destroy({ where: { id }, transaction });
};

const setCustomerTags = async (customerId: string, tagIds: string[], userId: string, transaction?: Transaction): Promise<void> => {
    const hostedEventIds = await tagService.getHostedEventIdsForUser(userId);
    const hostedSet = new Set(hostedEventIds);
    const assignableTagIds = (tagIds || []).filter((id) => !isNetworkTagForUser(id, userId) && !hostedSet.has(id));
    await CustomerTag.destroy({ where: { customer_id: customerId }, transaction });
    if (assignableTagIds.length) {
        await CustomerTag.bulkCreate(
            assignableTagIds.map((tag_id) => ({ customer_id: customerId, tag_id })),
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

/** Get distinct emails for customers that have at least one of the given tag_ids OR segment_ids (union). tag_ids can include system tags (Network = userId, hosted-event = event id). */
const getDistinctEmailsByTagsAndSegments = async (
    userId: string,
    tag_ids: string[],
    segment_ids: string[],
    transaction?: Transaction
): Promise<string[]> => {
    const tagIds = (tag_ids || []).filter(Boolean);
    const segmentIds = (segment_ids || []).filter(Boolean);
    const { regular: regularTagIds, system: systemTagIds } = await splitTagIdsIntoRegularAndSystem(tagIds, userId);

    const customerIds = new Set<string>();

    if (regularTagIds.length > 0) {
        const fromTags = await CustomerTag.findAll({
            where: { tag_id: { [Op.in]: regularTagIds } },
            attributes: ['customer_id'],
            raw: true,
            transaction,
        });
        fromTags.forEach((r) => customerIds.add(r.customer_id));
    }
    if (segmentIds.length > 0) {
        const fromSegments = await CustomerSegment.findAll({
            where: { segment_id: { [Op.in]: segmentIds } },
            attributes: ['customer_id'],
            raw: true,
            transaction,
        });
        fromSegments.forEach((r) => customerIds.add(r.customer_id));
    }

    let customerEmails: string[] = [];
    if (customerIds.size > 0) {
        const customers = await Customer.findAll({
            where: {
                id: { [Op.in]: Array.from(customerIds) },
                created_by: userId,
                is_deleted: false,
                email: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
            },
            attributes: ['email'],
            raw: true,
            transaction,
        });
        customerEmails = customers.map((c) => c.email).filter((e): e is string => Boolean(e));
    }

    const systemEmails = systemTagIds.length > 0 ? await tagService.getDistinctEmailsForSystemTagIds(userId, systemTagIds) : [];
    return [...new Set([...customerEmails, ...systemEmails])];
};

/** Get distinct mobile numbers for customers that have at least one of the given tag_ids OR segment_ids (union). tag_ids can include system tags. */
const getDistinctMobilesByTagsAndSegments = async (
    userId: string,
    tag_ids: string[],
    segment_ids: string[],
    transaction?: Transaction
): Promise<string[]> => {
    const tagIds = (tag_ids || []).filter(Boolean);
    const segmentIds = (segment_ids || []).filter(Boolean);
    const { regular: regularTagIds, system: systemTagIds } = await splitTagIdsIntoRegularAndSystem(tagIds, userId);

    const customerIds = new Set<string>();

    if (regularTagIds.length > 0) {
        const fromTags = await CustomerTag.findAll({
            where: { tag_id: { [Op.in]: regularTagIds } },
            attributes: ['customer_id'],
            raw: true,
            transaction,
        });

        fromTags.forEach((r) => customerIds.add(r.customer_id));
    }

    if (segmentIds.length > 0) {
        const fromSegments = await CustomerSegment.findAll({
            where: { segment_id: { [Op.in]: segmentIds } },
            attributes: ['customer_id'],
            raw: true,
            transaction,
        });

        fromSegments.forEach((r) => customerIds.add(r.customer_id));
    }

    let customerMobiles: string[] = [];
    if (customerIds.size > 0) {
        const customers = await Customer.findAll({
            where: {
                id: { [Op.in]: Array.from(customerIds) },
                created_by: userId,
                is_deleted: false,
                mobile: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
            },
            attributes: ['mobile'],
            raw: true,
            transaction,
        });

        customerMobiles = customers.map((c) => c.mobile).filter((e): e is string => Boolean(e));
    }

    const systemMobiles = systemTagIds.length > 0 ? await tagService.getDistinctMobilesForSystemTagIds(userId, systemTagIds) : [];
    return [...new Set([...customerMobiles, ...systemMobiles])];
};

export default {
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    setCustomerTags,
    setCustomerSegments,
    getAllCustomersPaginated,
    getDistinctEmailsByTagsAndSegments,
    getDistinctMobilesByTagsAndSegments,
};
