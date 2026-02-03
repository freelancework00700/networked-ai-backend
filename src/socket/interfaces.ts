import { Feed, FeedComment } from "../models";
import { ConnectionStatus, MessageType } from "../types/enums";

export interface UserRoom {
    roomId: string, 
    userId: string
}

export type RoomCreated = {
    name?: string | null;
    user_ids: string[];
    is_personal: boolean;
    event_id?: string | null;
    event_image?: string | null;
    profile_image?: string | null;
    is_broadcast?: boolean;
    broadcast_owner?: string | null;
    created_by?: string | null;
}

export interface RoomUpdated {
    roomId: string;
    type: string;
    name: string;
    event_id?: string | null;
    event_image?: string | null;
    profile_image?: string | null;
    is_broadcast?: boolean;
    broadcast_owner?: string | null;
    created_by?: string | null;
}

export interface MessageUpdated {
    message: string | null;
    type?: MessageType;
    media_url?: string | null;
    is_edited?: boolean;
}

export interface MessageDeleted {
    message_id: string;
}

export interface MessageReaction {
    message_id: string;
    user_id: string;
    reaction_type: string;
}

export type MessageCreated = {
    chat_room_id?: string;
    message: string | null;
    type?: MessageType;
    media_url?: string | null;
    posted_by_user_id?: string;
    feed_id?: string | null;
    event_id?: string | null;
    read_by_recipients?: Array<{ read_by_user_id: string; read_at: string | Date }>;
    created_by?: string | null;
}

export interface FeedCreatedPayload {
    feed: Feed;
}

export interface FeedUpdatedPayload {
    feed: Feed;
}

export interface FeedDeletedPayload {
    feed_id: string;
    deleted_by?: string;
}

export interface FeedCommentCreatedPayload {
    feed_id: string;
    comment: FeedComment;
}

export interface FeedCommentUpdatedPayload {
    feed_id: string;
    comment: FeedComment;
}

export interface FeedCommentDeletedPayload {
    feed_id: string;
    comment_id: string;
}

export interface NetworkConnectionPayload {
    id: string;
    name?: string | null;
    username: string | null;
    image_url?: string | null;
    company_name?: string | null;
    thumbnail_url?: string | null;
    total_gamification_points?: number;
    connection_status: ConnectionStatus;
    total_gamification_points_weekly?: number;
}

export interface AttendeeCheckInPayload {
    id: string;
    event_id: string;
    user_id: string;
    parent_user_id: string | null;
    name: string | null;
    is_incognito: boolean;
    rsvp_status: string;
    is_checked_in: boolean;
    event_ticket_id: string | null;
    event_promo_code_id: string | null;
    platform_fee_amount: number;
    amount_paid: number;
    apple_wallet_pass_url: string | null;
    host_payout_amount: number;
}