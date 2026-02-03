import { IncludeOptions, Op, Sequelize, Transaction } from 'sequelize';
import FeedEvents from '../models/feed-events.model';
import FeedLiked from '../models/feed-liked.model';
import FeedMedia from '../models/feed-media.model';
import FeedMention from '../models/feed-mention.model';
import { Event, Feed, User, UserNetwork } from '../models/index';
import { MediaParams } from '../types/event.interfaces';
import { CreateFeedParams, FeedEventParams } from '../types/feed.interfaces';
import { includeDetails } from './event.service';

const eventAttributes = ['id', 'title', 'slug', 'description', 'address', 'latitude', 'longitude', 'city', 'state', 'country', 'category_id', 'is_paid_event', 'start_date', 'end_date', 'capacity', 'is_public', 'parent_event_id'];

const IncludeClause = [
    {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
    },
    {
        model: FeedMedia,
        as: 'medias',
        required: false,
        where: { is_deleted: false },
        attributes: ['id', 'media_url', 'media_type', 'order'],
    },
    {
        model: User,
        as: 'mentions',
        required: false,
        through: { attributes: [] },
        attributes: ['id', 'name', 'username', 'email', 'image_url', 'thumbnail_url'],
    }
];

const eventIncludeClause = [
    {
        model: Event,
        as: 'events',
        required: false,
        attributes: eventAttributes,
        where: { is_deleted: false },
        through: { attributes: [] },
        include: includeDetails,
    }
]

/** Check if user has liked specific feeds */
const checkUserLikedFeeds = async (feedIds: string[], userId: string | null): Promise<Set<string>> => {
    if (!userId || !feedIds || feedIds.length === 0) {
        return new Set<string>();
    }

    const likedFeeds = await FeedLiked.findAll({
        where: {
            feed_id: feedIds,
            user_id: userId,
            is_deleted: false,
        },
        attributes: ['feed_id'],
    });

    return new Set(likedFeeds.map((liked: FeedLiked) => liked.feed_id));
};

/** Transform feed object to include event_id arrays and is_like flag */
const transformFeedWithIds = (feed: Feed, isLiked: boolean = false) => {
    if (!feed) return feed;

    const feedJson = feed.toJSON ? feed.toJSON() : feed;

    return {
        ...feedJson,
        event_ids: feedJson.events?.map((event: Event) => event.id) || [],
        is_like: isLiked,
    };
};

/** Transform multiple feed objects to include IDs arrays and is_like flags */
const transformFeedsWithIds = async (feeds: Feed[], userId: string | null = null): Promise<any[]> => {
    if (!feeds || feeds.length === 0) return feeds;

    const feedIds = feeds.map(feed => feed.id);
    const likedFeedIds = await checkUserLikedFeeds(feedIds, userId);

    return feeds.map(feed => transformFeedWithIds(feed, likedFeedIds.has(feed.id)));
};

const createFeedMedias = async (
    feedId: string,
    medias: MediaParams[] | undefined,
    createdBy: string,
    transaction: Transaction
): Promise<void> => {
    if (medias && medias.length > 0) {
        const mediaRows = medias.map((m: MediaParams) => ({
            feed_id: feedId,
            media_url: m.media_url,
            media_type: m.media_type,
            order: m.order ?? 0,
            created_by: createdBy,
        }));
        await FeedMedia.bulkCreate(mediaRows, { transaction });
    }
};

/** Update event media */
const updateFeedMedias = async (
    feedId: string,
    medias: MediaParams[] | undefined,
    updatedBy: string,
    transaction: Transaction
): Promise<void> => {
    // Soft delete existing media
    await FeedMedia.update(
        {
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: updatedBy,
        },
        {
            where: { feed_id: feedId, is_deleted: false },
            transaction,
        }
    );

    // Create new media if provided
    if (medias && medias.length > 0) {
        await createFeedMedias(feedId, medias, updatedBy, transaction);
    }
};

const createFeedEvents = async (
    feedId: string,
    eventIds: string[],
    transaction: Transaction
): Promise<void> => {
    if (eventIds && eventIds.length > 0) {
        const feedEventParams: FeedEventParams[] = eventIds.map((eventId) => ({ feed_id: feedId, event_id: eventId }));
        await FeedEvents.bulkCreate(feedEventParams, { transaction });
    }
};

const createFeedMentions = async (
    feedId: string,
    mentionIds: string[] | undefined,
    mentionedBy: string,
    transaction: Transaction
): Promise<void> => {
    if (!(mentionIds && mentionIds.length > 0)) {
        return;
    }
    // Remove duplicates
    const uniqueMentionIds = [...new Set(mentionIds)];

    // Validate that mentioned users exist
    const users = await User.findAll({
        where: {
            id: uniqueMentionIds,
            is_deleted: false,
        },
        attributes: ['id'],
        transaction,
    });

    const validUserIds = users.map(user => user.id);

    if (validUserIds.length > 0) {
        const mentionRows = validUserIds.map((userId: string) => ({
            feed_id: feedId,
            user_id: userId,
            mentioned_by: mentionedBy,
            created_by: mentionedBy,
        }));
        await FeedMention.bulkCreate(mentionRows, { transaction });
    }
};

const updateFeedEvents = async (feedId: string, eventIds: string[], transaction: Transaction) => {
    await FeedEvents.destroy({
        where: { feed_id: feedId },
        transaction,
    });
    // Create new feed events if provided
    if (eventIds && eventIds.length > 0) {
        await createFeedEvents(feedId, eventIds, transaction);
    }
};

