export interface CreateSmsParams {
    to: string[];
    type: string;
    message: string;
    title?: string | null;
    created_by?: string | null;
}

export interface SendSmsByTagsAndSegmentsParams {
    type: string;
    to?: string[];
    message: string;
    title?: string | null;
    tag_ids?: string[];
    segment_ids?: string[];
}

export type GetAllSmsOptions = {
    page?: number;
    limit?: number;
    search?: string;
    date_to?: string;
    date_from?: string;
    order_direction?: 'ASC' | 'DESC';
    order_by?: 'message' | 'created_at';
};