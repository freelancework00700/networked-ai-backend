import { MediaType, EventParticipantRole, EventPhase, QuestionType, RepeatingFrequency, PromoCodeType, TicketType, RSVPStatus } from './enums';

export type MediaParams = {
    id?: string;
    media_url: string;
    media_type: MediaType;
    order?: number;
};

export type SettingsParams = {
    is_repeating_event?: boolean;
    repeating_frequency?: RepeatingFrequency | null;
    is_rsvp_approval_required?: boolean;
    is_show_timer?: boolean;
    max_attendees_per_user?: number;
    host_pays_platform_fee?: boolean;
    additional_fees?: number | null;
    is_subscriber_exclusive?: boolean;
};

export type EventParticipantParams = {
    id?: string;
    user_id: string;
    role: EventParticipantRole;
};

export type PromoCodeParams = {
    id?: string;
    promo_code: string;
    type: PromoCodeType;
    value: number;
    capped_amount?: number | null;
    quantity?: number | null;
    max_uses_per_user?: number | null;
};

export type TicketParams = {
    id?: string;
    name: string;
    price: number;
    quantity: number;
    description: string;
    ticket_type: TicketType;
    sales_start_date: string;
    sales_end_date: string;
    end_at_event_start: boolean;
    order?: number;
};

export type QuestionOptionParams = {
    id?: string;
    option: string;
    order?: number;
};

export type QuestionParams = {
    id?: string;
    question: string;
    event_phase: EventPhase;
    question_type: QuestionType;
    is_required: boolean;
    max?: number | null;
    min?: number | null;
    rating_scale?: number | null;
    is_public: boolean;
    order?: number;
    options?: QuestionOptionParams[];
};

export type CreateEventParams = {
    title: string;
    slug: string;
    description?: string | null;
    address?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    category_id: string;
    is_paid_event?: boolean;
    start_date: string;
    end_date: string;
    capacity?: number | null;
    is_public?: boolean;
    parent_event_id?: string | null;

    vibes?: string[];
    settings: SettingsParams;
    medias?: MediaParams[];
    tickets?: TicketParams[];
    promo_codes?: PromoCodeParams[];
    participants?: EventParticipantParams[];
    questionnaire?: QuestionParams[];
    plan_ids?: string[];
};

export type eventFeedbackParams = {
    question_id: string;
    answer_option_id?: string | null;
    answer?: string | null;
};

export type eventAttendeeParams = {
    event_id: string;
    parent_user_id?: string | null;
    name?: string | null;
    is_incognito?: boolean;
    rsvp_status: RSVPStatus;
    event_ticket_id?: string | null;
    event_promo_code_id?: string | null;
    platform_fee_amount?: number;
    amount_paid?: number;
    apple_wallet_pass_url?: string | null;
    host_payout_amount?: number;
    transaction_id?: string | null;
};

export type BulkEventAttendeeParams = {
    event_id: string;
    attendees: Omit<eventAttendeeParams, 'event_id'>[];
    transaction_id?: string | null;
};