import { Op, Sequelize, Transaction } from 'sequelize';
import { Hobby, Interest, User, UserHobby, UserInterest, UserNetwork, UserProfile, UserRequest, UserSetting, UserSocial, UserVibe, Vibe } from '../models/index';
import { ConnectionStatus, UserRequestStatus } from '../types/enums';
import { RegisterUserPayload, UpdateUserPayload } from '../types/user.interfaces';
import { compareAsync, verifyToken } from '../utils/crypto.service';
import { responseMessages } from '../utils/response-message.service';
import verificationService from './verification.service';

const userAttributes = ['id', 'name', 'email', 'mobile', 'username', 'image_url', 'thumbnail_url', 'total_gamification_points', 'total_gamification_points_weekly', 'company_name'];
const masterAttributes = ['id', 'name', 'icon', 'description'];

const findUserByEmail = async (email: string) => {
    return await User.findOne({ where: { email, is_deleted: false }, attributes: [...userAttributes, 'password'] });
};

const findUserByPhone = async (phoneNumber: string) => {
    return await User.findOne({ where: { mobile: phoneNumber, is_deleted: false }, attributes: userAttributes });
};

const findUserByUsername = async (username: string) => {
    return await User.findOne({ where: { username, is_deleted: false }, attributes: userAttributes });
};

const findUserByFirebaseUid = async (firebaseUid: string) => {
    return await User.findOne({ where: { firebase_uid: firebaseUid, is_deleted: false }, attributes: userAttributes });
};

const findUserByEmailOrPhone = async (email: string | null, phoneNumber: string | null) => {
    return await User.findOne({
        where:
        {
            [Op.or]: [
                { ...(email && { email }) },
                { ...(phoneNumber && { mobile: phoneNumber }) }],
            is_deleted: false
        },
        attributes: userAttributes
    });
};

const findUserById = async (userId: string) => {
    return await User.findOne({ where: { id: userId, is_deleted: false }, attributes: [...userAttributes, 'latitude', 'longitude', 'password', 'stripe_account_id', 'stripe_customer_id', 'stripe_account_status'] });
};

const findUserByIdWithRelations = async (userId: string) => {
    const user = await User.findOne({
        where: { id: userId, is_deleted: false },
        include: [
            { model: UserSetting, as: 'settings' },
            { model: UserSocial, as: 'socials' },
            {
                model: Vibe,
                as: 'vibes',
                required: false,
                attributes: masterAttributes,
                where: { is_deleted: false },
                through: { attributes: [] },
            },
            {
                model: Hobby,
                as: 'hobbies',
                required: false,
                attributes: masterAttributes,
                where: { is_deleted: false },
                through: { attributes: [] },
            },
            {
                model: Interest,
                as: 'interests',
                required: false,
                attributes: masterAttributes,
                where: { is_deleted: false },
                through: { attributes: [] },
            }
        ]
    });

    return user ? transformUserWithIds(user) : null;
};

const updateFirebaseUid = async (userId: string, firebaseUid: string) => {
    await User.update(
        { firebase_uid: firebaseUid },
        { where: { id: userId } }
    );
};

const findUserByIdOrUsername = async (text: string) => {
    return await User.findOne({
        where: {
            [Op.or]: [{ id: text }, { username: text }],
            is_deleted: false
        }
    });
};

/** Generate a unique username */
const generateUsername = async (email?: string | null, mobile?: string | null, name?: string | null, firebaseUid?: string | null): Promise<string> => {
    const nowSuffix = Date.now().toString().slice(-6);

    if (email) {
        const baseFromEmail = email.trim().split('@')[0];
        if (baseFromEmail && baseFromEmail.length >= 3) {
            return `${baseFromEmail}${nowSuffix}`;
        }
    }
    
    if (mobile) {
        const cleanMobile = mobile.trim().replace(/\D/g, '').slice(-6);
        if (cleanMobile.length >= 4) {
            return `user${cleanMobile}${nowSuffix}`;
        }
    }

    if (name) {
        const username = name.trim().toLowerCase().replace(/\s+/g, '');
        const user = await findUserByUsername(username);
        if (user) {
            return `${username}${nowSuffix}`;
        }
        return username;
    }

    if (firebaseUid) {
        return `user${firebaseUid.trim().slice(0, 6)}${nowSuffix}`;
    }

    // Fallback to random string
    return `user${nowSuffix}`;
};