const updateFeedMentions = async (feedId: string, mentionIds: string[] | undefined, updatedBy: string, transaction: Transaction) => {
    await FeedMention.destroy({
        where: { feed_id: feedId },
        transaction,
    });
    // Create new feed mentions if provided
    if (mentionIds && mentionIds.length > 0) {
        await createFeedMentions(feedId, mentionIds, updatedBy, transaction);
    }
};

/** Get all network user IDs for a user (bidirectional) */
const getAllNetworkUserIds = async (userId: string): Promise<string[]> => {
    const connections = await UserNetwork.findAll({
        where: {
            [Op.or]: [
                { user_id: userId, is_deleted: false },
                { peer_id: userId, is_deleted: false }
            ]
        },
        attributes: ['user_id', 'peer_id'],
    });

    const networkUserIds = new Set<string>();
    connections.forEach(conn => {
        // Add peer_id if user_id is the current user
        if (conn.user_id === userId) {
            networkUserIds.add(conn.peer_id);
        }
        // Add user_id if peer_id is the current user
        if (conn.peer_id === userId) {
            networkUserIds.add(conn.user_id);
        }
    });

    return Array.from(networkUserIds);
};

const getAllFeeds = async (page: number = 1, limit: number = 10, isPublic?: boolean, authUserId?: string | null) => {
    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = { is_deleted: false };

    if (isPublic !== undefined) {
        whereClause.is_public = isPublic;
        
        // If requesting private feeds (is_public=false), filter by network connections
        if (!isPublic && authUserId) {
            // Get all network user IDs
            const networkUserIds = await getAllNetworkUserIds(authUserId);
            
            // Include the authenticated user's own feeds as well
            networkUserIds.push(authUserId);
            
            // Filter feeds to only include feeds from network users
            whereClause.user_id = { [Op.in]: networkUserIds };
        } else if (!isPublic && !authUserId) {
            // If user is not authenticated and requesting private feeds, return empty
            whereClause.id = { [Op.in]: [] };
        }
    }

    const { count, rows: feeds } = await Feed.findAndCountAll({
        where: whereClause,
        include: [...IncludeClause, ...eventIncludeClause],
        order: [['created_at', 'DESC']],
        distinct: true,
        limit: Number(limit),
        offset,
    });

    return {
        data: feeds,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

const getFeedById = async (id: string, userId: string | null = null, includeDetails: boolean = true, includeOtherDetails: boolean = false) => {

    const include: IncludeOptions[] = [];
    if (includeDetails) {
        include.push(...IncludeClause, ...eventIncludeClause);
    }

    const feed = await Feed.findOne({
        where: { id, is_deleted: false },
        include,
    });
    if (!feed) {
        return null;
    }

    if (!includeOtherDetails) {
        return feed;
    }

    const likedFeedIds = await checkUserLikedFeeds([feed.id], userId);
    return transformFeedWithIds(feed, likedFeedIds.has(feed.id));
};

const createFeed = async (data: CreateFeedParams, createdBy: string, transaction: Transaction) => {
    // Create feed
    const feed = await Feed.create({
        ...data,
        created_by: createdBy,
    }, { transaction });

    // Create feed medias
    if (data.medias && data.medias.length > 0) {
        await createFeedMedias(feed.id, data.medias, createdBy, transaction);
    }

    // Create feed events
    if (data.event_ids && data.event_ids.length > 0) {
        await createFeedEvents(feed.id, data.event_ids, transaction);
    }

    // Create feed mentions
    if (data.mention_ids && data.mention_ids.length > 0) {
        await createFeedMentions(feed.id, data.mention_ids, createdBy, transaction);
    }

    return feed;
};

const updateFeed = async (id: string, data: CreateFeedParams, updatedBy: string, transaction: Transaction) => {
    await Feed.update({
        ...data,
        updated_by: updatedBy,
    }, {
        where: { id, is_deleted: false },
    });

    // Update feed medias
    if (data.medias !== undefined) {
        await updateFeedMedias(id, data.medias, updatedBy, transaction);
    }

    // Update feed events
    if (data.event_ids !== undefined) {
        await updateFeedEvents(id, data.event_ids, transaction);
    }

    // Update feed mentions
    if (data.mention_ids !== undefined) {
        await updateFeedMentions(id, data.mention_ids, updatedBy, transaction);
    }
};

const deleteFeed = async (feed: Feed, deletedBy: string, transaction: Transaction) => {
    feed.is_deleted = true;
    feed.deleted_at = new Date();
    if (deletedBy !== undefined) {
        feed.deleted_by = deletedBy;
    }
    await feed.save({ transaction });
    return feed;
};

const findByUserId = async (userId: string, page: number = 1, limit: number = 10) => {
    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows: feeds } = await Feed.findAndCountAll({
        where: { user_id: userId, is_deleted: false },
        include: [...IncludeClause, ...eventIncludeClause],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        distinct: true,
    });

    return {
        data: feeds,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

const incrementFeedTotals = async (feedId: string, field: string, transaction?: Transaction) => {
    await Feed.increment(field, {
        where: { id: feedId, is_deleted: false },
        by: 1,
        silent: true,
        transaction
    });
};

const decrementFeedTotals = async (feedId: string, field: string, transaction?: Transaction) => {
    await Feed.increment(field, {
        where: {
            id: feedId,
            is_deleted: false,
            [Op.and]: [
                Sequelize.literal(`\`${field}\` > 0`)
            ]
        },
        by: -1,
        silent: true,
        transaction
    });
};

export default {
    getAllFeeds,
    getFeedById,
    createFeed,
    updateFeed,
    deleteFeed,
    findByUserId,
    transformFeedWithIds,
    transformFeedsWithIds,
    checkUserLikedFeeds,
    incrementFeedTotals,
    decrementFeedTotals,
};

