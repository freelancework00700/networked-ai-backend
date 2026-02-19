import { NextFunction, Request, Response } from "express";
import path from "path";
import Media from "../models/media.model";
import { sequelize } from "../server";
import mediaService from "../services/media.service";
import userSettingService from "../services/user-setting.service";
import userSocialService from "../services/user-social.service";
import userService from "../services/user.service";
import profileSubscriptionService from "../services/profile-subscription.service";
import { MediaContext, MediaType, MediaVariant } from "../types/enums";
import { UpdateUserPayload } from "../types/user.interfaces";
import { responseMessages } from "../utils/response-message.service";
import { verifyToken } from "../utils/crypto.service";
import { getFileMeta, removeMediaFile, resolveLocalPath } from "../utils/file.service";
import loggerService from "../utils/logger.service";
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse, sendUnauthorizedResponse } from "../utils/response.service";
import { generateThumbnail } from "../utils/thumbnail.util";
import env from "../utils/validate-env";
import { User, StripeProduct, Subscription } from "../models/index";

/**
 * Get user by ID
 * @route GET /api/users/:id
 */
export const getAllUsersPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search, orderBy, orderDirection } = req.query;
        const authenticatedUser = res.locals.auth?.user;

        const users = await userService.getAllUsersPaginated(Number(page), Number(limit), search as string, orderBy as string, orderDirection as string);
        if (!users.data.length) {
            return sendSuccessResponse(res, responseMessages.user.notFound, users);
        }

        // Add connection status to each user
        const usersWithStatus = await userService.addConnectionStatusToUsers(
            users.data.map((u: User) => u.toJSON ? u.toJSON() : u),
            authenticatedUser?.id || null
        );

        return sendSuccessResponse(res, responseMessages.user.retrieved, {
            ...users,
            data: usersWithStatus
        });
    } catch (error) {
        loggerService.error(`Error getting all users paginated: ${error}`);
        sendServerErrorResponse(res, responseMessages.user.failedToFetchSingle, error);
        next(error);
    }
};

/**
 * Update user profile
 * @route PUT /api/users/:id or PUT /api/users
 */
