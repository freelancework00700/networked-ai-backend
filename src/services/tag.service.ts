import { Op, Transaction } from 'sequelize';
import { EventParticipantRole } from '../types/enums';
import networkConnectionService from './network-connection.service';
import { DEFAULT_TAG_NETWORK_NAME, isNetworkTagForUser } from '../utils/tag.constants';
import { Tag, Customer, CustomerTag, UserNetwork, Event, EventAttendee, EventParticipant, User } from '../models/index';

type TagWithMeta = Tag & { total_customer?: number; is_system?: boolean };
const tagAttributes = ['id', 'name', 'created_at', 'updated_at', 'created_by', 'updated_by'];
const userAttributesForTag = ['id', 'name', 'email', 'mobile', 'image_url', 'thumbnail_url', 'created_at', 'updated_at', 'created_by', 'updated_by'];

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

const getNetworkConnectionCount = async (userId: string): Promise<number> => {
    return UserNetwork.count({
        where: { user_id: userId, is_deleted: false },
    });
};

const buildNetworkVirtualTag = async (userId: string): Promise<TagWithMeta> => {
    const [total_customer, user] = await Promise.all([
        getNetworkConnectionCount(userId),
        User.findOne({ where: { id: userId, is_deleted: false }, attributes: ['id', 'created_at', 'updated_at', 'created_by', 'updated_by'] }),
    ]);
    return {
        id: userId,
        total_customer,
        is_system: true,
        created_by: userId,
        updated_by: userId,
        name: DEFAULT_TAG_NETWORK_NAME,
        created_at: user?.created_at ?? null,
        updated_at: user?.updated_at ?? null,
    } as unknown as TagWithMeta;
};

/** True if eventId is an event hosted by the user (created_by = userId). */
const isHostedEventByUser = async (eventId: string, userId: string): Promise<boolean> => {
    const event = await Event.findOne({
        where: { id: eventId, created_by: userId, is_deleted: false },
        attributes: ['id'],
    });
    return !!event;
};

/** Events hosted by the user (created_by = userId), for use as virtual tags. */
const getHostedEventsForUser = async (userId: string): Promise<{ id: string; title: string; created_at: Date; updated_at: Date; created_by: string | null; updated_by: string | null }[]> => {
    const events = await Event.findAll({
        where: { created_by: userId, is_deleted: false },
        order: [['start_date', 'DESC']],
        attributes: ['id', 'title', 'created_at', 'updated_at', 'created_by', 'updated_by'],
    });
    return events.map((e) => ({
        id: e.id,
        title: e.title,
        created_at: e.created_at,
        updated_at: e.updated_at,
        created_by: e.created_by,
        updated_by: e.updated_by,
    }));
};

/** Count of distinct attendees + participants (excluding host) for a single event. */
const getAttendeesAndParticipantsCountForEvent = async (eventId: string): Promise<number> => {
    const [attendees, participants] = await Promise.all([
        EventAttendee.findAll({ where: { event_id: eventId, is_deleted: false }, attributes: ['user_id'] }),
        EventParticipant.findAll({
            where: { event_id: eventId, role: { [Op.ne]: EventParticipantRole.HOST }, is_deleted: false },
            attributes: ['user_id'],
        }),
    ]);
    const ids = new Set<string>();
    attendees.forEach((a) => ids.add(a.user_id));
    participants.forEach((p) => ids.add(p.user_id));
    return ids.size;
};

