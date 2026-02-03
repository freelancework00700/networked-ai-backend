import { Op, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { UserGamificationCategoryBadges, User, GamificationBadge } from '../models/index';
import gamificationCategoryService from './gamification-category.service';
import gamificationBadgeService from './gamification-badge.service';

const userAttributes = ['id', 'name', 'email', 'username', 'image_url', 'thumbnail_url', 'total_gamification_points', 'total_gamification_points_weekly'];
/** Create user gamification category badge entry. */
const createUserGamificationCategoryBadge = async (
    data: {
        user_id: string;
        gamification_category_id: string;
        gamification_badge_id: string;
        completed_date: Date | string;
    },
    transaction?: Transaction
) => {
    return await UserGamificationCategoryBadges.create(
        {
            id: uuidv4(),
            user_id: data.user_id,
            gamification_category_id: data.gamification_category_id,
            gamification_badge_id: data.gamification_badge_id,
            completed_date: data.completed_date,
        },
        { transaction }
    );
};

/**
 * Check user field value and award badge if count matches
 * @param userId - User ID
 * @param categoryId - Gamification category ID
 * @param fieldName - User field name (e.g., 'total_events_hosted', 'total_events_attended')
 * @param transaction - Optional transaction
 */
const checkAndAwardBadgeByField = async (
    userId: string,
    categoryId: string,
    fieldName: string,
    transaction?: Transaction
) => {
    // Get category
    const category = await gamificationCategoryService.getGamificationCategoryById(categoryId);
    if (!category) {
        throw new Error(`Category with id ${categoryId} not found`);
    }

    // Fetch user's field value (count, not points)
    const user = await User.findOne({
        where: { id: userId, is_deleted: false },
        attributes: [fieldName],
        transaction,
    });

    if (!user) {
        throw new Error(`User with id ${userId} not found`);
    }

    const fieldValue = (user as any)[fieldName] || 0;

    // Find badge with exact event_count match (using user's count, not earned_point)
    const badge = await GamificationBadge.findOne({
        where: {
            event_count: fieldValue,
            is_deleted: false,
        },
        transaction,
    });

    // No badge matches this count
    if (!badge) { return null; } // No badge matches this count

    // Check if entry already exists
    const existingEntry = await UserGamificationCategoryBadges.findOne({
        where: {
            user_id: userId,
            gamification_category_id: category.id,
            gamification_badge_id: badge.id,
        },
        transaction,
    });

    if (existingEntry) {
        // Badge already awarded
        return existingEntry;
    }

    // Create new badge entry with current date
    const newEntry = await createUserGamificationCategoryBadge(
        {
            user_id: userId,
            gamification_category_id: category.id,
            gamification_badge_id: badge.id,
            completed_date: new Date(),
        },
        transaction
    );

    return newEntry;
};

/**
 * Get user badge status for all three categories
 * @param userId - User ID
 * @param transaction - Optional transaction
 */
const getUserBadgeStatus = async (userId: string, transaction?: Transaction) => {
    // Field to category mapping
    const fieldCategoryMap: { [key: string]: string } = {
        'total_events_hosted': 'Host an Event',
        'total_events_attended': 'Attend an Event',
        'total_networks': 'Make a New Connection',
        'total_messages_sent': 'Send a Message',
        'total_qr_codes_scanned': 'Scan a QR Code',
    };

    // Get user's field values
    const user = await User.findOne({
        where: { id: userId, is_deleted: false },
        attributes: [
            'total_events_hosted',
            'total_events_attended',
            'total_networks',
            'total_messages_sent',
            'total_qr_codes_scanned',
        ],
        transaction,
    });

    if (!user) {
        throw new Error(`User with id ${userId} not found`);
    }

    // Get all badges ordered by event_count
    const allBadges = await gamificationBadgeService.getAllGamificationBadges();

    // Get all user's achieved badges
    const userAchievedBadges = await UserGamificationCategoryBadges.findAll({
        where: { user_id: userId },
        transaction,
    });

    // Create a map of achieved badges for quick lookup
    const achievedBadgeMap = new Map<string, { completed_date: Date }>();
    userAchievedBadges.forEach((entry) => {
        const key = `${entry.gamification_category_id}_${entry.gamification_badge_id}`;
        achievedBadgeMap.set(key, { completed_date: entry.completed_date });
    });

    // Helper to map user field name -> badge URL field
    const getBadgeUrlField = (fieldName: string): keyof GamificationBadge | null => {
        switch (fieldName) {
            case 'total_events_hosted':
                return 'event_hosted_url';
            case 'total_events_attended':
                return 'event_attended_url';
            case 'total_networks':
                return 'networks_url';
            case 'total_messages_sent':
                return 'messages_url';
            case 'total_qr_codes_scanned':
                return 'qr_url';
            default:
                return null;
        }
    };

    // Process each category
    const result: any = {};

    for (const [fieldName, categoryName] of Object.entries(fieldCategoryMap)) {
        const fieldValue = (user as any)[fieldName] || 0;

        // Get category
        const category = await gamificationCategoryService.getGamificationCategoryByName(categoryName);
        if (!category) {
            continue; // Skip if category not found
        }

        const urlField = getBadgeUrlField(fieldName);

        // Process all badges for this category
        const badges = allBadges.map((badge) => {
            const key = `${category.id}_${badge.id}`;
            const achieved = achievedBadgeMap.get(key);

            // Base badge object
            const badgeObj: any = {
                id: badge.id,
                event_count: badge.event_count,
                badge: badge.badge,
                title: badge.title,
                priority: badge.priority,
                is_locked: !achieved,
                completed_date: achieved?.completed_date || null,
            };

            // Add category-specific URL based on field name
            if (urlField) {
                if (badgeObj.is_locked) {
                    badgeObj.url = badge.locked_url;
                } else {
                    (badgeObj as any).url = (badge as any)[urlField];
                }
            }

            return badgeObj;
        });

        // Find next badge (first locked badge with event_count > current count)
        let nextBadgeCount: number | null = null;
        for (const badge of allBadges) {
            const key = `${category.id}_${badge.id}`;
            const achieved = achievedBadgeMap.get(key);

            if (!achieved && badge.event_count > fieldValue) {
                nextBadgeCount = badge.event_count;
                break;
            }
        }

        result[fieldName] = {
            category_id: category.id,
            category_name: category.category_name,
            current_count: fieldValue,
            next_badge_count: nextBadgeCount,
            badges,
        };
    }

    return result;
};

/**
 * Get gamification leaderboard (weekly and all-time) with current user rank
 * @param currentUserId - Current user ID to calculate rank
 * @param transaction - Optional transaction
 */
const getGamificationLeaderboard = async (currentUserId?: string, transaction?: Transaction) => {
    // Get top 20 users by weekly points
    const topWeeklyUsers = await User.findAll({
        where: {
            is_deleted: false,
        },
        attributes: userAttributes,
        order: [['total_gamification_points_weekly', 'DESC']],
        limit: 20,
        transaction,
    });

    // Get top 20 users by total points
    const topTotalUsers = await User.findAll({
        where: {
            is_deleted: false,
        },
        attributes: userAttributes,
        order: [['total_gamification_points', 'DESC']],
        limit: 20,
        transaction,
    });

    // Format weekly leaderboard
    const weeklyLeaderboard = topWeeklyUsers.map((user, index) => ({
        id: user.id,
        rank: index + 1,
        name: user.name,
        email: user.email,
        username: user.username,
        image_url: user.image_url,
        thumbnail_url: user.thumbnail_url,
        is_current_user: user.id === currentUserId,
        points: user.total_gamification_points_weekly || 0,
    }));

    // Format total leaderboard
    const totalLeaderboard = topTotalUsers.map((user, index) => ({
        rank: index + 1,
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        image_url: user.image_url,
        thumbnail_url: user.thumbnail_url,
        is_current_user: user.id === currentUserId,
        points: user.total_gamification_points || 0,
    }));

    // Get current user data and calculate ranks
    let currentUserWeekly: any = null;
    let currentUserAlltime: any = null;

    if (currentUserId) {
        const currentUser = await User.findOne({
            where: {
                id: currentUserId,
                is_deleted: false,
            },
            attributes: userAttributes,
            transaction,
        });

        if (currentUser) {
            // Calculate weekly rank
            const usersWithHigherWeeklyPoints = await User.count({
                where: {
                    is_deleted: false,
                    total_gamification_points_weekly: {
                        [Op.gt]: currentUser.total_gamification_points_weekly || 0,
                    },
                },
                transaction,
            });
            const weeklyRank = usersWithHigherWeeklyPoints + 1;

            // Calculate total rank
            const usersWithHigherTotalPoints = await User.count({
                where: {
                    is_deleted: false,
                    total_gamification_points: {
                        [Op.gt]: currentUser.total_gamification_points || 0,
                    },
                },
                transaction,
            });
            const totalRank = usersWithHigherTotalPoints + 1;

            // Format current user for weekly
            currentUserWeekly = {
                id: currentUser.id,
                rank: weeklyRank,
                name: currentUser.name,
                email: currentUser.email,
                username: currentUser.username,
                image_url: currentUser.image_url,
                thumbnail_url: currentUser.thumbnail_url,
                points: currentUser.total_gamification_points_weekly || 0,
                is_current_user: true,
            };

            // Format current user for alltime
            currentUserAlltime = {
                id: currentUser.id,
                rank: totalRank,
                name: currentUser.name,
                email: currentUser.email,
                username: currentUser.username,
                image_url: currentUser.image_url,
                thumbnail_url: currentUser.thumbnail_url,
                points: currentUser.total_gamification_points || 0,
                is_current_user: true,
            };
        }
    }

    return {
        weekly: {
            leaderboard: weeklyLeaderboard,
            current_user: currentUserWeekly,
        },
        alltime: {
            leaderboard: totalLeaderboard,
            current_user: currentUserAlltime,
        },
    };
};

export default {
    createUserGamificationCategoryBadge,
    checkAndAwardBadgeByField,
    getUserBadgeStatus,
    getGamificationLeaderboard,
};

