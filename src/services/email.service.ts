import fs from 'fs';
import path from 'path';
import ical from 'ical-generator';
import env from '../utils/validate-env';
import { Transaction } from 'sequelize';
import { Attachment } from 'nodemailer/lib/mailer';
import loggerService from '../utils/logger.service';
import { EmailType, EventParticipantRole } from '../types/enums';
import { Email, Event, User, EventParticipant, EventAttendee } from '../models/index';


interface CreateEmailParams {
    type: string;
    html: string;
    from: string;
    bcc?: string[];
    subject: string;
    user_id?: string | null;
    attachments?: Attachment[];
    created_by?: string | null;
}

const createEmail = async (params: CreateEmailParams, transaction?: Transaction): Promise<Email> => {
    try {
        const userId = params.user_id ?? params.created_by ?? null;

        const emailRecord = await Email.create(
            {
                user_id: userId,
                type: params.type,
                html: params.html,
                from: params.from,
                subject: params.subject,
                created_by: params.created_by || null,
                attachments: params.attachments || null,
                bcc: params.bcc || [],
            },
            { transaction }
        );

        return emailRecord;
    } catch (error: any) {
        loggerService.error(`Error creating email record: ${error.message}`);
        throw error;
    }
};

export const sendWelcomeEmail = async (user: User, transaction?: Transaction): Promise<Email | null> => {
    try {
        if (!user?.email) return null;

        const templatePath = path.join(__dirname, '../contents/welcome-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        html = html
            .replace(/{{website}}/g, env.FRONT_URL)
            .replace(/{{userFullName}}/g, user.name || 'User')
            .replace(/{{year}}/g, new Date().getFullYear().toString());

        const subject = 'Welcome to Networked AI';

        return await createEmail(
            {
                html,
                subject,
                bcc: [user.email],
                type: EmailType.WELCOME,
                from: '"Networked AI" <do-not-reply@net-worked.ai>',
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending welcome email: ${error.message || error}`);
        return null;
    }
};

const formatDateForGoogleCalendarUtc = (date: Date): string => {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
};

const generateIcsForEvent = (event: Event, hostName: string): string => {
    const cal = ical({ name: event.title || 'Event' });
    const url = `${env.FRONT_URL}/event/${event.slug || ''}`;

    cal.createEvent({
        url,
        location: event.address || '',
        end: new Date(event.end_date),
        summary: event.title || 'Event',
        start: new Date(event.start_date),
        description: `${event.description || ''}\n${url}`,
        organizer: {
            name: hostName || 'Networked AI',
            email: 'do-not-reply@net-worked.ai',
        },
    });

    return cal.toString();
};

export const sendRsvpConfirmationEmailToGuest = async (event: Event, host: User, guest: User, attendeesWithTickets: any[], transaction?: Transaction): Promise<Email | null> => {
    try {
        if (!guest?.email) {
            return null;
        }

        const templatePath = path.join(__dirname, '../contents/rsvp-confirmation-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        const start = new Date(event.start_date);
        const end = new Date(event.end_date);

        const dateTime = `${start.toLocaleString('en-US')} - ${end.toLocaleString('en-US')}`;
        const locationText = [event.address, event.city, event.state, event.country].filter(Boolean).join(', ');

        const mapsUrl = new URL('https://www.google.com/maps/search/');
        mapsUrl.searchParams.append('api', '1');
        mapsUrl.searchParams.append('query', locationText || (event.address || ''));

        const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
        const googleCalendarUrl = new URL(baseUrl);
        googleCalendarUrl.searchParams.append('text', `${event.title} - ${start.toLocaleString('en-US')}`);
        googleCalendarUrl.searchParams.append('dates', `${formatDateForGoogleCalendarUtc(start)}/${formatDateForGoogleCalendarUtc(end)}`);
        googleCalendarUrl.searchParams.append('details', event.description || '');
        googleCalendarUrl.searchParams.append('location', locationText);

        const ticketsSection = attendeesWithTickets
            .map((a: any) => {
                const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(a.id)}`;
                const guestName = a?.name || guest.name || 'Guest';
                const ticketName = a?.event_ticket?.name || 'Ticket';
                const appleWalletPassUrl = a?.apple_wallet_pass_url || '';

                return `
                <table class="ticket-table">
                  <tr>
                    <td class="ticket-qr">
                      <img src="${qrCodeUrl}" alt="QR Code" style="width:100px; height:100px;" />
                    </td>
                    <td class="ticket-info">
                      <p class="ticket-name">${guestName}</p>
                      <p class="ticket-type">Ticket Name: ${ticketName}</p>
                      <p class="ticket-quantity">x1</p>
                      ${appleWalletPassUrl ? `<a href="${appleWalletPassUrl}" class="apple-wallet-button">Add to Apple Wallet</a>` : ''}
                    </td>
                  </tr>
                </table>
                <hr class="ticket-divider" />
              `;
            })
            .join('');

        const eventImage = event.image_url
            ? `<img src="${event.image_url}" alt="Event Image" class="event-image">`
            : '';

        const description = (event.description && String(event.description).trim().length > 0)
            ? `<p><strong>Details:</strong> ${event.description}</p>`
            : `<p>You have been confirmed to attend!</p>`;

        const calendarFileUrl = `${env.FRONT_URL}/event/${event.slug || ''}`;

        html = html
            .replace(/{{dateTime}}/g, dateTime)
            .replace(/{{eventImage}}/g, eventImage)
            .replace(/{{slug}}/g, event.slug || '')
            .replace(/{{mapsUrl}}/g, mapsUrl.toString())
            .replace(/{{location}}/g, locationText || '')
            .replace(/{{title}}/g, event.title || 'Event')
            .replace(/{{ticketsSection}}/g, ticketsSection)
            .replace(/{{descriptionSection}}/g, description)
            .replace(/{{calendarFileUrl}}/g, calendarFileUrl)
            .replace(/{{hostName}}/g, host?.name || 'Networked AI')
            .replace(/{{year}}/g, new Date().getFullYear().toString())
            .replace(/{{googleCalendarUrl}}/g, googleCalendarUrl.toString());

        const ics = generateIcsForEvent(event, host?.name || 'Networked AI');
        const icsAttachment: Attachment = {
            filename: `${event.title || 'event'}.ics`,
            content: Buffer.from(ics).toString('base64'),
            encoding: 'base64',
            contentType: 'text/calendar; charset=UTF-8; method=REQUEST',
        } as any;

        const subject = `RSVP Confirmation for ${event.title}`;

        return await createEmail(
            {
                html,
                subject,
                bcc: [guest.email],
                attachments: [icsAttachment],
                type: EmailType.RSVP_CONFIRMATION_GUEST,
                from: `"${host?.name || 'Networked AI'}" <do-not-reply@net-worked.ai>`,
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending RSVP confirmation email to guest: ${error.message || error}`);
        return null;
    }
};

export const sendRsvpConfirmationEmailToHost = async (event: Event, host: User, guest: User, attendeesWithTickets: any[], transaction?: Transaction): Promise<Email | null> => {
    try {
        if (!host?.email) {
            return null;
        }

        const templatePath = path.join(__dirname, '../contents/rsvp-confirmation-host-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        const groups: Record<string, string[]> = {};
        for (const a of attendeesWithTickets) {
            const tierName = a?.event_ticket?.name || 'Ticket';
            const isIncognito = Boolean(a?.is_incognito);
            const name = isIncognito ? 'Incognito' : (a?.name || guest.name || 'Guest');
            if (!groups[tierName]) {
                groups[tierName] = [];
            }
            groups[tierName].push(name);
        }

        const tierLines = Object.entries(groups)
            .map(([tier, names], index) => `${index + 1}) <strong>${tier}: </strong> ${names.join(', ')}`)
            .join('<br>');

        const userEmailSection = guest.email ? `<li><strong>Email:</strong> ${guest.email}</li>` : '';

        html = html
            .replace(/{{tierLines}}/g, tierLines)
            .replace(/{{slug}}/g, event.slug || '')
            .replace(/{{hostName}}/g, host.name || 'Host')
            .replace(/{{eventTitle}}/g, event.title || 'Event')
            .replace(/{{userEmailSection}}/g, userEmailSection)
            .replace(/{{year}}/g, new Date().getFullYear().toString());

        const subject = `Congratulations! Someone RSVP'd to ${event.title}`;

        return await createEmail(
            {
                html,
                subject,
                bcc: [host.email],
                type: EmailType.RSVP_CONFIRMATION_HOST,
                from: '"Networked AI" <do-not-reply@net-worked.ai>'
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending RSVP confirmation email to host: ${error.message || error}`);
        return null;
    }
};

export const sendRsvpRequestEmailToHost = async (event: Event, hostEmail: string, hostName: string, requesterName: string, createdBy: string, transaction?: Transaction): Promise<Email> => {
    try {
        const templatePath = path.join(__dirname, '../contents/rsvp-request-email-host.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        html = html
            .replace(/{{hostName}}/g, hostName)
            .replace(/{{slug}}/g, event.slug || '')
            .replace(/{{requesterName}}/g, requesterName)
            .replace(/{{eventTitle}}/g, event.title || 'Event')
            .replace(/{{year}}/g, new Date().getFullYear().toString());

        const subject = `New RSVP request for ${event.title}`;

        return await createEmail(
            {
                html,
                subject,
                bcc: [hostEmail],
                type: EmailType.RSVP_REQUEST,
                from: `"${requesterName || 'Networked AI'}" <do-not-reply@net-worked.ai>`
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending RSVP request email to host: ${error.message}`);
        throw error;
    }
};

export const sendRsvpRequestApprovedEmailToRequester = async (event: Event, requesterEmail: string, requesterName: string, hostName: string, createdBy: string, transaction?: Transaction): Promise<Email> => {
    try {
        const templatePath = path.join(__dirname, '../contents/rsvp-request-approved-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        html = html
            .replace(/{{hostName}}/g, hostName)
            .replace(/{{slug}}/g, event.slug || '')
            .replace(/{{requesterName}}/g, requesterName)
            .replace(/{{eventTitle}}/g, event.title || 'Event')
            .replace(/{{year}}/g, new Date().getFullYear().toString());

        const subject = `RSVP approved for ${event.title}`;

        return await createEmail(
            {
                html,
                subject,
                bcc: [requesterEmail],
                type: EmailType.RSVP_REQUEST_APPROVED,
                from: `"${hostName || 'Networked AI'}" <do-not-reply@net-worked.ai>`,
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending RSVP approved email to requester: ${error.message}`);
        throw error;
    }
};

export const sendRsvpRequestRejectedEmailToRequester = async (event: Event, requesterEmail: string, requesterName: string, hostName: string, createdBy: string, transaction?: Transaction): Promise<Email> => {
    try {
        const templatePath = path.join(__dirname, '../contents/rsvp-request-rejected-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        html = html
            .replace(/{{hostName}}/g, hostName)
            .replace(/{{slug}}/g, event.slug || '')
            .replace(/{{requesterName}}/g, requesterName)
            .replace(/{{eventTitle}}/g, event.title || 'Event')
            .replace(/{{year}}/g, new Date().getFullYear().toString());

        const subject = `RSVP rejected for ${event.title}`;

        return await createEmail(
            {
                html,
                subject,
                bcc: [requesterEmail],
                type: EmailType.RSVP_REQUEST_REJECTED,
                from: `"${hostName || 'Networked AI'}" <do-not-reply@net-worked.ai>`,
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending RSVP rejected email to requester: ${error.message}`);
        throw error;
    }
};

export const sendNetworkRequestAcceptedEmail = async (receiverEmail: string, accepterName: string, accepterUsername: string, accepterId: string, transaction?: Transaction): Promise<Email> => {
    try {
        const templatePath = path.join(__dirname, '../contents/network-request-accepted-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        html = html
            .replace(/{{accepterName}}/g, accepterName)
            .replace(/{{accepterUsername}}/g, accepterUsername)
            .replace(/{{year}}/g, new Date().getFullYear().toString());

        const safeAccepterName = String(accepterName || 'Networked AI').replace(/"/g, '');
        const subject = `Network Request Accepted - ${safeAccepterName}`;

        return await createEmail(
            {
                html,
                subject,
                bcc: [receiverEmail],
                type: EmailType.NETWORK_REQUEST_ACCEPTED,
                from: `"${safeAccepterName}" <do-not-reply@net-worked.ai>`
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending network request accepted email: ${error.message}`);
        throw error;
    }
};

export const sendNetworkRequestEmail = async (receiverEmail: string, senderName: string, senderUsername: string, senderId: string, transaction?: Transaction): Promise<Email> => {
    try {
        const templatePath = path.join(__dirname, '../contents/network-request-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        html = html
            .replace(/{{senderName}}/g, senderName)
            .replace(/{{senderUsername}}/g, senderUsername)
            .replace(/{{year}}/g, new Date().getFullYear().toString());

            const safeSenderName = String(senderName || 'Networked AI').replace(/"/g, '');
            const subject = `New Network Request - ${safeSenderName}`;

        return await createEmail(
            {
                html,
                subject,
                bcc: [receiverEmail],
                type: EmailType.NETWORK_REQUEST,
                from: `"${safeSenderName}" <do-not-reply@net-worked.ai>`,
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending network request email: ${error.message}`);
        throw error;
    }
};

export const sendEventRoleRemovalEmail = async (event: Event, recipientEmail: string, recipientName: string, transaction?: Transaction): Promise<Email> => {
    try {
        // Ensure event has host information loaded
        if (!(event as any).created_by_user) {
            await event.reload({
                include: [{
                    model: User,
                    as: 'created_by_user',
                    attributes: ['id', 'name', 'email'],
                }],
                transaction,
            });
        }

        const templatePath = path.join(__dirname, '../contents/event-role-removal-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        const dateTime = formatEventDateTime(new Date(event.start_date), new Date(event.end_date));
        const hostName = (event as any)?.created_by_user?.name || 'Host';

        html = html
            .replace(/{{dateTime}}/g, dateTime)
            .replace(/{{hostName}}/g, hostName)
            .replace(/{{slug}}/g, event.slug || '')
            .replace(/{{recipientName}}/g, recipientName)
            .replace(/{{address}}/g, event.address || 'TBD')
            .replace(/{{eventTitle}}/g, event.title || 'Event')
            .replace(/{{year}}/g, new Date().getFullYear().toString());

        const subject = `You've been removed from ${event.title}`;

        return await createEmail(
            {
                html,
                subject,
                bcc: [recipientEmail],
                type: EmailType.EVENT_ROLE_REMOVAL,
                from: '"Networked AI" <do-not-reply@net-worked.ai>',
                created_by: (event as any)?.created_by_user?.id || null,
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending event role removal email: ${error.message}`);
        throw error;
    }
};

export const generateEventEmail = async (
    event: Event,
    isInviteEmail = false,
    isPostEventEmail = false
): Promise<string> => {
    try {
        // Read the HTML template
        const templatePath = path.join(__dirname, '../contents/event-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        const subject = `Event: ${event.title}`;
        const description = (event.description && event.description.trim()) ? event.description : '';
        const cleanedDescription = description.replace(
            /<figure class="media">\s*<oembed url="(.*?)"><\/oembed>\s*<\/figure>/g,
            `<p style="text-align: center; margin: 20px 0;">
                <a href="$1" target="_blank" rel="noopener noreferrer">Video</a>
            </p>`
        );

        const startDateOptions = {
            hour12: true,
            day: 'numeric' as const,
            year: '2-digit' as const,
            hour: 'numeric' as const,
            month: 'numeric' as const,
            minute: 'numeric' as const,
            timeZone: 'America/New_York',
        };

        const endDateOptions = {
            hour12: true,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            timeZone: 'America/New_York',
            timeZoneName: 'short' as const,
        };

        // Format date and time
        const endDate = new Date(event.end_date);
        const startDate = new Date(event.start_date);
        const dateTime = `${new Intl.DateTimeFormat('en-US', startDateOptions).format(startDate)} - ${new Intl.DateTimeFormat('en-US', endDateOptions).format(endDate)}`;

        // Encode address for Google Maps URL
        const encodedAddress = decodeURIComponent(encodeURIComponent(event.address || ''));
        const mapsUrl = new URL('https://www.google.com/maps/search/');
        mapsUrl.searchParams.append('api', '1');
        mapsUrl.searchParams.append('query', encodedAddress);

        // Build event image HTML
        const eventImageHtml = event.image_url ? `<img src="${event.image_url}" class="event-image">` : '';

        // Build description section
        const descriptionSection = description !== ''
            ? `<p><strong>Details:</strong><span class="preserve-formatting">${cleanedDescription}</span></p>`
            : '';

        // Build RSVP button
        const rsvpButton = isInviteEmail
            ? `<p class="rsvp-button"><a href="${env.FRONT_URL}/event/${event.slug}">RSVP</a></p>`
            : '';

        // Build post event feedback button
        const postEventButton = isPostEventEmail
            ? `<p class="rsvp-button"><a href="${env.FRONT_URL}/notification">Tell Us What You Think</a></p>`
            : '';

        // Replace placeholders
        html = html
            .replace(/{{subject}}/g, subject)
            .replace(/{{dateTime}}/g, dateTime)
            .replace(/{{slug}}/g, event.slug || '')
            .replace(/{{rsvpButton}}/g, rsvpButton)
            .replace(/{{eventImage}}/g, eventImageHtml)
            .replace(/{{mapsUrl}}/g, mapsUrl.toString())
            .replace(/{{title}}/g, event.title || 'Event')
            .replace(/{{address}}/g, event.address || 'TBD')
            .replace(/{{postEventButton}}/g, postEventButton)
            .replace(/{{descriptionSection}}/g, descriptionSection)
            .replace(/{{year}}/g, new Date().getFullYear().toString())
            .replace(/{{hostName}}/g, (event as any)?.created_by_user?.name || 'N/A');

        return html;
    } catch (error: any) {
        loggerService.error(`Error generating event email: ${error.message}`);
        throw error;
    }
};

export const sendEventCreationEmail = async (
    event: Event,
    transaction?: Transaction
): Promise<Email> => {
    // Ensure event has host information loaded
    if (!(event as any).created_by_user) {
        await event.reload({
            include: [{
                model: User,
                as: 'created_by_user',
                attributes: ['id', 'name', 'email', 'mobile', 'username'],
            }],
            transaction,
        });
    }

    const host = (event as any).created_by_user;
    if (!host || !host.email) {
        loggerService.warn(`Event host not found or has no email for event: ${event.id}`);
        throw new Error('Event host email not found');
    }

    const subject = `Event: ${event.title || 'Event'}`;
    const html = await generateEventEmail(event, false, false);
    const from = `'Networked AI' <do-not-reply@net-worked.ai>`;

    return await createEmail(
        {
            html,
            from,
            subject,
            bcc: [host.email],
            type: EmailType.EVENT_CREATION,
        },
        transaction
    );
};

// Ensure event has host information loaded
const ensureEventHostLoaded = async (event: Event, transaction?: Transaction): Promise<void> => {
    if (!(event as any).created_by_user) {
        await event.reload({
            include: [{
                model: User,
                as: 'created_by_user',
                attributes: ['id', 'name', 'email'],
            }],
            transaction,
        });
    }
};

// Format event date and time for display
const formatEventDateTime = (startDate: Date, endDate: Date): string => {
    const dateTimeOptions: Intl.DateTimeFormatOptions = {
        hour12: true,
        day: 'numeric',
        year: '2-digit',
        hour: 'numeric',
        month: 'numeric',
        minute: 'numeric',
        timeZone: 'America/New_York',
    };

    const start = new Intl.DateTimeFormat('en-US', dateTimeOptions).format(startDate);
    const end = new Intl.DateTimeFormat('en-US', dateTimeOptions).format(endDate);
    return `${start} - ${end}`;
};

// Get all email addresses for event participants, attendees, and host
const getEventParticipantEmails = async (eventId: string, transaction?: Transaction): Promise<string[]> => {
    try {
        const emails: string[] = [];

        // Get event to find host (created_by)
        const event = await Event.findByPk(eventId, {
            attributes: ['created_by'],
            transaction,
        });

        if (event?.created_by) {
            const host = await User.findByPk(event.created_by, {
                attributes: ['email'],
                transaction,
            });
            if (host?.email) {
                emails.push(host.email);
            }
        }

        // Get all participants (co-host, sponsor, speaker, staff, host)
        const participants = await EventParticipant.findAll({
            where: {
                event_id: eventId,
                is_deleted: false,
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    required: true,
                    where: { is_deleted: false },
                    attributes: ['email'],
                },
            ],
            transaction,
        });

        for (const participant of participants) {
            const user = (participant as any).user;
            if (user?.email) {
                emails.push(user.email);
            }
        }

        // Get all attendees
        const attendees = await EventAttendee.findAll({
            where: {
                event_id: eventId,
                is_deleted: false,
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    required: true,
                    where: { is_deleted: false },
                    attributes: ['email'],
                },
            ],
            transaction,
        });

        for (const attendee of attendees) {
            const user = (attendee as any).user;
            if (user?.email) {
                emails.push(user.email);
            }
        }

        // Remove duplicates and filter out empty emails
        return [...new Set(emails.filter(email => email && email.trim() !== ''))];
    } catch (error: any) {
        loggerService.error(`Error getting event participant emails: ${error.message}`);
        return [];
    }
};

// Convert field name to readable format
const formatFieldName = (field: string): string => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

// Send event update email to all recipients
export const sendEventUpdatedEmail = async (event: Event, changedFields?: string[], transaction?: Transaction): Promise<Email> => {
    try {
        await ensureEventHostLoaded(event, transaction);

        // Get all recipient emails
        const recipientEmails = await getEventParticipantEmails(event.id, transaction);

        if (recipientEmails.length === 0) {
            loggerService.warn(`No recipients found for event update email: ${event.id}`);
            throw new Error('No recipients found for event update email');
        }

        // Read the HTML template
        const templatePath = path.join(__dirname, '../contents/event-updated-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        const dateTime = formatEventDateTime(new Date(event.start_date), new Date(event.end_date));
        const hostName = (event as any)?.created_by_user?.name || 'Host';

        // Build changes section if fields changed
        const changesSection = changedFields && changedFields.length > 0
            ? `<div class="changes-section">
                <p><strong>What's Changed:</strong></p>
                <ul>
                    ${changedFields.map(field => `<li>${formatFieldName(field)}</li>`).join('')}
                </ul>
            </div>`
            : '';

        html = html
            .replace(/{{recipientName}}/g, 'there')
            .replace(/{{eventTitle}}/g, event.title || 'Event')
            .replace(/{{dateTime}}/g, dateTime)
            .replace(/{{location}}/g, event.address || 'TBD')
            .replace(/{{hostName}}/g, hostName)
            .replace(/{{changesSection}}/g, changesSection)
            .replace(/{{slug}}/g, event.slug || '')
            .replace(/{{year}}/g, new Date().getFullYear().toString());

        const subject = `Event Updated: ${event.title}`;

        return await createEmail(
            {
                html,
                subject,
                user_id: null,
                bcc: recipientEmails,
                type: EmailType.EVENT_UPDATE,
                from: '"Networked AI" <do-not-reply@net-worked.ai>',
                created_by: (event as any)?.created_by_user?.id || null,
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending event updated email: ${error.message}`);
        throw error;
    }
};

// Send event deletion/cancellation email to all recipients
export const sendEventDeletedEmail = async (event: Event, transaction?: Transaction): Promise<Email> => {
    try {
        await ensureEventHostLoaded(event, transaction);

        // Get all recipient emails
        const recipientEmails = await getEventParticipantEmails(event.id, transaction);

        if (recipientEmails.length === 0) {
            loggerService.warn(`No recipients found for event deletion email: ${event.id}`);
            throw new Error('No recipients found for event deletion email');
        }

        const templatePath = path.join(__dirname, '../contents/event-deleted-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        const dateTime = formatEventDateTime(new Date(event.start_date), new Date(event.end_date));
        const hostName = (event as any)?.created_by_user?.name || 'Host';

        html = html
            .replace(/{{hostName}}/g, hostName)
            .replace(/{{dateTime}}/g, dateTime)
            .replace(/{{recipientName}}/g, 'there')
            .replace(/{{location}}/g, event.address || 'TBD')
            .replace(/{{eventTitle}}/g, event.title || 'Event')
            .replace(/{{year}}/g, new Date().getFullYear().toString());

        const subject = `Event Cancelled: ${event.title}`;

        return await createEmail(
            {
                html,
                subject,
                user_id: null,
                bcc: recipientEmails,
                type: EmailType.EVENT_DELETION,
                from: '"Networked AI" <do-not-reply@net-worked.ai>',
                created_by: (event as any)?.created_by_user?.id || null,
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending event deleted email: ${error.message}`);
        throw error;
    }
};

export const sendEventRoleAssignmentEmail = async (
    event: Event,
    recipientEmail: string,
    recipientName: string,
    role: EventParticipantRole,
    transaction?: Transaction
): Promise<Email> => {
    try {
        // Ensure event has host information loaded
        if (!(event as any).created_by_user) {
            await event.reload({
                include: [{
                    model: User,
                    as: 'created_by_user',
                    attributes: ['id', 'name', 'email'],
                }],
                transaction,
            });
        }

        // Read the HTML template
        const templatePath = path.join(__dirname, '../contents/event-role-assignment-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        // Format date and time
        const dateTime = formatEventDateTime(new Date(event.start_date), new Date(event.end_date));
        const hostName = (event as any)?.created_by_user?.name || 'Host';

        // Replace placeholders
        html = html
            .replace(/{{roleName}}/g, role)
            .replace(/{{dateTime}}/g, dateTime)
            .replace(/{{hostName}}/g, hostName)
            .replace(/{{slug}}/g, event.slug || '')
            .replace(/{{recipientName}}/g, recipientName)
            .replace(/{{address}}/g, event.address || 'TBD')
            .replace(/{{eventTitle}}/g, event.title || 'Event')
            .replace(/{{year}}/g, new Date().getFullYear().toString());

        const subject = `You've been assigned as ${role} for ${event.title}`;

        return await createEmail(
            {
                html,
                subject,
                bcc: [recipientEmail],
                type: EmailType.EVENT_ROLE_ASSIGNMENT,
                from: '"Networked AI" <do-not-reply@net-worked.ai>',
                created_by: (event as any)?.created_by_user?.id || null,
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending event role assignment email: ${error.message}`);
        throw error;
    }
};

export const sendPostShareEmail = async (senderName: string, feedId: string, feedContent: string, recipientUserIds: string[], transaction?: Transaction): Promise<Email | null> => {
    try {
        if (!recipientUserIds || recipientUserIds.length === 0) return null;

        // Get recipient emails
        const recipients = await User.findAll({
            where: {
                id: recipientUserIds,
                is_deleted: false
            },
            attributes: ['email'],
            transaction
        });

        const recipientEmails = recipients.map((user: any) => user.email).filter((email: string) => email && email.trim() !== '');
        if (recipientEmails.length === 0) return null;

        // Read the HTML template
        const templatePath = path.join(__dirname, '../contents/post-share-email.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        // Build post URL
        const postUrl = `${env.FRONT_URL}/post/${feedId}`;

        // Replace placeholders
        html = html
            .replace(/{{postUrl}}/g, postUrl)
            .replace(/{{senderName}}/g, senderName || 'Someone')
            .replace(/{{year}}/g, new Date().getFullYear().toString())
            .replace(/{{postText}}/g, feedContent || 'Check out this post!');

        const safeSenderName = String(senderName || 'Networked AI').replace(/"/g, '');
        const subject = `${safeSenderName} shared a post with you`;

        return await createEmail(
            {
                html,
                subject,
                bcc: recipientEmails,
                type: EmailType.POST_SHARE,
                from: `"${safeSenderName}" <do-not-reply@net-worked.ai>`,
            },
            transaction
        );
    } catch (error: any) {
        loggerService.error(`Error sending post share email: ${error.message}`);
        return null;
    }
};

export const sendNetworkBroadcastEmail = async (event: Event, recipientUserIds: string[], senderId: string, transaction?: Transaction): Promise<Email | null> => {
    try {
        if (!recipientUserIds || recipientUserIds.length === 0) return null;

        // Get recipient emails
        const recipients = await User.findAll({
            where: {
                id: recipientUserIds,
                is_deleted: false
            },
            attributes: ['email'],
            transaction
        });

        const recipientEmails = recipients.map((user: any) => user.email).filter((email: string) => email && email.trim() !== '');
        if (recipientEmails.length === 0) return null;

        // Ensure event has host information loaded
        if (!(event as any).created_by_user) {
            await event.reload({
                include: [{
                    model: User,
                    as: 'created_by_user',
                    attributes: ['id', 'name', 'email', 'username'],
                    required: false,
                }],
                transaction,
            });
        }

        // Get sender information
        const sender = await User.findByPk(senderId, {
            attributes: ['id', 'name', 'username'],
            transaction
        });

        const senderName = sender?.name || sender?.username || 'Networked AI';
        const safeSenderName = String(senderName).replace(/"/g, '');

        // Generate email HTML using generateEventEmail (as invite email)
        const html = await generateEventEmail(event, true, false);
        const subject = `You're Invited: ${event.title || 'Event'}`;

        return await createEmail({
            html,
            subject,
            bcc: recipientEmails,
            created_by: senderId,
            type: EmailType.NETWORK_BROADCAST,
            from: `"${safeSenderName}" <do-not-reply@net-worked.ai>`,
        }, transaction);
    } catch (error: any) {
        loggerService.error(`Error sending network broadcast email: ${error.message}`);
        return null;
    }
};

export default {
    sendWelcomeEmail,
    generateEventEmail,
    sendPostShareEmail,
    sendEventUpdatedEmail,
    sendEventDeletedEmail,
    sendEventCreationEmail,
    sendNetworkRequestEmail,
    sendEventRoleRemovalEmail,
    sendNetworkBroadcastEmail,
    sendRsvpRequestEmailToHost,
    sendEventRoleAssignmentEmail,
    sendRsvpConfirmationEmailToHost,
    sendNetworkRequestAcceptedEmail,
    sendRsvpConfirmationEmailToGuest,
    sendRsvpRequestApprovedEmailToRequester,
    sendRsvpRequestRejectedEmailToRequester,
};