/** Paginated attendees + participants (excluding host) for a single event. */
const getAttendeesAndParticipantsPaginatedForEvent = async (
    eventId: string,
    userId: string,
    options: PaginatedOptions
): Promise<{ data: any[]; pagination: { totalCount: number; currentPage: number; totalPages: number } }> => {
    const [attendees, participants] = await Promise.all([
        EventAttendee.findAll({ where: { event_id: eventId, is_deleted: false }, attributes: ['user_id'] }),
        EventParticipant.findAll({
            where: { event_id: eventId, role: { [Op.ne]: EventParticipantRole.HOST }, is_deleted: false },
            attributes: ['user_id'],
        }),
    ]);
    const contactIds = new Set<string>();
    attendees.forEach((a) => contactIds.add(a.user_id));
    participants.forEach((p) => contactIds.add(p.user_id));
    const userIds = [...contactIds];
    if (userIds.length === 0) {
        return { data: [], pagination: { totalCount: 0, currentPage: Number(options.page) || 1, totalPages: 0 } };
    }
    const { page = 1, limit = 10, search = '', order_by = 'name', order_direction = 'ASC' } = options;
    const whereUser: any = { id: { [Op.in]: userIds }, is_deleted: false };
    if (search) {
        whereUser[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { username: { [Op.like]: `%${search}%` } },
            { mobile: { [Op.like]: `%${search}%` } },
        ];
    }
    const validOrder = ['name', 'email', 'username', 'created_at'].includes(order_by) ? order_by : 'name';
    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await User.findAndCountAll({
        offset,
        where: whereUser,
        limit: Number(limit),
        attributes: userAttributesForTag,
        order: [[validOrder, order_direction]],
    });
    const users = rows.map((r) => (r.toJSON ? r.toJSON() : (r as any)));
    // const withStatus = await userService.addConnectionStatusToUsers(users, userId, false);
    return {
        data: users,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)) || 0,
        },
    };
};

/** Virtual tag for a hosted event: id = event.id, name = event.title; created_at/updated_at and created_by/updated_by from event. */
const buildHostedEventVirtualTag = (
    event: { id: string; title: string; created_at: Date; updated_at: Date; created_by: string | null; updated_by: string | null },
    total_customer: number
): TagWithMeta =>
    ({
        id: event.id,
        name: event.title,
        total_customer,
        is_system: true,
        created_at: event.created_at,
        updated_at: event.updated_at,
        created_by: event.created_by,
        updated_by: event.updated_by,
    }) as unknown as TagWithMeta;

/** Hosted event ids for the user (for excluding from customer tag assignment). */
const getHostedEventIdsForUser = async (userId: string): Promise<string[]> => {
    const events = await Event.findAll({
        where: { created_by: userId, is_deleted: false },
        attributes: ['id'],
    });
    return events.map((e) => e.id);
};

/** All assignable tag ids for the user (user-created tags from DB only; excludes system tags). */
const getAssignableTagIdsForUser = async (userId: string): Promise<string[]> => {
    const tags = await Tag.findAll({
        where: { created_by: userId, is_deleted: false },
        attributes: ['id'],
    });
    return tags.map((t) => t.id);
};

const getAllTagsPaginated = async (
    userId: string,
    options: PaginatedOptions & { excludeSystemTag?: boolean } = {}
): Promise<{ data: TagWithMeta[]; pagination: { totalCount: number; currentPage: number; totalPages: number } }> => {
    const { page = 1, limit = 10, search = '', order_by = 'created_at', order_direction = 'DESC', excludeSystemTag = false } = options;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const whereClause: any = { is_deleted: false, created_by: userId };

    if (search) {
        whereClause.name = { [Op.like]: `%${search}%` };
    }

    const validOrderColumns = ['name', 'created_at', 'updated_at'];
    const orderColumn = validOrderColumns.includes(order_by) ? order_by : 'name';

    let systemTags: TagWithMeta[] = [];
    if (!excludeSystemTag) {
        const networkTag = await buildNetworkVirtualTag(userId);
        const hostedEvents = await getHostedEventsForUser(userId);
        const counts = await Promise.all(hostedEvents.map((e) => getAttendeesAndParticipantsCountForEvent(e.id)));
        const hostedEventTags = hostedEvents.map((e, i) => buildHostedEventVirtualTag(e, counts[i]));
        const allSystemTags = [networkTag, ...hostedEventTags];
        systemTags = allSystemTags.filter((t) => (t.total_customer ?? 0) > 0);
    }

    const allUserTagRows = await Tag.findAll({
        where: whereClause,
        attributes: tagAttributes,
        order: [[orderColumn, order_direction]],
    });
    const userTagIds = allUserTagRows.map((r) => r.id);
    const countByTagId = userTagIds.length ? await getTagCustomerCounts(userTagIds, userId) : {};

    const allUserTags: TagWithMeta[] = allUserTagRows
        .map((tag) => {
            const tagData = tag.toJSON ? tag.toJSON() : (tag as any);
            return { ...tagData, total_customer: countByTagId[tag.id] ?? 0, is_system: false };
        })
        .filter((t) => (t.total_customer ?? 0) > 0);

    const combined = [...systemTags, ...allUserTags];
    const totalCount = combined.length;
    const start = (pageNum - 1) * limitNum;
    const data = combined.slice(start, start + limitNum);
    return {
        data,
        pagination: {
            totalCount,
            currentPage: pageNum,
            totalPages: Math.ceil(totalCount / limitNum) || 1,
        },
    };
};

