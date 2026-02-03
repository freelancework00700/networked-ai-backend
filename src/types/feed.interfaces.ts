import { MediaParams } from "./event.interfaces";

export interface CreateFeedParams {
    event_ids: string[];
    address: string;
    latitude: string;
    longitude: string;
    content: string;
    medias: MediaParams[];
    is_public: boolean;
    mention_ids?: string[];
};

export type FeedEventParams = {
    feed_id: string;
    event_id: string;
}