export const updateUser = async ( req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authUser = res.locals.auth?.user;
        if (!authUser.id) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.user.tokenInvalid);
        }
        const userId = req.body?.id || authUser.id;

        if (authUser.id !== userId && !authUser.is_admin) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.user.forbidden);
        }

        // Check if user exists
        const existingUser = await userService.findUserById(userId);
        if (!existingUser) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.user.notFoundSingle);
        }

        const {
            title,
            username,
            dob,
            address,
            name,
            mobile,
            email,
            account_type,
            company_name,
            description,
            college_university_name,
            latitude,
            longitude,
            image_url,
            settings,
            socials,
            vibe_ids = [],
            hobby_ids = [],
            interest_ids = []
        } = req.body;

        const updateData: UpdateUserPayload = {
            title,
            name,
            mobile,
            email,
            username,
            dob: dob ? new Date(dob) : null,
            description,
            address,
            latitude,
            longitude,
            company_name,
            college_university_name,
            image_url,
            thumbnail_url: "",
            account_type
        };

        let thumbnail_url: string | null = null;

        if (image_url) {
            // Generate thumbnail
            const { local, cleanup } = await resolveLocalPath(image_url, MediaContext.PROFILE);
            const thumbPath = await generateThumbnail(local, MediaContext.PROFILE);
            cleanup?.();

            if (thumbPath) {
                thumbnail_url = `${env.API_URL}/media/${MediaContext.PROFILE}/${path.basename(
                    thumbPath
                )}`;
                updateData.thumbnail_url = thumbnail_url;
            }

            // Remove old files
            if (existingUser.thumbnail_url) {
                removeMediaFile(existingUser.thumbnail_url);
            }

            // DB Media cleanup
            const mediaIds = await userService.getUserProfileByUserId(userId);
            await userService.deleteUserProfileByUserId(userId, transaction);
            await mediaService.deleteMedia(mediaIds, userId, transaction);

            const originalMeta = getFileMeta(image_url);
            const thumbMeta = thumbnail_url ? getFileMeta(thumbnail_url) : null;

            const mediaParams: Partial<Media>[] = [
                {
                    ...originalMeta,
                    type: MediaType.IMAGE,
                    context: MediaContext.PROFILE,
                    variant: MediaVariant.ORIGINAL
                },
                ...(thumbMeta
                    ? [
                        {
                            ...thumbMeta,
                            type: MediaType.IMAGE,
                            context: MediaContext.PROFILE,
                            variant: MediaVariant.THUMBNAIL
                        }
                    ]
                    : [])
            ];

            const createdMedia =
                await mediaService.createBulkMedia(
                    mediaParams as Media[],
                    authUser.id,
                    transaction
                );

            if (createdMedia.length) {
                await userService.createUserProfileBulk(
                    userId,
                    createdMedia.map((m: Media) => m.id),
                    transaction
                );
            }
        }

        // Update user
        await userService.updateUser(userId, updateData, authUser.id, transaction);

        // Update user settings
        if (settings) {
            await userSettingService.upsert(userId, settings, authUser.id, transaction);
        }

        // Update user socials
        if (socials) {
            await userSocialService.upsert(userId, socials, authUser.id, transaction);
        }

        // Update user vibes
        if (vibe_ids.length > 0) {
            await userService.createBulkUserVibe(userId, vibe_ids, transaction);
        }

        // Update user hobbies
        if (hobby_ids.length > 0) {
            await userService.createBulkUserHobby(userId, hobby_ids, transaction);
        }

        // Update user interests
            if (interest_ids.length > 0) {
            await userService.createBulkUserInterest(userId, interest_ids, transaction);
        }

        await transaction.commit();

        const userWithRelations = await userService.findUserByIdWithRelations(userId);
        const userJson = userWithRelations?.toJSON ? userWithRelations.toJSON() : userWithRelations;

        // Add connection status (user viewing their own profile)
        const userWithStatus = await userService.addConnectionStatusToUser(
            userJson,
            authUser.id
        );

        return sendSuccessResponse(res, responseMessages.user.updated, {
            user: userWithStatus
        });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating user: ${error}`);
        sendServerErrorResponse(res, responseMessages.user.failedToUpdate, error);
        next(error);
    }
};

/**
 * Soft delete user
 * @route DELETE /api/users/:id
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = req.params.id;
        const authenticatedUser = res.locals.auth?.user;

        // Check if user is trying to delete their own account or is admin
        if (authenticatedUser.id !== userId && !authenticatedUser.is_admin) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.user.forbidden);
        }

        // Check if user exists
        const existingUser = await userService.findUserById(userId as string);
        if (!existingUser) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.user.notFoundSingle);
        }

        // Check if user is already deleted
        if (existingUser.is_deleted) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.user.userAlreadyDeleted);
        }

        // Soft delete user
        await userService.softDeleteUser(userId as string, authenticatedUser.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.user.deleted);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting user: ${error}`);
        sendServerErrorResponse(res, responseMessages.user.failedToDelete, error);
        next(error);
    }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 */
export const getUserByIdOrUsername = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { value } = req.params;
        const authenticatedUser = res.locals.auth?.user;

        const user = await userService.findUserByIdOrUsername(value as string);
        if (!user) {
            return sendNotFoundResponse(res, responseMessages.user.notFoundSingle);
        }

        const userWithRelations = await userService.findUserByIdWithRelations(user.id);
        const userJson = userWithRelations?.toJSON ? userWithRelations.toJSON() : userWithRelations;

        // Run all independent queries in parallel for better performance
        const [userWithStatus, subscriptionPlanCount, subscriptionCount, notificationEnabled] = await Promise.all([
            // Add connection status
            userService.addConnectionStatusToUser(
                userJson,
                authenticatedUser?.id || null
            ),
            // Get active stripe products count for the user being queried
            StripeProduct.count({
                where: {
                    active: true,
                    user_id: user.id,
                    is_deleted: false,
                },
            }),
            // Check if authenticated user has subscribed to any plan of the queried user
            authenticatedUser?.id
                ? Subscription.count({
                      where: {
                          user_id: authenticatedUser.id,  // Authenticated user is the subscriber
                          owner_id: user.id,              // Queried user is the product owner
                          is_deleted: false,
                      },
                  })
                : Promise.resolve(0),
            // Check if authenticated user has profile subscription (notification) to this user
            authenticatedUser?.id
                ? profileSubscriptionService.hasSubscription(authenticatedUser.id, user.id)
                : Promise.resolve(false),
        ]);

        const hasSubscribed = subscriptionCount > 0;

        // Add subscriptionPlanCount, hasSubscribed, and notification_enabled to user object
        const userWithStripeInfo = {
            ...userWithStatus,
            has_subscribed: hasSubscribed,
            subscription_plan_count: subscriptionPlanCount,
            notification_enabled: notificationEnabled,
        };

        return sendSuccessResponse(res, responseMessages.user.retrievedSingle, {
            user: userWithStripeInfo,
        });
    } catch (error) {
        loggerService.error(`Error getting user: ${error}`);
        sendServerErrorResponse(res, responseMessages.user.failedToFetchSingle, error);
        next(error);
    }
};

