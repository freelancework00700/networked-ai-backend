export enum StatusCode {
    CONFLICT = 409,
    SUCCESS = 200,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    INTERNAL_ERROR = 500,
};

export enum AccountType {
    INDIVIDUAL = 'Individual',
    BUSINESS = 'Business'
}

export enum MediaContext {
    PROFILE = 'Profile',
    POST = 'Post',
    EVENT = 'Event',
    OTHER = 'Other',
    BADGE = 'Badge',
    DIAMOND = 'Diamond',
}

export enum MediaType {
    IMAGE = 'Image',
    VIDEO = 'Video'
}

export enum MediaVariant {
    ORIGINAL = 'Original',
    THUMBNAIL = 'Thumbnail'
}

export enum UserRequestStatus {
    PENDING = 'Pending',
    ACCEPTED = 'Accepted',
    REJECTED = 'Rejected'
}

export enum RSVPRequestStatus {
    PENDING = 'Pending',
    APPROVED = 'Approved',
    REJECTED = 'Rejected'
}

export enum OtpVerificationType {
    EMAIL = 'Email',
    MOBILE = 'Mobile'
}

export enum ConnectionStatus {
    CONNECTED = 'Connected',
    REQUEST_SENT = 'RequestSent',
    REQUEST_RECEIVED = 'RequestReceived',
    NOT_CONNECTED = 'NotConnected'
}

export enum RepeatingFrequency {
    WEEKLY = 'Weekly',
    MONTHLY = 'Monthly',
    CUSTOM = 'Custom'
}

export enum EventPhase {
    PRE_EVENT = 'PreEvent',
    POST_EVENT = 'PostEvent'
}

export enum QuestionType {
    TEXT = 'Text',
    NUMBER = 'Number',
    SINGLE_CHOICE = 'SingleChoice',
    MULTIPLE_CHOICE = 'MultipleChoice',
    RATING = 'Rating',
    PHONE_NUMBER = 'PhoneNumber'
}

export enum EventParticipantRole {
    HOST = 'Host',
    CO_HOST = 'CoHost',
    SPONSOR = 'Sponsor',
    SPEAKER = 'Speaker',
    STAFF = 'Staff',
}

export enum PromoCodeType {
    FIXED = 'Fixed',
    PERCENTAGE = 'Percentage'
}

export enum RSVPStatus {
    YES = 'Yes',
    NO = 'No',
    MAYBE = 'Maybe'
}

export enum TicketType {
    STANDARD = 'Standard',
    EARLY_BIRD = 'Early Bird',
    SPONSOR = 'Sponsor',
    FREE = 'Free'
}
export enum NetworkCategory {
    SAME_LOCATION_ALL_PREFERENCES = 'same_location_all_preferences',
    SAME_LOCATION = 'same_location',
    ALL_PREFERENCES_MATCH = 'all_preferences_match',
    TWO_PREFERENCES_MATCH = 'two_preferences_match',
    ONE_PREFERENCE_MATCH = 'one_preference_match',
    RANDOM = 'random'
}

export enum StripePriceInterval {
    YEAR = 'year',
    MONTH = 'month'
}

export enum BannerDisplayType {
    FIXED = 'fixed',
    PERCENTAGE = 'percentage'
}

export enum StripeAccountStatus {
    ERROR = 'error',
    ACTIVE = 'active',
    ACTION_REQUIRED = 'action_required',
    PENDING_VERIFICATION = 'pending_verification'
}

export enum SubscriptionStatus {
    ACTIVE = 'active',
    UNPAID = 'unpaid',
    TRIALING = 'trialing',
    PAST_DUE = 'past_due',
    CANCELED = 'canceled',
    INCOMPLETE = 'incomplete'
}

export enum TransactionType {
    EVENT = "event",
    SUBSCRIPTION = "subscription"
}
  
export enum TransactionStatus {
    FAILED = "failed",
    PENDING = "pending",
    REFUNDED = "refunded",
    SUCCEEDED = "succeeded"
}

