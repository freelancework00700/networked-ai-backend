import { ProfileSubscription } from '../models';

const hasSubscription = async (subscriberUserId: string, peerId: string): Promise<boolean> => {
    const record = await ProfileSubscription.findOne({
        where: {
            user_id: subscriberUserId,
            peer_id: peerId,
        },
    });
    return !!record;
};

const toggleSubscription = async (
    subscriberUserId: string,
    peerId: string
): Promise<{ subscribed: boolean }> => {
    const existing = await ProfileSubscription.findOne({
        where: {
            user_id: subscriberUserId,
            peer_id: peerId,
        },
    });

    if (existing) {
        await existing.destroy();
        return { subscribed: false };
    }

    await ProfileSubscription.create({
        user_id: subscriberUserId,
        peer_id: peerId,
        created_by: subscriberUserId,
    });
    return { subscribed: true };
};

export default {
    hasSubscription,
    toggleSubscription,
};
