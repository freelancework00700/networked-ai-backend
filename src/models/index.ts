import { Sequelize } from 'sequelize';
import BlockedUser from './blocked-user.model';
import CommentLike from './comment-like.model';
import CommentReport from './comment-report.model';
import EventAttendee from './event-attendee.model';
import EventCategory from './event-category.model';
import EventFeedback from './event-feedback.model';
import EventMedia from './event-media.model';
import EventParticipant from './event-participant.model';
import EventPromoCode from './event-promo-code.model';
import RSVPRequest from './rsvp-request.model';
import EventLike from './event-like.model';
import EventReport from './event-report.model';
import EventQuestionOption from './event-question-option.model';
import EventQuestion from './event-question.model';
import EventSetting from './event-setting.model';
import EventTickets from './event-tickets.model';
import EventVibe from './event-vibe.model';
import EventViewer from './event-viewer.model';
import Event from './event.model';
import FeedComment from './feed-comment.model';
import FeedLiked from './feed-liked.model';
import FeedMention from './feed-mention.model';
import CommentMention from './comment-mention.model';
import FeedReport from './feed-report.model';
import FeedShared from './feed-shared.model';
import Feed from './feed.model';
import FeedEvents from './feed-events.model';
import FeedMedia from './feed-media.model';
import Hobby from './hobby.model';
import Interest from './interest.model';
import Media from './media.model';
import OtpVerification from './otp-verification.model';
import ReportReason from './report-reason.model';
import UserHobby from './user-hobby.model';
import UserInterest from './user-interest.model';
import UserNetwork from './user-network.model';
import UserProfile from './user-profile.model';
import UserRequest from './user-request.model';
import UserSetting from './user-setting.model';
import UserSocial from './user-social.model';
import UserVibe from './user-vibe.model';
import User from './user.model';
import Vibe from './vibe.model';
import GamificationBadge from './gamification-badge.model';
import GamificationDiamond from './gamification-diamond.model';
import GamificationCategory from './gamification-category.model';
import UserGamificationPointsLog from './user-gamification-points-log.model';
import UserGamificationCategoryBadges from './user-gamification-category-badges.model';
import Transaction from './transaction.model';
import StripePrice from './stripe-price.model';
import Subscription from './subscription.model';
import StripeProduct from './stripe-product.model';
import StripeProductEvent from './stripe-product-event.model';
import ChatRoom from './chat-room.model';
import ChatMessage from './chat-message.model';
import Sms from './sms.model';
import Email from './email.model';
import Notification from './notification.model';
import EventReminder from './event-reminder.model';
import Tag from './tag.model';
import Segment from './segment.model';
import Customer from './customer.model';
import CustomerTag from './customer-tag.model';
import CustomerSegment from './customer-segment.model';

/**
 * Initialize all MySQL models, associations, and hooks
 * @param connection - Sequelize instance
 */