/**
 * Check if user exists by username, email, or phone
 * If token is provided, checks if value matches current user first
 * Otherwise checks all three fields in database
 * @route GET /api/users/check/:value
 */
export const checkUserExists = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { value } = req.query;

        // Check if token is provided in header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            try {
                // Verify token and get authenticated user
                const decoded = verifyToken(token);
                if (decoded?.userId) {
                    const authenticatedUser = await userService.findUserById(decoded.userId);
                    if (authenticatedUser) {
                        // Check if the value matches current user's username, email, or mobile
                        const userData = authenticatedUser.toJSON ? authenticatedUser.toJSON() : authenticatedUser;
                        const matchesCurrentUser =
                            userData.username?.toLowerCase() === value?.toString().toLowerCase() ||
                            userData.email?.toLowerCase() === value?.toString().toLowerCase() ||
                            userData.mobile === value?.toString();

                        if (matchesCurrentUser) {
                            return res.json(false);
                        }
                    }
                }
            } catch (tokenError) {
                // If token is invalid, continue with normal flow
                loggerService.info(`Token verification failed, continuing with normal check: ${tokenError}`);
            }
        }

        // Check if user exists by username, email, or phone number
        const [userByUsername, userByEmail, userByPhone] = await Promise.all([
            userService.findUserByUsername(value?.toString() ?? ''),
            userService.findUserByEmail(value?.toString() ?? ''),
            userService.findUserByPhone(value?.toString() ?? '')
        ]);

        // Return true if user exists in any of the fields
        const userExists = !!(userByUsername || userByEmail || userByPhone);

        return res.json(userExists);
    } catch (error) {
        loggerService.error(`Error checking user: ${error}`);
        sendServerErrorResponse(res, responseMessages.user.failedToFetchSingle, error);
        next(error);
    }
};

/**
 * Search users by username, name (firstname/lastname), email, or mobile
 * Returns all matching user records
 * @route GET /api/users/search
 */
export const searchAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { value, page, limit } = req.query;
        const authenticatedUser = res.locals.auth?.user;

        if (!value || value?.toString().trim().length === 0) {
            return sendBadRequestResponse(res, responseMessages.user.valueRequired);
        }

        // Search users across all fields
        const result = await userService.searchUsers(value?.toString().trim() ?? '', Number(page) || 1, Number(limit) || 10);

        if (!result || result.data.length === 0) {
            return sendSuccessResponse(res, responseMessages.user.retrieved, {
                users: [],
                count: 0
            });
        }

        // Add connection status to each user
        const usersJson = result.data.map((u: User) => u.toJSON ? u.toJSON() : u);
        const usersWithStatus = await userService.addConnectionStatusToUsers(
            usersJson,
            authenticatedUser?.id || null,
            false
        );

        return sendSuccessResponse(res, responseMessages.user.retrieved, {
            ...result,
            data: usersWithStatus
        });
    } catch (error) {
        loggerService.error(`Error searching users: ${error}`);
        sendServerErrorResponse(res, responseMessages.user.failedToFetch, error);
        next(error);
    }
};

/**
 * Update user FCM token and location
 * @route PUT /api/users/fcm-token-location
 */
export const updateUserFcmTokenAndLocation = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authUserId = res.locals.auth?.user?.id;
        const { fcm_token, latitude, longitude } = req.body;

        // Check if user exists
        const existingUser = await userService.findUserById(authUserId);
        if (!existingUser) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.user.notFoundSingle);
        }

        // Update FCM token and location
        await userService.updateUserFcmTokenAndLocation(authUserId, fcm_token, latitude, longitude, authUserId, transaction);

        await transaction.commit();

        return sendSuccessResponse(res, responseMessages.user.updated);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating user FCM token and location: ${error}`);
        sendServerErrorResponse(res, responseMessages.user.failedToUpdate, error);
        next(error);
    }
};