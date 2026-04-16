export const FOUNDER = {
  firstName: 'Chandler',
  lastName: 'Merrill',
  fullName: 'Chandler Merrill',
  title: 'Founder',
  company: 'Syntric',
  email: 'chandler@syntriclabs.com',
  phone: '+1-801-518-7571',
  calendlyUrl: 'https://calendly.com/chandler-syntriclabs/30min',
  brandFromEmail: 'contact@syntriclabs.com',
} as const

export const FOUNDER_PROMPT_BLOCK = `## About the Founder
- Name: ${FOUNDER.fullName} (goes by ${FOUNDER.firstName})
- Title: ${FOUNDER.title}, ${FOUNDER.company}
- Email: ${FOUNDER.email}
- Phone: ${FOUNDER.phone}
- Calendly: ${FOUNDER.calendlyUrl}`