const getTagById = async (id: string, userId: string, transaction?: Transaction): Promise<(Tag & { total_customer: number; is_system?: boolean }) | null> => {
    if (isNetworkTagForUser(id, userId)) {
        const networkTag = await buildNetworkVirtualTag(userId);
        return { ...networkTag, total_customer: networkTag.total_customer ?? 0 } as any;
    }
    const hostedEvent = await Event.findOne({
        where: { id, created_by: userId, is_deleted: false },
        attributes: ['id', 'title', 'created_at', 'updated_at', 'created_by', 'updated_by'],
        transaction,
    });
    if (hostedEvent) {
        const total_customer = await getAttendeesAndParticipantsCountForEvent(hostedEvent.id);
        const eventTag = buildHostedEventVirtualTag(
            {
                id: hostedEvent.id,
                title: hostedEvent.title,
                created_at: hostedEvent.created_at,
                updated_at: hostedEvent.updated_at,
                created_by: hostedEvent.created_by,
                updated_by: hostedEvent.updated_by,
            },
            total_customer
        );
        return { ...eventTag, total_customer } as any;
    }
    const tag = await Tag.findOne({
        where: { id, is_deleted: false, created_by: userId },
        attributes: tagAttributes,
        transaction,
    });

    if (!tag) return null;
    const countByTagId = await getTagCustomerCounts([tag.id], userId);
    const tagData = tag.toJSON ? tag.toJSON() : (tag as any);
    return { ...tagData, total_customer: countByTagId[tag.id] ?? 0, is_system: false } as any;
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

const deleteTag = async (id: string, transaction?: Transaction): Promise<void> => {
    await Tag.destroy({ where: { id }, transaction });
};

const getTagCustomersPaginated = async (
    tagId: string,
    userId: string,
    options: PaginatedOptions = {}
): Promise<{ data: Customer[] | any[]; pagination: { totalCount: number; currentPage: number; totalPages: number }; isNetworkTag?: boolean; isEventsTag?: boolean }> => {
    const { page = 1, limit = 10, search = '', order_by = 'created_at', order_direction = 'DESC' } = options;

    // if tag is network tag, return network connections
    if (isNetworkTagForUser(tagId, userId)) {
        return await networkConnectionService.findAllConnectionsByUserId(userId, userId, page, limit, search);
    }

    // if tag is hosted event, return attendees and participants
    const isHostedEvent = await isHostedEventByUser(tagId, userId);
    if (isHostedEvent) {
        return await getAttendeesAndParticipantsPaginatedForEvent(tagId, userId, { page, limit, search, order_by, order_direction });
    }

    // if tag is user-created tag, return customers
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

/** Get distinct emails for system tag ids (Network = userId, hosted-event = event ids). Used when sending email by tags that can include system tags. */
const getDistinctEmailsForSystemTagIds = async (userId: string, systemTagIds: string[]): Promise<string[]> => {
    const ids = (systemTagIds || []).filter(Boolean);
    if (ids.length === 0) return [];

    const allEmails: string[] = [];

    // Network tag
    if (ids.includes(userId)) {
        const connections = await UserNetwork.findAll({
            where: { user_id: userId, is_deleted: false },
            attributes: ['peer_id'],
            raw: true,
        });

        const peerIds = [...new Set(connections.map((c) => c.peer_id))];

        if (peerIds.length > 0) {
            const users = await User.findAll({
                where: { id: { [Op.in]: peerIds }, is_deleted: false },
                attributes: ['email'],
                raw: true,
            });
            
            users.forEach((u) => {
                if (u.email) allEmails.push(u.email);
            });
        }
    }

    // Hosted events tag
    const hostedEventIds = await Promise.all(ids.filter((id) => id !== userId).map((id) => isHostedEventByUser(id, userId).then((ok) => (ok ? id : null))));
    const eventIds = hostedEventIds.filter((id): id is string => id !== null);
    for (const eventId of eventIds) {
        const [attendees, participants] = await Promise.all([
            EventAttendee.findAll({ where: { event_id: eventId, is_deleted: false }, attributes: ['user_id'], raw: true }),
            EventParticipant.findAll({
                where: { event_id: eventId, role: { [Op.ne]: EventParticipantRole.HOST }, is_deleted: false },
                attributes: ['user_id'],
                raw: true,
            }),
        ]);

        const userIds = [...new Set([...attendees.map((a) => a.user_id), ...participants.map((p) => p.user_id)])];

        if (userIds.length > 0) {
            const users = await User.findAll({
                where: { id: { [Op.in]: userIds }, is_deleted: false },
                attributes: ['email'],
                raw: true,
            });

            users.forEach((u) => {
                if (u.email) allEmails.push(u.email);
            });
        }
    }

    return [...new Set(allEmails)];
};

/** Get distinct mobile numbers for system tag ids (Network = userId, hosted-event = event ids). Used when sending SMS by tags that can include system tags. */
const getDistinctMobilesForSystemTagIds = async (userId: string, systemTagIds: string[]): Promise<string[]> => {
    const ids = (systemTagIds || []).filter(Boolean);
    if (ids.length === 0) return [];

    const allMobiles: string[] = [];

    // Network tag
    if (ids.includes(userId)) {
        const connections = await UserNetwork.findAll({
            where: { user_id: userId, is_deleted: false },
            attributes: ['peer_id'],
            raw: true,
        });

        const peerIds = [...new Set(connections.map((c) => c.peer_id))];
        if (peerIds.length > 0) {
            const users = await User.findAll({
                where: { id: { [Op.in]: peerIds }, is_deleted: false },
                attributes: ['mobile'],
                raw: true,
            });

            users.forEach((u) => {
                if (u.mobile) allMobiles.push(u.mobile);
            });
        }
    }

    // Hosted events tag
    const hostedEventIds = await Promise.all(ids.filter((id) => id !== userId).map((id) => isHostedEventByUser(id, userId).then((ok) => (ok ? id : null))));
    const eventIds = hostedEventIds.filter((id): id is string => id !== null);
    for (const eventId of eventIds) {
        const [attendees, participants] = await Promise.all([
            EventAttendee.findAll({ where: { event_id: eventId, is_deleted: false }, attributes: ['user_id'], raw: true }),
            EventParticipant.findAll({
                where: { event_id: eventId, role: { [Op.ne]: EventParticipantRole.HOST }, is_deleted: false },
                attributes: ['user_id'],
                raw: true,
            }),
        ]);

        const userIds = [...new Set([...attendees.map((a) => a.user_id), ...participants.map((p) => p.user_id)])];

        if (userIds.length > 0) {
            const users = await User.findAll({
                where: { id: { [Op.in]: userIds }, is_deleted: false },
                attributes: ['mobile'],
                raw: true,
            });

            users.forEach((u) => {
                if (u.mobile) allMobiles.push(u.mobile);
            });
        }
    }

    return [...new Set(allMobiles)];
};

export default {
    deleteTag,
    createTag,
    updateTag,
    getTagById,
    isHostedEventByUser,
    getAllTagsPaginated,
    getHostedEventIdsForUser,
    getTagCustomersPaginated,
    getAssignableTagIdsForUser,
    getDistinctEmailsForSystemTagIds,
    getDistinctMobilesForSystemTagIds,
};
