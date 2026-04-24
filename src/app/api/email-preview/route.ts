import { renderBrandedEmail } from '@/lib/email/branded-template'

const SAMPLE_BODY = `Hi Sarah,

Thanks for reaching out about the multi-tenant platform you mentioned. Based on what you shared, I think we could put together something workable in 2-3 weeks rather than the 8-week timeline the other quote suggested.

A few quick thoughts:

- The vendor portal sounds similar to what we built for Esoteric Productions
- Stripe payment links work well for the order flow you described
- Inventory tracking can run on Supabase to keep monthly costs down

Want to grab 30 minutes to walk through it? I've blocked some time on Calendly — pick whatever works.

Talk soon,
Chandler`

export async function GET() {
  let html = renderBrandedEmail(SAMPLE_BODY)
  html = html.replaceAll('https://www.syntriclabs.com/images/', 'http://localhost:3000/images/')
  return new Response(html, { headers: { 'content-type': 'text/html' } })
}
