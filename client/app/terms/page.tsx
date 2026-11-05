import type { Metadata } from 'next'
import TermsContent from './TermsContent'

export const metadata: Metadata = {
  title: 'Terms & Conditions — Darklynk',
  description:
    'Legal terms, acceptable use policy, and operational privacy protocol governing ephemeral, private text rooms on Darklynk.',
  keywords: [
    'Darklynk terms',
    'ephemeral chat terms',
    'privacy policy',
    'acceptable use policy',
    'zero-retention messaging',
    'private temporary conversations',
  ],
}

export default function TermsPage() {
  return <TermsContent />
}
