import {
  renderInternalNotification,
  type NotificationRow,
} from './internal-notification'

/**
 * The three things the chat widget can send to Chandler's inbox.
 *
 * They share a shape on purpose. A lead, a request, and an escalation are the
 * same event at different temperatures — someone on the site wants a person —
 * and the only differences that matter in the inbox are the accent colour, the
 * heading, and how loud the ask was. Everything downstream (rows, prose blocks,
 * the single reply button) is common, so it lives in one builder.
 */

interface LeadNotificationProps {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  organization?: string
  role?: string
  serviceInterest?: string
  request?: string
  summary?: string
  preferredContact?: string
}

const CONTACT_LABEL: Record<string, string> = {
  phone: 'Phone call',
  email: 'Email',
  sms: 'Text message',
}

function displayName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim()
}

/** Rows every notification carries, in the order they're useful to act on. */
function contactRows(p: LeadNotificationProps): NotificationRow[] {
  const name = displayName(p.firstName, p.lastName)
  return [
    { label: 'Name', value: name || 'Not given' },
    p.email ? { label: 'Email', value: p.email, href: `mailto:${p.email}` } : null,
    p.phone ? { label: 'Phone', value: p.phone, href: `tel:${p.phone.replace(/[^\d+]/g, '')}` } : null,
    p.organization ? { label: 'Business', value: p.organization } : null,
    p.role ? { label: 'Role', value: p.role } : null,
    p.preferredContact
      ? { label: 'Reach them by', value: CONTACT_LABEL[p.preferredContact] ?? p.preferredContact }
      : null,
    p.serviceInterest ? { label: 'Interested in', value: p.serviceInterest } : null,
  ].filter((r): r is NotificationRow => r !== null)
}

/** The reply button, when there's anything to reply to. */
function replyCta(p: LeadNotificationProps, subject: string) {
  const name = displayName(p.firstName, p.lastName)
  if (p.email) {
    return {
      url: `mailto:${p.email}?subject=${encodeURIComponent(subject)}`,
      label: name ? `Reply to ${name.split(' ')[0]}` : 'Reply by email',
    }
  }
  if (p.phone) {
    return {
      url: `tel:${p.phone.replace(/[^\d+]/g, '')}`,
      label: name ? `Call ${name.split(' ')[0]}` : 'Call them',
    }
  }
  return null
}

export function buildLeadNotificationHtml(props: LeadNotificationProps): string {
  return renderInternalNotification({
    kind: 'lead',
    title: 'New lead from the site',
    subtitle: 'Captured by the chat assistant on syntriclabs.com',
    rows: contactRows(props),
    blocks: [
      props.request ? { label: 'What they asked for', body: props.request } : null,
      props.summary ? { label: 'Conversation summary', body: props.summary } : null,
    ].filter((b): b is { label: string; body: string } => b !== null),
    cta: replyCta(props, 'Following up from syntriclabs.com'),
  })
}

export interface RequestNotificationProps extends LeadNotificationProps {
  /** The visitor's own words, typed into the request form. */
  details: string
  /** Which page they were on when they sent it. */
  pathname?: string
  /** How urgent they said it was. */
  urgency?: 'whenever' | 'this_week' | 'urgent'
  sessionId?: string
  conversationId?: string | null
}

const URGENCY_LABEL: Record<string, string> = {
  whenever: 'Whenever you get to it',
  this_week: 'Sometime this week',
  urgent: 'As soon as possible',
}

/**
 * Someone filled in the request form inside the chat widget and pressed send.
 *
 * This is the highest-intent thing the widget produces: they didn't just leave a
 * name behind, they wrote out an ask and addressed it to a person. The email
 * leads with their words, not with the metadata.
 */
export function buildRequestNotificationHtml(props: RequestNotificationProps): string {
  const rows = contactRows(props)
  if (props.urgency) {
    rows.push({ label: 'Timing', value: URGENCY_LABEL[props.urgency] ?? props.urgency })
  }
  if (props.pathname) {
    rows.push({ label: 'Sent from', value: `syntriclabs.com${props.pathname}` })
  }

  const footnoteParts = [
    props.sessionId ? `session ${props.sessionId}` : null,
    props.conversationId ? `conversation ${props.conversationId}` : null,
  ].filter(Boolean)

  return renderInternalNotification({
    kind: 'request',
    title: 'Someone sent you a request',
    subtitle: 'Submitted through the chat assistant on syntriclabs.com',
    rows,
    blocks: [
      { label: 'What they need', body: props.details },
      props.summary ? { label: 'Conversation summary', body: props.summary } : null,
    ].filter((b): b is { label: string; body: string } => b !== null),
    cta: replyCta(props, 'Re: your request through syntriclabs.com'),
    footnote: footnoteParts.length > 0 ? footnoteParts.join('  ·  ') : undefined,
  })
}

export interface EscalationNotificationProps extends LeadNotificationProps {
  /** Why the assistant decided this needed a person. */
  reason: string
  sessionId?: string
  conversationId?: string | null
}

/**
 * The assistant hit the end of what it could answer and handed off.
 *
 * Amber rather than green: nobody asked for this one, which makes it the case
 * where a slow reply is most likely to lose the conversation.
 */
export function buildEscalationNotificationHtml(props: EscalationNotificationProps): string {
  const footnoteParts = [
    props.sessionId ? `session ${props.sessionId}` : null,
    props.conversationId ? `conversation ${props.conversationId}` : null,
  ].filter(Boolean)

  return renderInternalNotification({
    kind: 'escalation',
    title: 'The assistant handed one off',
    subtitle: 'A visitor needed something the knowledge base could not answer',
    rows: contactRows(props),
    blocks: [
      { label: 'Why it escalated', body: props.reason },
      props.summary ? { label: 'Conversation summary', body: props.summary } : null,
    ].filter((b): b is { label: string; body: string } => b !== null),
    cta: replyCta(props, 'Following up from syntriclabs.com'),
    footnote: footnoteParts.length > 0 ? footnoteParts.join('  ·  ') : undefined,
  })
}