export enum MessageType {
    TEXT = 'Text',
    IMAGE = 'Image',
    VIDEO = 'Video',
    FILE = 'File',
    POST = 'Post',
    EVENT = 'Event'
}

export enum ContentType {
    EVENT = 'Event',
    ATTENDEE = 'Attendee',
    NETWORK = 'Network',
    QR = 'QR',
    MESSAGE = 'Message',
}

export enum ChatRoomFilter {
    ALL = 'all',
    UNREAD = 'unread',
    GROUP = 'group',
    EVENT = 'event',
    NETWORK = 'network',
}

export enum NotificationType {
    EVENTS = "Events",
    NETWORK = 'Network',
    MENTION = 'Mention',
    MY_EVENTS = 'MyEvents',
    POST_LIKED = 'PostLiked',
    INVITATION = 'Invitation',
    RSVP_REQUEST = 'RsvpRequest',
    CHAT_MESSAGE = "ChatMessage",
    COMMENT_LIKED = 'CommentLiked',
    COMMENT_REPLY = 'CommentReply',
    POST_COMMENTED = 'PostCommented',
    EVENT_REMINDER = 'EventReminder',
    RSVP_REQUEST_STATUS = 'RsvpRequestStatus',
    POST_EVENT_QUESTIONNAIRE = 'PostEventQuestionnaire',
}

export enum SmsType {
    RSVP_REQUEST = 'RsvpRequest',
    EVENT_UPDATE = 'EventUpdate',
    EVENT_CREATION = 'EventCreation',
    EVENT_DELETION = 'EventDeletion',
    EVENT_REMINDER = 'EventReminder',
    NETWORK_BROADCAST = 'NetworkBroadcast',
    EVENT_ROLE_REMOVAL = 'EventRoleRemoval',
    EVENT_ROLE_ASSIGNMENT = 'EventRoleAssignment',
    RSVP_REQUEST_APPROVED = 'RsvpRequestApproved',
    RSVP_REQUEST_REJECTED = 'RsvpRequestRejected',
    RSVP_CONFIRMATION_HOST = 'RsvpConfirmationHost',
    RSVP_CONFIRMATION_GUEST = 'RsvpConfirmationGuest',
    EVENT_TICKET_PURCHASE_HOST = 'EventTicketPurchaseHost',
    EVENT_TICKET_PURCHASE_GUEST = 'EventTicketPurchaseGuest',
}

export enum EmailType {
    WELCOME = 'Welcome',
    POST_SHARE = 'PostShare',
    RSVP_REQUEST = 'RsvpRequest',
    EVENT_UPDATE = 'EventUpdate',
    EVENT_CREATION = 'EventCreation',
    EVENT_DELETION = 'EventDeletion',
    EVENT_REMINDER = 'EventReminder',
    NETWORK_REQUEST = 'NetworkRequest',
    NETWORK_BROADCAST = 'NetworkBroadcast',
    EVENT_ROLE_REMOVAL = 'EventRoleRemoval',
    EVENT_ROLE_ASSIGNMENT = 'EventRoleAssignment',
    RSVP_REQUEST_APPROVED = 'RsvpRequestApproved',
    RSVP_REQUEST_REJECTED = 'RsvpRequestRejected',
    RSVP_CONFIRMATION_HOST = 'RsvpConfirmationHost',
    RSVP_CONFIRMATION_GUEST = 'RsvpConfirmationGuest',
    POST_EVENT_QUESTIONNAIRE = 'PostEventQuestionnaire',
    NETWORK_REQUEST_ACCEPTED = 'NetworkRequestAccepted',
    EVENT_TICKET_PURCHASE_HOST = 'EventTicketPurchaseHost',
    EVENT_TICKET_PURCHASE_GUEST = 'EventTicketPurchaseGuest',
}

export enum ReminderType {
    ONE_WEEK = '1w',
    TWO_WEEKS = '2w',
    TWO_HOURS = '2h',
    TWENTY_FOUR_HOURS = '24h',
    POST_EVENT = 'PostEvent'
}