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

function esc(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 12px 8px 0;color:#94A3B8;font-size:13px;vertical-align:top;width:140px">${esc(label)}</td>
    <td style="padding:8px 0;color:#F8FAFC;font-size:14px">${esc(value)}</td>
  </tr>`
}

export function buildLeadNotificationHtml({
  firstName,
  lastName,
  email,
  phone,
  organization,
  role,
  serviceInterest,
  request,
  summary,
  preferredContact,
}: LeadNotificationProps): string {
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown'

  const rows = [
    row('Name', name),
    email ? row('Email', email) : '',
    phone ? row('Phone', phone) : '',
    organization ? row('Organization', organization) : '',
    role ? row('Role', role) : '',
    preferredContact ? row('Preferred Contact', preferredContact) : '',
    serviceInterest ? row('Service Interest', serviceInterest) : '',
    request ? row('Request', request) : '',
  ].filter(Boolean).join('')

  const summaryBlock = summary
    ? `<div style="margin-top:20px;padding:16px;background-color:#1E293B;border-radius:6px">
        <p style="color:#94A3B8;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px">Summary</p>
        <p style="color:#F8FAFC;margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(summary)}</p>
      </div>`
    : ''

  const replyButton = email
    ? `<div style="margin-top:20px;text-align:center">
        <a href="mailto:${esc(email)}" style="display:inline-block;padding:10px 24px;background-color:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">Reply to ${esc(name)}</a>
      </div>`
    : ''

  return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
    <div style="padding:24px;background-color:#0F172A;border-radius:8px">
      <h2 style="color:#F8FAFC;margin:0 0 20px;font-size:20px">New Widget Lead</h2>
      <table style="width:100%;border-collapse:collapse"><tbody>${rows}</tbody></table>
      ${summaryBlock}
      ${replyButton}
    </div>
  </div>`
}
