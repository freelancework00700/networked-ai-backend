// Log levels
export const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Colors for each log level
export const colors = {
    error: 'red',
    info: 'green',
    warn: 'yellow',
    debug: 'white',
    http: 'magenta',
};

// Standardized response messages used throughout the application
export const responseMessages = {
    // Success messages
    retrieved: 'Data retrieved successfully',
    loginSuccess: 'Login successful',

    // Error messages
    badRequest: 'Invalid request. Please check your input.',
    validationFailed: 'Validation failed. Please check your input.',
    serverError: 'Internal server error. Please try again later.',
    loginError: 'Error while logging in user.',
    unauthorized: 'Invalid token.',
    forbidden: 'Access denied. You do not have permission to perform this action.',
    tokenInvalid: 'Invalid or malformed token.',
    tokenExpired: 'Token has expired. Please login again.',
    firebaseTokenInvalid: 'Invalid Firebase token. Please provide a valid token.',
    firebaseTokenExpired: 'Firebase token has expired. Please login again.',
    firebaseTokenRevoked: 'Firebase token has been revoked.',
    accountDeleted: 'This account has been deleted.',
    userAlreadyDeleted: 'User is already deleted.',
    passwordResetSuccess: 'Password reset successfully. Please check your email for the new password.',
    passwordUpdatedSuccess: 'Password reset successfully.',

    // Not found messages
    notFound: 'Resource not found.',
    userNotFound: 'User not found.',

    // Conflict messages
    conflict: 'Resource already exists.',

    // Validation messages
    firebaseTokenRequired: 'Firebase token is required.',

    // CRUD operation messages
    createFailed: 'Failed to create record.',
    updateSuccess: 'Record updated successfully',
    updateFailed: 'Failed to update record.',
    deleteSuccess: 'Record deleted successfully',
    deleteFailed: 'Failed to delete record.',

    // Network connection messages
    receiverIdRequired: 'Receiver ID is required.',
    receiverNotFound: 'Receiver user not found.',
    cannotSendRequestToSelf: 'Cannot send connection request to yourself.',
    cannotSendRequestUserBlocked: 'Cannot send connection request. User is blocked.',
    connectionRequestExists: 'Connection request already exists.',
    requestAlreadySentByOtherUser: 'This user has already sent you a connection request.',
    usersAlreadyConnected: 'Users are already connected.',
    connectionRequestCreated: 'Connection request created successfully',
    connectionRequestNotFound: 'Connection request not found.',
    canOnlyAcceptOwnRequests: 'You can only accept requests sent to you.',
    cannotAcceptRequestUserBlocked: 'Cannot accept request. User is blocked.',
    requestAlreadyAccepted: 'Request is already accepted.',
    cannotAcceptRejectedRequest: 'Cannot accept a rejected request.',
    connectionRequestAccepted: 'Connection request accepted successfully',
    networkConnectionEstablished: 'Network connection established',
    canOnlyRejectOwnRequests: 'You can only reject requests sent to you.',
    cannotRejectRequestUserBlocked: 'Cannot reject request. User is blocked.',
    cannotRejectAcceptedRequest: 'Cannot reject an accepted request.',
    requestAlreadyRejected: 'Request is already rejected.',
    connectionRequestRejected: 'Connection request rejected successfully',
    canOnlyDeleteOwnRequests: 'You can only delete your own requests.',
    connectionRequestDeleted: 'Connection request deleted successfully',

    // Blocked user messages
    peerIdRequired: 'Peer ID is required.',
    cannotBlockSelf: 'Cannot block yourself.',
    userToBlockNotFound: 'User to block not found.',
    userAlreadyBlocked: 'User is already blocked.',
    userBlockedSuccess: 'User blocked successfully',
    userNotBlocked: 'User is not blocked.',
    userUnblockedSuccess: 'User unblocked successfully',
    valueRequired: 'Value is required.',

    // Event category messages
    nameRequired: 'Name is required.',
    nameAndCategoryRequired: 'Name and event category are required.',
    eventCategoryNotFound: 'Event category not found.',
    eventCategoryExists: 'Event category already exists.',

    // Event sub-category messages
    eventSubCategoryNotFound: 'Event sub-category not found.',
    eventSubCategoryExists: 'Event sub-category already exists in this category.',

    // Tag messages
    tagNotFound: 'Tag not found.',
    tagExists: 'Tag already exists for this user.',

    // FCM tokens messages
    fcmTokensUpdated: 'FCM tokens updated successfully',
    fcmTokensFormatRequired: 'Tokens must be provided as a comma-separated string.',
    fcmTokensRequired: 'At least one valid token must be provided.',
    noFieldsToUpdate: 'No valid fields provided for update.',

    // Authentication messages
    invalidOrExpiredOTP: 'Invalid or expired OTP.',
    userNotFoundWithMobile: 'User not found with this mobile number.',
    invalidEmailOrPassword: 'Invalid email or password.',
    passwordNotSet: 'Password not set for this account. Please use social login or set a password.',
    invalidLoginCredentials: 'Invalid login credentials. Provide either firebase_token, or mobile+otp, or email+password.',
    failedToSendVerification: 'Failed to send verification code.',
    verificationCodeSent: 'Verification code sent successfully.',
    failedToVerifyCode: 'Failed to verify code.',
    mobileAndOTPRequired: 'Mobile number and OTP are required for phone login.',
    emailAndPasswordRequired: 'Email and password are required for email login.',
    invalidPassword: 'Invalid password.',
};