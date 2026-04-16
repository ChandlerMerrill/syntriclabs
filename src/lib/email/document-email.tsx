interface DocumentEmailProps {
  documentTitle: string
  documentType: string
  clientName: string
  message?: string
}

export function DocumentEmail({
  documentTitle,
  documentType,
  clientName,
  message,
}: DocumentEmailProps) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ padding: '24px', backgroundColor: '#0F172A', borderRadius: '8px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#F8FAFC', margin: '0 0 4px', fontSize: '22px', fontWeight: '600' }}>
            Syntric Labs
          </h1>
          <p style={{ color: '#94A3B8', margin: 0, fontSize: '13px' }}>
            Web Development & AI Consulting
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', backgroundColor: '#1E293B', borderRadius: '6px', marginBottom: '20px' }}>
          <p style={{ color: '#F8FAFC', margin: '0 0 12px', fontSize: '16px', fontWeight: '500' }}>
            Hi {clientName},
          </p>
          <p style={{ color: '#CBD5E1', margin: '0 0 16px', fontSize: '14px', lineHeight: '1.6' }}>
            Please find the attached <strong style={{ color: '#F8FAFC' }}>{documentType}</strong> for your review:
          </p>

          {/* Document info */}
          <div style={{ padding: '12px 16px', backgroundColor: '#0F172A', borderRadius: '6px', borderLeft: '3px solid #2563EB' }}>
            <p style={{ color: '#F8FAFC', margin: 0, fontSize: '14px', fontWeight: '500' }}>
              {documentTitle}
            </p>
            <p style={{ color: '#94A3B8', margin: '4px 0 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {documentType}
            </p>
          </div>

          {message && (
            <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#0F172A', borderRadius: '6px' }}>
              <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Message
              </p>
              <p style={{ color: '#F8FAFC', margin: 0, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {message}
              </p>
            </div>
          )}

          <p style={{ color: '#CBD5E1', margin: '16px 0 0', fontSize: '14px', lineHeight: '1.6' }}>
            If you have any questions, feel free to reply to this email.
          </p>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>
            Syntric Labs &middot; syntriclabs.com
          </p>
        </div>
      </div>
    </div>
  )
}