export const initMySQLModels = (connection: Sequelize): void => {
    // Init models here
    User.initModel(connection);
    Vibe.initModel(connection);
    Interest.initModel(connection);
    Hobby.initModel(connection);
    EventCategory.initModel(connection);
    UserVibe.initModel(connection);
    UserInterest.initModel(connection);
    UserHobby.initModel(connection);
    UserSetting.initModel(connection);
    UserSocial.initModel(connection);
    Media.initModel(connection);
    UserProfile.initModel(connection);
    UserRequest.initModel(connection);
    UserNetwork.initModel(connection);
    BlockedUser.initModel(connection);
    Event.initModel(connection);
    EventReminder.initModel(connection);
    EventAttendee.initModel(connection);
    EventTickets.initModel(connection);
    EventMedia.initModel(connection);
    EventVibe.initModel(connection);
    EventLike.initModel(connection);
    EventViewer.initModel(connection);
    EventSetting.initModel(connection);
    EventQuestion.initModel(connection);
    EventQuestionOption.initModel(connection);
    EventFeedback.initModel(connection);
    EventParticipant.initModel(connection);
    EventPromoCode.initModel(connection);
    EventReport.initModel(connection);
    RSVPRequest.initModel(connection);
    ReportReason.initModel(connection);
    OtpVerification.initModel(connection);
    Feed.initModel(connection);
    FeedEvents.initModel(connection);
    FeedMedia.initModel(connection);
    FeedLiked.initModel(connection);
    FeedShared.initModel(connection);
    FeedComment.initModel(connection);
    FeedMention.initModel(connection);
    CommentMention.initModel(connection);
    FeedReport.initModel(connection);
    CommentReport.initModel(connection);
    CommentLike.initModel(connection);
    GamificationBadge.initModel(connection);
    GamificationDiamond.initModel(connection);
    GamificationCategory.initModel(connection);
    UserGamificationPointsLog.initModel(connection);
    UserGamificationCategoryBadges.initModel(connection);
    StripePrice.initModel(connection);
    Transaction.initModel(connection);
    Subscription.initModel(connection);
    StripeProduct.initModel(connection);
    StripeProductEvent.initModel(connection);
    ChatRoom.initModel(connection);
    ChatMessage.initModel(connection);
    Sms.initModel(connection);
    Email.initModel(connection);
    Notification.initModel(connection);
    Tag.initModel(connection);
    Segment.initModel(connection);
    Customer.initModel(connection);
    CustomerTag.initModel(connection);
    CustomerSegment.initModel(connection);

    // Init associations here
    User.initAssociations();
    Vibe.initAssociations();
    Interest.initAssociations();
    Hobby.initAssociations();
    EventCategory.initAssociations();
    UserVibe.initAssociations();
    UserInterest.initAssociations();
    UserHobby.initAssociations();
    UserSetting.initAssociations();
    UserSocial.initAssociations();
    Media.initAssociations();
    UserProfile.initAssociations();
    UserRequest.initAssociations();
    UserNetwork.initAssociations();
    BlockedUser.initAssociations();
    OtpVerification.initAssociations();
    Event.initAssociations();
    EventReminder.initAssociations();
    EventAttendee.initAssociations();
    EventTickets.initAssociations();
    EventMedia.initAssociations();
    EventVibe.initAssociations();
    EventLike.initAssociations();
    EventViewer.initAssociations();
    EventSetting.initAssociations();
    EventQuestion.initAssociations();
    EventQuestionOption.initAssociations();
    EventFeedback.initAssociations();
    EventPromoCode.initAssociations();
    EventParticipant.initAssociations();
    EventReport.initAssociations();
    ReportReason.initAssociations();
    RSVPRequest.initAssociations();
    Feed.initAssociations();
    FeedEvents.initAssociations();
    FeedMedia.initAssociations();
    FeedLiked.initAssociations();
    FeedShared.initAssociations();
    FeedComment.initAssociations();
    FeedMention.initAssociations();
    CommentMention.initAssociations();
    FeedReport.initAssociations();
    CommentReport.initAssociations();
    CommentLike.initAssociations();
    GamificationBadge.initAssociations();
    GamificationDiamond.initAssociations();
    GamificationCategory.initAssociations();
    UserGamificationPointsLog.initAssociations();
    UserGamificationCategoryBadges.initAssociations();
    Transaction.initAssociations();
    StripePrice.initAssociations();
    Subscription.initAssociations();
    StripeProduct.initAssociations();
    StripeProductEvent.initAssociations();
    ChatRoom.initAssociations();
    ChatMessage.initAssociations();
    Sms.initAssociations();
    Email.initAssociations();
    Notification.initAssociations();
    Tag.initAssociations();
    Segment.initAssociations();
    Customer.initAssociations();
    CustomerTag.initAssociations();
    CustomerSegment.initAssociations();

    // Init hooks here
    User.initHooks();
    Vibe.initHooks();
    Interest.initHooks();
    Hobby.initHooks();
    EventCategory.initHooks();
    UserVibe.initHooks();
    UserInterest.initHooks();
    UserHobby.initHooks();
    UserSetting.initHooks();
    UserSocial.initHooks();
    Media.initHooks();
    UserProfile.initHooks();
    UserRequest.initHooks();
    UserNetwork.initHooks();
    BlockedUser.initHooks();
    OtpVerification.initHooks();
    Event.initHooks();
    EventReminder.initHooks();
    EventAttendee.initHooks();
    EventTickets.initHooks();
    EventMedia.initHooks();
    EventVibe.initHooks();
    EventLike.initHooks();
    EventViewer.initHooks();
    EventSetting.initHooks();
    EventQuestion.initHooks();
    EventQuestionOption.initHooks();
    EventFeedback.initHooks();
    EventPromoCode.initHooks();
    EventParticipant.initHooks();
    EventReport.initHooks();
    ReportReason.initHooks();
    RSVPRequest.initHooks();
    Feed.initHooks();
    FeedEvents.initHooks();
    FeedMedia.initHooks();
    FeedLiked.initHooks();
    FeedShared.initHooks();
    FeedComment.initHooks();
    FeedMention.initHooks();
    CommentMention.initHooks();
    FeedReport.initHooks();
    CommentReport.initHooks();
    CommentLike.initHooks();
    GamificationBadge.initHooks();
    GamificationDiamond.initHooks();
    GamificationCategory.initHooks();
    UserGamificationPointsLog.initHooks();
    UserGamificationCategoryBadges.initHooks();
    Transaction.initHooks();
    StripePrice.initHooks();
    Subscription.initHooks();
    StripeProduct.initHooks();
    StripeProductEvent.initHooks();
    ChatRoom.initHooks();
    ChatMessage.initHooks();
    Sms.initHooks();
    Email.initHooks();
    Notification.initHooks();
    Tag.initHooks();
    Segment.initHooks();
    Customer.initHooks();
    CustomerTag.initHooks();
    CustomerSegment.initHooks();

};

/**
 * Export all models
 */
export {
    BlockedUser, CommentLike, CommentReport, Event, EventAttendee, EventCategory, EventFeedback, EventLike, EventMedia, EventParticipant,
    EventPromoCode, EventReport, RSVPRequest,
    EventQuestion,
    EventQuestionOption,
    EventSetting,
    EventTickets,
    EventVibe, EventViewer, Feed,
    FeedComment,
    FeedEvents,
    FeedMedia,
    FeedLiked,
    FeedMention,
    CommentMention,
    FeedReport,
    FeedShared, Hobby, Interest, Media, OtpVerification,
    ReportReason, User, UserHobby, UserInterest, UserNetwork, UserProfile,
    UserRequest, UserSetting,
    UserSocial, UserVibe, Vibe,
    GamificationBadge, GamificationDiamond, GamificationCategory, UserGamificationPointsLog, UserGamificationCategoryBadges,
    StripeProduct, StripePrice, StripeProductEvent, Subscription, Transaction,
    ChatRoom, ChatMessage, Email, Sms, Notification, EventReminder,
    Tag, Segment, Customer, CustomerTag, CustomerSegment
};

