import { Op, Sequelize } from 'sequelize';
import { BlockedUser, Hobby, Interest, User, UserNetwork, UserRequest, UserSetting, Vibe } from '../models/index';
import { UserResult } from '../types/common-interfaces';
import { NetworkCategory, UserRequestStatus } from '../types/enums';
const userAttributes = ['id', 'dob', 'description', 'title', 'name', 'email', 'username', 'mobile', 'account_type', 'company_name', 'address', 'latitude', 'longitude', 'image_url', 'thumbnail_url', 'total_networks', 'total_events_hosted', 'total_events_staffed', 'total_events_spoken', 'total_events_cohosted', 'total_events_sponsored', 'total_events_attended', 'total_gamification_points', 'updated_at'];

const includeClause = [
    {
        model: Vibe,
        as: 'vibes',
        required: false,
        attributes: ['id', 'name', 'icon', 'description'],
        where: { is_deleted: false },
        through: { attributes: [] }
    },
    {
        model: Interest,
        as: 'interests',
        required: false,
        attributes: ['id', 'name', 'icon', 'description'],
        where: { is_deleted: false },
        through: { attributes: [] }
    },
    {
        model: Hobby,
        as: 'hobbies',
        required: false,
        attributes: ['id', 'name', 'icon', 'description'],
        where: { is_deleted: false },
        through: { attributes: [] }
    }
];

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (
        [lat1, lon1, lat2, lon2].some(v => typeof v !== 'number' || isNaN(v))
    ) {
        return Infinity;
    }

    const R = 3959; // miles
    const toRad = (v: number) => (v * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


/**
 * Get excluded user IDs
 */
const getExcludedUserIds = async (userId: string): Promise<string[]> => {
    const [blockedUsers, networks, pendingRequests] = await Promise.all([
        BlockedUser.findAll({
            where: {
                is_deleted: false,
                [Op.or]: [{ user_id: userId }, { peer_id: userId }]
            },
            attributes: ['user_id', 'peer_id'],
        }),

        UserNetwork.findAll({
            where: {
                is_deleted: false,
                [Op.or]: [{ user_id: userId }, { peer_id: userId }]
            },
            attributes: ['user_id', 'peer_id'],
        }),

        UserRequest.findAll({
            where: {
                is_deleted: false,
                status: UserRequestStatus.PENDING,
                [Op.or]: [{ sender_id: userId }, { receiver_id: userId }]
            },
            attributes: ['sender_id', 'receiver_id'],
        })
    ]);

    const excludedIds = new Set<string>([userId]);

    const addPair = (a?: string, b?: string) => {
        if (a) excludedIds.add(a);
        if (b) excludedIds.add(b);
    };

    blockedUsers.forEach(u => addPair(u.user_id, u.peer_id));
    networks.forEach(n => addPair(n.user_id, n.peer_id));
    pendingRequests.forEach(r => addPair(r.sender_id, r.receiver_id));

    return [...excludedIds];
};

/**
 * Get user's vibes, interests, and hobbies IDs
 */
const getUserPreferences = async (userId: string) => {
    const user = await User.findOne({
        where: { id: userId, is_deleted: false },
        include: includeClause
    });

    if (!user) {
        return { vibes: [], interests: [], hobbies: [] };
    }

    return {
        vibes: (user.vibes || []).map((v: Vibe) => v.id),
        interests: (user.interests || []).map((i: Interest) => i.id),
        hobbies: (user.hobbies || []).map((h: Hobby) => h.id)
    };
};

/**
 * Check if user has preference matches
 */
const hasPreferenceMatches = (
    user: User,
    userVibes: string[],
    userInterests: string[],
    userHobbies: string[],
    requiredMatchCount?: number
): boolean => {
    const peerVibes = new Set((user.vibes || []).map((v: Vibe) => v.id));
    const peerInterests = new Set((user.interests || []).map((i: Interest) => i.id));
    const peerHobbies = new Set((user.hobbies || []).map((h: Hobby) => h.id));

    const matches = [
        userVibes.some(v => peerVibes.has(v)),
        userInterests.some(i => peerInterests.has(i)),
        userHobbies.some(h => peerHobbies.has(h))
    ].filter(Boolean).length;

    return requiredMatchCount
        ? matches >= requiredMatchCount
        : matches === 3;
};

/**
 * Check if user is within radius
 */
const isWithinRadius = (
    baseLat: number,
    baseLon: number,
    user: User,
    radiusMiles: number
): number | null => {
    if (!user.latitude || !user.longitude) return null;

    const lat = Number(user.latitude);
    const lon = Number(user.longitude);

    if (!lat || !lon) return null;

    const distance = calculateDistance(baseLat, baseLon, lat, lon);
    return distance <= radiusMiles ? distance : null;
};

/**
 * Get users by specific criteria
 */
const getUsersByCriteria = async (
    latitude: number,
    longitude: number,
    radiusMiles: number,
    excludedIds: string[],
    userVibes: string[],
    userInterests: string[],
    userHobbies: string[],
    options: {
        requireLocation: boolean;
        requireAllPreferences: boolean;
    },
    limit: number,
    category: NetworkCategory
): Promise<UserResult[]> => {

    const where: any = {
        is_deleted: false,
        id: { [Op.notIn]: excludedIds }
    };

    // If location is required, add the where clause to the query
    if (options.requireLocation) {
        const latDelta = radiusMiles / 69;
        const lonDelta = radiusMiles / (69 * Math.cos(latitude * Math.PI / 180));

        where[Op.and] = [
            Sequelize.where(
                Sequelize.cast(Sequelize.col('User.latitude'), 'DECIMAL(10,6)'),
                { [Op.between]: [latitude - latDelta, latitude + latDelta] }
            ),
            Sequelize.where(
                Sequelize.cast(Sequelize.col('User.longitude'), 'DECIMAL(10,6)'),
                { [Op.between]: [longitude - lonDelta, longitude + lonDelta] }
            )
        ];
    }

    // Get users by the where clause and the limit
    const users = await User.findAll({
        where,
        include: includeClause,
        attributes: userAttributes,
        order: [['updated_at', 'DESC']],
        limit: limit * 2
    });

    const results: UserResult[] = [];

    for (const user of users) {
        if (options.requireLocation && user.settings?.hide_location) continue;

        const distance = options.requireLocation
            ? isWithinRadius(latitude, longitude, user, radiusMiles)
            : 0;

        if (options.requireLocation) {
            if (distance === null) continue;
            if (distance > radiusMiles) continue;
        }

        if (options.requireAllPreferences && !hasPreferenceMatches(user, userVibes, userInterests, userHobbies)) {
            continue;
        }

        results.push({ user, distance: distance ?? 0, category });
        if (results.length >= limit) break;
    }

    return results;
};

/**
 * Get users with preference matches
 */
const getUsersByPreferenceMatches = async (
    excludedIds: string[],
    userVibes: string[],
    userInterests: string[],
    userHobbies: string[],
    matchCount: 1 | 2 | 3,
    limit: number,
    category: NetworkCategory
): Promise<UserResult[]> => {

    const users = await User.findAll({
        where: {
            is_deleted: false,
            id: { [Op.notIn]: excludedIds }
        },
        attributes: userAttributes,
        include: includeClause,
        order: [['updated_at', 'DESC']],
        limit: limit * 3
    });

    const results: UserResult[] = [];

    for (const user of users) {
        if (
            hasPreferenceMatches(
                user,
                userVibes,
                userInterests,
                userHobbies,
                matchCount
            )
        ) {
            results.push({ user, distance: 0, category });
            if (results.length >= limit) break;
        }
    }

    return results;
};

/**
 * Get random users
 */
const getRandomUsers = async (
    excludedIds: string[],
    limit: number,
    category: NetworkCategory
): Promise<UserResult[]> => {

    const users = await User.findAll({
        where: {
            is_deleted: false,
            id: { [Op.notIn]: excludedIds }
        },
        attributes: userAttributes,
        include: includeClause,
        limit: limit * 2
    });

    return users
        .sort(() => Math.random() - 0.5)
        .slice(0, limit)
        .map<UserResult>(user => ({ user, distance: 0, category }));
};

/**
 * Find people you might know with cascading priority fill
 */
export const findPeopleYouMightKnow = async (
    userId: string,
    latitude: number,
    longitude: number,
    radiusMiles = 10,
    limit = 10
) => {
    const { vibes, interests, hobbies } = await getUserPreferences(userId);
    const excludedIds = await getExcludedUserIds(userId);

    const results: UserResult[] = [];

    const fill = async (
        fetcher: () => Promise<UserResult[]>
    ) => {
        if (results.length >= limit) return;
        const users = await fetcher();
        users.forEach(u => excludedIds.push(u.user.id));
        results.push(...users);
    };

    // Priority 1: Same location + All preferences
    await fill(() =>
        getUsersByCriteria(
            latitude,
            longitude,
            radiusMiles,
            excludedIds,
            vibes,
            interests,
            hobbies,
            { requireLocation: true, requireAllPreferences: true },
            limit - results.length,
            NetworkCategory.SAME_LOCATION_ALL_PREFERENCES
        )
    );

    // Priority 2: Same location only
    await fill(() =>
        getUsersByCriteria(
            latitude,
            longitude,
            radiusMiles,
            excludedIds,
            vibes,
            interests,
            hobbies,
            { requireLocation: true, requireAllPreferences: false },
            limit - results.length,
            NetworkCategory.SAME_LOCATION
        )
    );

    // Priority 3a: All 3 preferences match
    await fill(() =>
        getUsersByPreferenceMatches(
            excludedIds,
            vibes,
            interests,
            hobbies,
            3,
            limit - results.length,
            NetworkCategory.ALL_PREFERENCES_MATCH
        )
    );

    // Priority 3b: 2 preferences match
    await fill(() =>
        getUsersByPreferenceMatches(
            excludedIds,
            vibes,
            interests,
            hobbies,
            2,
            limit - results.length,
            NetworkCategory.TWO_PREFERENCES_MATCH
        )
    );

    // Priority 3c: 1 preference matches
    await fill(() =>
        getUsersByPreferenceMatches(
            excludedIds,
            vibes,
            interests,
            hobbies,
            1,
            limit - results.length,
            NetworkCategory.ONE_PREFERENCE_MATCH
        )
    );

    // Priority 4: Random users
    await fill(() => getRandomUsers(excludedIds, limit - results.length, NetworkCategory.RANDOM));

    // Transform to response format
    return results.map(({ user, distance, category }) => {

        let finalDistance: number | null = null;
        // If distance is already calculated, use it
        if (distance > 0 && Number.isFinite(distance)) {
            finalDistance = distance;
        } else if (distance === 0 && user.latitude && user.longitude) {
            // If distance is not calculated, calculate it
            const userLat = Number(user.latitude);
            const userLon = Number(user.longitude);

            if (Number.isFinite(userLat) && Number.isFinite(userLon)) {
                const d = calculateDistance(latitude, longitude, userLat, userLon);
                if (Number.isFinite(d) && d !== Infinity) {
                    finalDistance = d;
                }
            }
        }

        return {
            ...user.toJSON(),
            category,
            distance: finalDistance !== null ? Math.round(finalDistance * 10) / 10 : null,
        };
    });
};

/**
 * Find networks within radius
 */
export const findNetworksWithinRadius = async (
    userId: string,
    latitude: number,
    longitude: number,
    radiusMiles: number = 10,
) => {
    const userNetworks = await UserNetwork.findAll({
        attributes: [],
        where: {
            user_id: userId,
            is_deleted: false
        },
        include: [
            {
                model: User,
                as: 'peer',
                required: true,
                where: { is_deleted: false },
                attributes: userAttributes,
            }
        ],
        order: [['updated_at', 'DESC']]
    });

    // Filter networks by location within radius
    const networksInRadius = userNetworks
        .map(network => {
            const peer = network.peer;
            if (!peer || !peer.latitude || !peer.longitude) {
                return null;
            }

            const peerLat = parseFloat(peer.latitude);
            const peerLon = parseFloat(peer.longitude);
            const distance = calculateDistance(latitude, longitude, peerLat, peerLon);

            if (distance > radiusMiles) return null;

            return { network, distance };
        }).filter(Boolean) as Array<{ network: UserNetwork; distance: number }>;

    // Sort by distance (closest first)
    networksInRadius.sort((a, b) => a.distance - b.distance);

    return networksInRadius.map(({ network, distance }) => {
        const peer = network.peer;
        return {
            ...peer.toJSON(),
            distance: Math.round(distance * 10) / 10
        };
    });
};

export default {
    findPeopleYouMightKnow,
    findNetworksWithinRadius
};