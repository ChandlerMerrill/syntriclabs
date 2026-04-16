interface ContactNotificationProps {
  name: string
  email: string
  phone?: string
  company?: string
  preferredContact?: string
  service?: string
  improvements?: string[]
  message: string
}

export function ContactNotificationEmail({
  name,
  email,
  phone,
  company,
  preferredContact,
  service,
  improvements,
  message,
}: ContactNotificationProps) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ padding: '24px', backgroundColor: '#0F172A', borderRadius: '8px' }}>
        <h2 style={{ color: '#F8FAFC', margin: '0 0 20px', fontSize: '20px' }}>
          New Contact Form Submission
        </h2>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <Row label="Name" value={name} />
            <Row label="Email" value={email} />
            {phone && <Row label="Phone" value={phone} />}
            {company && <Row label="Company" value={company} />}
            {preferredContact && <Row label="Preferred Contact" value={preferredContact} />}
            {service && <Row label="Service" value={service} />}
            {improvements && improvements.length > 0 && (
              <Row label="Improvements" value={improvements.join(', ')} />
            )}
          </tbody>
        </table>

        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#1E293B', borderRadius: '6px' }}>
          <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Message
          </p>
          <p style={{ color: '#F8FAFC', margin: 0, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {message}
          </p>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a
            href={`mailto:${email}`}
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Reply to {name}
          </a>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: '8px 12px 8px 0', color: '#94A3B8', fontSize: '13px', verticalAlign: 'top', width: '140px' }}>
        {label}
      </td>
      <td style={{ padding: '8px 0', color: '#F8FAFC', fontSize: '14px' }}>
        {value}
      </td>
    </tr>
  )
}
