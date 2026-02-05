/** System default tag for "Network" – one per user, id is the user's id, not stored in DB, not assignable to customers. */
export const DEFAULT_TAG_NETWORK_NAME = 'Network';

/** True when the tag id is the current user's Network tag (id === userId). */
export const isNetworkTagForUser = (tagId: string, userId: string): boolean => tagId === userId;