const createUserWithFirebaseUid = async (firebaseUid: string, email?: string | null, mobile?: string | null, name?: string | null, fcm_token?: string | null) => {
    const username = await generateUsername(email, mobile, name, firebaseUid);

    return await User.create({
        firebase_uid: firebaseUid,
        email: email || `${firebaseUid}@firebase.local`,
        name: name || null,
        mobile: mobile || null,
        username,
        fcm_tokens: fcm_token || null,
    });
};

const updateUser = async (userId: string, updateData: UpdateUserPayload, updatedBy?: string | null, transaction?: Transaction) => {
    await User.update(
        {
            ...updateData,
            updated_at: new Date(),
            ...(updatedBy && { updated_by: updatedBy })
        },
        { where: { id: userId, is_deleted: false }, transaction, individualHooks: true }
    );
};

const softDeleteUser = async (userId: string, deletedBy?: string, transaction?: Transaction) => {
    await User.update(
        { is_deleted: true, deleted_at: new Date(), deleted_by: deletedBy },
        { where: { id: userId }, transaction }
    );
};

const searchUsers = async (searchTerm: string, page: number = 1, limit: number = 10) => {
    const offset = (Number(page) - 1) * Number(limit);
    const searchPattern = `%${searchTerm}%`;

    const { count, rows: users } = await User.findAndCountAll({
        attributes: [...userAttributes, 'total_gamification_points', 'company_name'],
        where: {
            is_deleted: false,
            [Op.or]: [
                { name: { [Op.like]: searchPattern } },
                { username: { [Op.like]: searchPattern } },
                { email: { [Op.like]: searchPattern } },
                { mobile: { [Op.like]: searchPattern } }
            ]
        },
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
    });
    return {
        data: users,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};


/** Create a new user */
const createUser = async (userData: RegisterUserPayload, createdBy?: string | null, transaction?: Transaction) => {
    // Always generate username since it's required and not part of RegisterUserPayload
    const username = await generateUsername(userData.email, userData.mobile);
    
    return await User.create({
        ...userData,
        username,
        ...(createdBy && { created_by: createdBy }),
    }, { transaction });
};


/** Create multiple UserMedia records in bulk */
const createUserProfileBulk = async (userId: string, mediaIds: string[], transaction?: Transaction) => {
    if (!mediaIds || mediaIds.length === 0) return [];

    const records = mediaIds.map(mediaId => ({
        user_id: userId,
        media_id: mediaId,
    }));

    const created = await UserProfile.bulkCreate(records, { transaction });
    return created.map((um: UserProfile) => um.toJSON());
};

/** Get UserProfile records by user ID */
const getUserProfileByUserId = async (userId: string) => {
    const userProfiles = await UserProfile.findAll({
        attributes: ['media_id'],
        where: { user_id: userId },
    });
    return userProfiles.map((up: UserProfile) => up.media_id) || [];
};

/** Delete UserProfile records by user ID */
const deleteUserProfileByUserId = async (userId: string, transaction?: Transaction) => {
    return await UserProfile.destroy({
        where: { user_id: userId },
        transaction,
    });
};

/** Login with email and password */
const loginWithEmailAndPassword = async (email: string, password: string) => {
    const user = await findUserByEmail(email);
    if (!user) {
        return { error: responseMessages.authentication.invalidEmailOrPassword } as const;
    }
    if (user.is_deleted) {
        return { error: responseMessages.authentication.accountDeleted } as const;
    }
    const userPassword = user.password;
    if (!userPassword) {
        return { error: responseMessages.authentication.passwordNotSet } as const;
    }
    const isPasswordValid = await compareAsync(password, userPassword);
    if (!isPasswordValid) {
        return { error: responseMessages.authentication.invalidEmailOrPassword } as const;
    }
    return { user, isNewUser: false } as const;
};

/** Login with mobile and OTP */
const loginWithMobileAndOtp = async (mobile: string, otp: string) => {
    const isValidOTP = await verificationService.verifyOTP({ mobile, code: otp });
    if (!isValidOTP) {
        return { error: responseMessages.authentication.invalidOrExpiredOTP } as const;
    }

    const user = await findUserByPhone(mobile);
    if (!user) {
        return { error: responseMessages.authentication.userNotFoundWithMobile } as const;
    }
    if (user.is_deleted) {
        return { error: responseMessages.authentication.accountDeleted } as const;
    }
    return { user, isNewUser: false } as const;
};

/** Login with bearer token */
const handleBearerTokenLogin = async (bearer_token: string) => {
    const decodedToken = verifyToken(bearer_token);
    if (!decodedToken) {
        return { error: responseMessages.user.tokenInvalid } as const;
    }
    const user = await findUserById(decodedToken.userId);
    if (!user) {
        return { error: responseMessages.user.notFoundSingle } as const;
    }
    return { user, isNewUser: false } as const;
};

/** Create bulk user vibes */
const createBulkUserVibe = async (userId: string, vibeIds: string[], transaction?: Transaction) => {
    try {
        if (!vibeIds || vibeIds.length === 0) return [];

        // Delete existing user vibes
        await UserVibe.destroy({
            where: { user_id: userId },
            transaction,
        });

        // Create new user vibes
        const userVibeParams = vibeIds.map(vibeId => ({
            user_id: userId,
            vibe_id: vibeId,
        }));
        return await UserVibe.bulkCreate(userVibeParams, { transaction });
    } catch (error) {
        throw error;
    }
};

/** Create bulk user hobbies */
const createBulkUserHobby = async (userId: string, hobbyIds: string[], transaction?: Transaction) => {
    try {
        if (!hobbyIds || hobbyIds.length === 0) return [];

        // Delete existing user hobbies
        await UserHobby.destroy({
            where: { user_id: userId },
            transaction,
        });

        // Create new user hobbies
        const userHobbyParams = hobbyIds.map(hobbyId => ({
            user_id: userId,
            hobby_id: hobbyId,
        }));
        return await UserHobby.bulkCreate(userHobbyParams, { transaction });
    } catch (error) {
        throw error;
    }

};

/** Create bulk user interests */
const createBulkUserInterest = async (userId: string, interestIds: string[], transaction?: Transaction) => {
    try {
        if (!interestIds || interestIds.length === 0) return [];

        // Delete existing user interests
        await UserInterest.destroy({
            where: { user_id: userId },
            transaction,
        });

        // Create new user interests
        const userInterestParams = interestIds.map(interestId => ({
            user_id: userId,
            interest_id: interestId,
        }));
        return await UserInterest.bulkCreate(userInterestParams, { transaction });
    } catch (error) {
        throw error;
    }
};

/** Get all users with pagination, search and sorting */
const getAllUsersPaginated = async (page: number = 1, limit: number = 10, search: string = '', orderBy: string = 'created_at', orderDirection: string = 'DESC') => {
    const whereClause: any = { is_deleted: false };
    const offset = (Number(page) - 1) * Number(limit);

    // Search by name, email, mobile, or username
    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { mobile: { [Op.like]: `%${search}%` } },
            { username: { [Op.like]: `%${search}%` } }
        ];
    }

    // Sort by orderBy and orderDirection
    const order: [string, 'ASC' | 'DESC'][] = [[orderBy, orderDirection as 'ASC' | 'DESC']];

    const { count, rows: users } = await User.findAndCountAll({
        // attributes: userAttributes,
        include: [
            { model: UserSetting, as: 'settings' },
            { model: UserSocial, as: 'socials' },
            {
                model: Vibe,
                as: 'vibes',
                required: false,
                attributes: masterAttributes,
                where: { is_deleted: false },
                through: { attributes: [] },
            },
            {
                model: Hobby,
                as: 'hobbies',
                required: false,
                attributes: masterAttributes,
                where: { is_deleted: false },
                through: { attributes: [] },
            },
            {
                model: Interest,
                as: 'interests',
                required: false,
                attributes: masterAttributes,
                where: { is_deleted: false },
                through: { attributes: [] },
            }
        ],
        where: whereClause,
        distinct: true,
        order,
        limit: Number(limit),
        offset,
    });
    
    // Transform users to include vibeIds, hobbyIds, and interestIds
    const transformedUsers = transformUsersWithIds(users);
    
    return {
        data: transformedUsers,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Combine FCM tokens */
const combineFcmTokens = (user: User, fcm_token: string) => {
    const tokens = user.fcm_tokens?.split(',') || [];
    if (!tokens.includes(fcm_token)) {
        tokens.push(fcm_token);
    }
    return tokens.join(',');
};

/** Update FCM tokens with max 5 unique tokens (FIFO) */
const updateFcmTokens = (user: User, fcm_token: string): string => {
    if (!fcm_token || fcm_token.trim() === '') {
        return user.fcm_tokens || '';
    }

    const token = fcm_token.trim();
    const existingTokens = user.fcm_tokens?.split(',').filter(t => t.trim() !== '') || [];
    
    // Remove the token if it already exists (to move it to the end)
    const tokensWithoutCurrent = existingTokens.filter(t => t.trim() !== token);
    
    // Add the new token at the end
    const updatedTokens = [...tokensWithoutCurrent, token];
    
    // Keep only the last 5 tokens (FIFO - remove oldest)
    const maxTokens = 5;
    const finalTokens = updatedTokens.slice(-maxTokens);
    
    return finalTokens.join(',');
};

/** Update user FCM token and location */
const updateUserFcmTokenAndLocation = async (
    userId: string,
    fcm_token?: string | null,
    latitude?: string | null,
    longitude?: string | null,
    updatedBy?: string | null,
    transaction?: Transaction
) => {
    const user = await findUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const updateData: any = {
        updated_at: new Date(),
        ...(updatedBy && { updated_by: updatedBy })
    };

    // Update FCM token if provided
    if (fcm_token !== undefined && fcm_token !== null) {
        updateData.fcm_tokens = updateFcmTokens(user, fcm_token);
    }

    // Update location if provided
    if (latitude !== undefined && latitude !== null) {
        updateData.latitude = latitude;
    }

    if (longitude !== undefined && longitude !== null) {
        updateData.longitude = longitude;
    }

    await User.update(
        updateData,
        { where: { id: userId, is_deleted: false }, transaction, individualHooks: true }
    );
};

/** Get connection status between authenticated user and target user */
const getConnectionStatus = async (authenticatedUserId: string, targetUserId: string, transaction?: Transaction): Promise<ConnectionStatus> => {
    // Skip if same user
    if (authenticatedUserId === targetUserId) {
        return ConnectionStatus.NOT_CONNECTED;
    }

    // Check if connected in UserNetwork (check either direction since connections are bidirectional)
    const connection = await UserNetwork.findOne({
        where: {
            [Op.or]: [
                {
                    user_id: authenticatedUserId,
                    peer_id: targetUserId,
                    is_deleted: false
                },
                {
                    user_id: targetUserId,
                    peer_id: authenticatedUserId,
                    is_deleted: false
                }
            ]
        },
        transaction
    });

    // If connection exists, they are connected
    if (connection) {
        return ConnectionStatus.CONNECTED;
    }

    // Check for pending requests
    const [sentRequest, receivedRequest] = await Promise.all([
        UserRequest.findOne({
            where: {
                sender_id: authenticatedUserId,
                receiver_id: targetUserId,
                status: UserRequestStatus.PENDING,
                is_deleted: false
            },
            transaction
        }),
        UserRequest.findOne({
            where: {
                sender_id: targetUserId,
                receiver_id: authenticatedUserId,
                status: UserRequestStatus.PENDING,
                is_deleted: false
            },
            transaction
        })
    ]);

    if (sentRequest) {
        return ConnectionStatus.REQUEST_SENT;
    }

    if (receivedRequest) {
        return ConnectionStatus.REQUEST_RECEIVED;
    }

    return ConnectionStatus.NOT_CONNECTED;
};

/** Transform user object to include vibe_ids, hobby_ids, and interest_ids arrays */
const transformUserWithIds = (user: User) => {
    if (!user) return user;

    const userJson = user.toJSON ? user.toJSON() : user;
    
    return {
        ...userJson,
        vibe_ids: userJson.vibes?.map((vibe: Vibe) => vibe.id) || [],
        hobby_ids: userJson.hobbies?.map((hobby: Hobby) => hobby.id) || [],
        interest_ids: userJson.interests?.map((interest: Interest) => interest.id) || []
    };
};

/** Transform multiple user objects to include IDs arrays */
const transformUsersWithIds = (users: User[]): User[] => {
    if (!users || users.length === 0) return users;
    return users.map(user => transformUserWithIds(user));
};

/** Add connection status to a single user object */
const addConnectionStatusToUser = async (user: User, authenticatedUserId: string | null, transaction?: Transaction) => {
    if (!authenticatedUserId || !user) {
        const transformed = transformUserWithIds(user);
        return { ...transformed, connection_status: ConnectionStatus.NOT_CONNECTED };
    }

    const connectionStatus = await getConnectionStatus(authenticatedUserId, user.id, transaction);
    const transformed = transformUserWithIds(user);
    return {
        ...transformed,
        connection_status: connectionStatus
    };
};

/** Add connection status to multiple user objects */
const addConnectionStatusToUsers = async (users: User[], authenticatedUserId: string | null, transformUsers: boolean = true, transaction?: Transaction) => {
    if (!authenticatedUserId || !users || users.length === 0) {
        if (transformUsers) {
            return transformUsersWithIds(users).map((user) => ({ ...user, connection_status: ConnectionStatus.NOT_CONNECTED }));
        }
        return users.map((user) => ({ ...user, connection_status: ConnectionStatus.NOT_CONNECTED }));
    }

    // Transform users only if transformUsers is true
    const processedUsers = transformUsers ? transformUsersWithIds(users) : users;

    // Get all connection statuses in parallel
    const statusPromises = processedUsers.map(user => getConnectionStatus(authenticatedUserId, user.id, transaction));
    const statuses = await Promise.all(statusPromises);

    // Add connection status to users (already transformed if needed)
    return processedUsers.map((user, index: number) => ({
        ...user,
        connection_status: statuses[index]
    }));
};

// User total count increment/decrement methods
const incrementUserTotal = async (userId: string, field: string, transaction?: Transaction) => {
    await User.increment(field, {
        where: { id: userId, is_deleted: false },
        by: 1,
        transaction
    });
};

const decrementUserTotal = async (userId: string, field: string, transaction?: Transaction) => {
    // Use SQL condition to prevent decrementing below 0 for UNSIGNED fields
    await User.increment(field, {
        where: {
            id: userId,
            is_deleted: false,
            [Op.and]: [
                Sequelize.literal(`\`${field}\` > 0`)
            ]
        },
        by: -1,
        transaction
    });
};

// Add points to user total field (e.g., total_gamification_points)
// Gets current value, adds points, and updates the field
// Also updates total_gamification_points_weekly if field is total_gamification_points
const addPointsToUserTotal = async (userId: string, field: string, points: number, transaction?: Transaction) => {
    const attributes = field === 'total_gamification_points' 
        ? [field, 'total_gamification_points_weekly']
        : [field];

    const user = await User.findOne({
        where: { id: userId, is_deleted: false },
        attributes: attributes,
        transaction
    });

    if (!user) {
        throw new Error(`User with id ${userId} not found`);
    }

    const currentValue = (user as any)[field] || 0;
    const newValue = currentValue + points;

    const updateData: any = { [field]: newValue };

    // Also update weekly column if updating total_gamification_points
    if (field === 'total_gamification_points') {
        const currentWeeklyValue = (user as any).total_gamification_points_weekly || 0;
        updateData.total_gamification_points_weekly = currentWeeklyValue + points;
    }

    await User.update(
        updateData,
        {
            where: { id: userId, is_deleted: false },
            transaction,
            individualHooks: true,
        }
    );

    return newValue;
};


export default {
    findUserByEmail,
    findUserByPhone,
    findUserByUsername,
    findUserByEmailOrPhone,
    findUserById,
    findUserByIdWithRelations,
    updateFirebaseUid,
    findUserByFirebaseUid,
    createUserWithFirebaseUid,
    createUser,
    updateUser,
    softDeleteUser,
    searchUsers,
    createUserProfileBulk,
    deleteUserProfileByUserId,
    loginWithEmailAndPassword,
    loginWithMobileAndOtp,
    handleBearerTokenLogin,
    getUserProfileByUserId,
    createBulkUserVibe,
    createBulkUserHobby,
    createBulkUserInterest,
    findUserByIdOrUsername,
    getAllUsersPaginated,
    combineFcmTokens,
    updateFcmTokens,
    updateUserFcmTokenAndLocation,
    getConnectionStatus,
    addConnectionStatusToUser,
    addConnectionStatusToUsers,
    incrementUserTotal,
    decrementUserTotal,
    addPointsToUserTotal
};