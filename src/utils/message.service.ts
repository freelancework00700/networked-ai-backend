/**
 * Message templates for CRUD operations
 * Use {1}, {2}, etc. as placeholders that will be replaced with actual entity names
 */
export const messageTemplates = {
    created: '{1} created successfully',
    updated: '{1} updated successfully',
    deleted: '{1} deleted successfully',
    retrieved: '{1} retrieved successfully',
    notFound: '{1} not found',
    exists: '{1} already exists',
    liked: '{1} liked successfully',
    unliked: '{1} unliked successfully',
    shared: '{1} shared successfully',
    unshared: '{1} unshared successfully',
    alreadyLiked: '{1} already liked',
    alreadyShared: '{1} already shared to this peer',
    cannotShareToSelf: 'Cannot share {1} to yourself',
    parentCommentNotFound: 'Parent comment not found',
    parentCommentMismatch: 'Parent comment does not belong to this feed',
    reportExists: '{1} already reported',
};

/**
 * Entity names mapping for consistent naming
 */
export const entityNames = {
    tag: 'Tag',
    tags: 'Tags',
    event: 'Event',
    events: 'Events',
    eventCategory: 'Event category',
    eventCategories: 'Event categories',
    eventSubCategory: 'Event sub-category',
    eventSubCategories: 'Event sub-categories',
    user: 'User',
    users: 'Users',
    vibe: 'Vibe',
    vibes: 'Vibes',
    fcmTokens: 'FCM tokens',
    connectionRequest: 'Connection request',
    connectionRequests: 'Connection requests',
    networkConnection: 'Network connection',
    networkConnections: 'Network connections',
    blockedUser: 'Blocked user',
    blockedUsers: 'Blocked users',
    hobby: 'Hobby',
    hobbies: 'Hobbies',
    interest: 'Interest',
    interests: 'Interests',
    feed: 'Feed',
    feeds: 'Feeds',
    comment: 'Comment',
    comments: 'Comments',
    like: 'Like',
    likes: 'Likes',
    share: 'Share',
    shares: 'Shares',
    reply: 'Reply',
    replies: 'Replies',
    report: 'Report',
    reports: 'Reports',
    reportReason: 'Report reason',
    reportReasons: 'Report reasons',
};

/**
 * Generate a dynamic message by replacing placeholders in a template
 * @param template - Message template with placeholders like {1}, {2}, etc.
 * @param replacements - Array of values to replace placeholders in order
 * @returns Formatted message string
 * 
 * @example
 * generateMessage(messageTemplates.created, [entityNames.tag])
 * // Returns: "Tag created successfully"
 * 
 * @example
 * generateMessage('{1} updated {2} successfully', ['User', 'profile'])
 * // Returns: "User updated profile successfully"
 */
export const generateMessage = (template: string, replacements: string[]): string => {
    let message = template;
    replacements.forEach((replacement, index) => {
        const placeholder = `{${index + 1}}`;
        message = message.replace(placeholder, replacement);
    });
    return message;
};

/**
 * Generate CRUD operation messages
 * @param operation - Operation type: 'created', 'updated', 'deleted', 'retrieved'
 * @param entityName - Name of the entity (singular or plural)
 * @returns Formatted message string
 * 
 * @example
 * generateCrudMessage('created', entityNames.tag)
 * // Returns: "Tag created successfully"
 */
export const generateCrudMessage = (operation: 'created' | 'updated' | 'deleted' | 'retrieved' | 'notFound', entityName: string): string => {
    const template = messageTemplates[operation];
    return generateMessage(template, [entityName]);
};

