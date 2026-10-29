'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import {
  ShieldCheck,
  LockKeyhole,
  Clock3,
  UserRoundX,
  Search,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  ExternalLink,
  Flame,
  Scale,
  FileText,
  Mail,
  X,
  Share2
} from 'lucide-react'

interface LegalSection {
  id: string
  number: string
  title: string
  shortTitle: string
  category: 'core' | 'rights' | 'liability' | 'legal'
  summary?: string
  content: React.ReactNode
}

export default function TermsContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState('acceptance')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [mobileTocOpen, setMobileTocOpen] = useState(false)

  // Copy helper with feedback
  const handleCopyLink = (sectionId?: string) => {
    const url = sectionId
      ? `${window.location.origin}/terms#${sectionId}`
      : `${window.location.origin}/terms`

    navigator.clipboard.writeText(url).then(() => {
      if (sectionId) {
        setCopiedId(sectionId)
        setTimeout(() => setCopiedId(null), 2000)
      }
      setToastMessage('Link copied to clipboard')
      setTimeout(() => setToastMessage(null), 2500)
    })
  }

  // Print helper
  const handlePrint = () => {
    window.print()
  }

  // Active section scroll spy via IntersectionObserver
  useEffect(() => {
    const sectionElements = document.querySelectorAll('section[data-legal-section]')
    if (!sectionElements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    )

    sectionElements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const sections: LegalSection[] = useMemo(
    () => [
      {
        id: 'acceptance',
        number: '01',
        title: 'Acceptance of Terms & Operational Agreement',
        shortTitle: 'Acceptance of Terms',
        category: 'core',
        summary:
          'Accessing or utilizing Darklynk constitutes a legally binding agreement to these Terms.',
        content: (
          <div className="space-y-4">
            <p>
              Welcome to <strong>Darklynk</strong> (also referenced herein as &ldquo;Darklink,&rdquo;
              &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;the Platform&rdquo;). These Terms and
              Conditions (&ldquo;Terms&rdquo;) form a legally binding agreement between you
              (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;Participant&rdquo;) and the operators of
              Darklynk.
            </p>
            <p>
              By accessing, browsing, creating a room, joining a session, or transmitting data through
              Darklynk, you explicitly acknowledge that you have read, understood, and agreed to be
              unconditionally bound by these Terms and all applicable local, national, and
              international laws and regulations.
            </p>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-zinc-300 font-mono">
              <span className="text-[#00ff66] font-bold">// NOTICE OF BINDING ARBITRATION &amp; WAIVER:</span>
              <p className="mt-1 text-zinc-400">
                IF YOU DO NOT AGREE TO THESE TERMS IN THEIR ENTIRETY, YOU MUST NOT ACCESS THE APPLICATION,
                CREATE A ROOM, OR TRANSMIT ANY COMMUNICATIONS THROUGH DARKLYNK.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'ephemeral-protocol',
        number: '02',
        title: 'The Ephemeral Protocol & Instant Data Destruction',
        shortTitle: 'Ephemeral Protocol',
        category: 'core',
        summary:
          'Rooms operate with fixed time limits. Upon expiration or exit, all message data in memory is permanently destroyed.',
        content: (
          <div className="space-y-4">
            <p>
              Darklynk is designed from first principles as an <strong>ephemeral communication protocol</strong>.
              Unlike traditional messaging platforms that persist chat histories on cloud servers or local
              device storage, Darklynk provides transient, time-bounded text channels.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/60 p-4">
                <div className="flex items-center gap-2 font-mono text-xs text-[#00ff66]">
                  <Clock3 className="h-4 w-4" />
                  <span>SESSION DURATION LIMITS</span>
                </div>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Chat rooms are initialized with a strict timer chosen by the creator (typically 15,
                  30, or 60 minutes, up to a maximum platform ceiling). The countdown begins once the host
                  and at least one participant have established a connection.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/60 p-4">
                <div className="flex items-center gap-2 font-mono text-xs text-[#00ff66]">
                  <Flame className="h-4 w-4" />
                  <span>IRREVERSIBLE PURGING</span>
                </div>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Upon countdown completion, or when an administrative user terminates the room, all
                  active WebSocket channels are closed and in-memory room caches are immediately and
                  permanently deleted.
                </p>
              </div>
            </div>
            <p>
              <strong>Technical Impossibility of Data Recovery:</strong> Because message records are
              never committed to persistent disk storage, neither the platform operators, our hosting
              infrastructure, nor any third party possesses the technological capability to restore,
              retrieve, or reconstruct a conversation once a room has elapsed or closed.
            </p>
          </div>
        ),
      },
      {
        id: 'zero-retention',
        number: '03',
        title: 'Zero Data Retention & Privacy Framework',
        shortTitle: 'Zero Retention & Privacy',
        category: 'core',
        summary:
          'No message databases, no persistent IP registries, no advertising trackers, and no selling of data.',
        content: (
          <div className="space-y-4">
            <p>
              Darklynk maintains an absolute <strong>Zero Data Retention Architecture</strong> for user
              conversations. We believe privacy should not rely on corporate goodwill, but rather on
              technical guarantees.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300">
              <li>
                <strong className="text-white">No Message Databases:</strong> We do not operate a SQL,
                NoSQL, or document database storing chat transcriptions. Messages exist in RAM solely
                long enough to relay packets across active participant sockets.
              </li>
              <li>
                <strong className="text-white">No Tracking Cookies or Third-Party Analytics:</strong>{' '}
                We do not employ cross-site tracking cookies, marketing pixels, social trackers, or
                behavioral advertising frameworks.
              </li>
              <li>
                <strong className="text-white">Local Browser Storage:</strong> Darklynk utilizes minimal
                client-side temporary storage (such as browser <code>sessionStorage</code>) exclusively
                for maintaining active room connection state. This state is purged automatically when you
                leave the room or close your browser tab.
              </li>
              <li>
                <strong className="text-white">Transient Infrastructure Routing:</strong> Ephemeral
                connection packets pass through network transit nodes strictly for routing real-time
                traffic and mitigating denial-of-service attempts. These transit records are not
                correlated with room contents.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'no-accounts',
        number: '04',
        title: 'Accountless Architecture & Pseudonymous Handles',
        shortTitle: 'Accountless Architecture',
        category: 'core',
        summary:
          'No email registration, passwords, or personal profiles. Handles exist only for the session duration.',
        content: (
          <div className="space-y-4">
            <p>
              Darklynk does not provide, require, or support permanent user accounts. There are no
              passwords to remember, no email verifications, and no persistent identities.
            </p>
            <p>
              When joining or creating a room, you submit a temporary handle. This handle is used solely
              within that individual room session to distinguish participants.
            </p>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4 text-xs text-amber-200/90 font-mono">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>NO IDENTITY VERIFICATION OR RESERVATION:</span>
              </div>
              <p className="mt-1 leading-relaxed text-zinc-400">
                Handles are not unique across different rooms and are never reserved. Darklynk does not
                verify the identity of any participant. You must exercise caution and your own judgment
                when conversing with handles in any room.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'room-codes',
        number: '05',
        title: 'Cryptographic Codes & Administrative Authority',
        shortTitle: 'Room Codes & Admin',
        category: 'core',
        summary:
          '8-character room and admin codes govern session entry and moderation. You are solely responsible for code security.',
        content: (
          <div className="space-y-4">
            <p>
              Access control within Darklynk is orchestrated using cryptographically pseudo-random
              alphanumeric codes:
            </p>
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
                <span className="font-mono text-[#00ff66] font-bold">1. Room Code:</span>
                <p className="mt-1 text-zinc-400">
                  Shared by the room host with intended participants. Anyone possessing the Room Code
                  can enter until the designated participant capacity (2 to 20 users) is reached.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
                <span className="font-mono text-[#00ff66] font-bold">2. Admin Code:</span>
                <p className="mt-1 text-zinc-400">
                  Private to the room creator and tied to their chosen handle. Grants elevated
                  administrative capabilities, such as promoting members or prematurely ending the
                  session.
                </p>
              </div>
            </div>
            <p>
              <strong>User Responsibility for Code Confidentiality:</strong> You are solely responsible
              for safeguarding both Room Codes and Admin Codes. If you disclose a Room Code publicly,
              unintended third parties may join your session. Darklynk operators cannot recover lost
              Admin Codes or revoke access once a room code has been compromised by the user.
            </p>
          </div>
        ),
      },
      {
        id: 'eligibility',
        number: '06',
        title: 'Eligibility & User Capacity',
        shortTitle: 'Eligibility',
        category: 'rights',
        summary:
          'Must be at least 13 years of age (or 16 in select jurisdictions) and possess legal capacity.',
        content: (
          <div className="space-y-4">
            <p>
              By accessing or using Darklynk, you represent and warrant that:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-zinc-300">
              <li>
                You are at least <strong>13 years of age</strong> (or <strong>16 years of age</strong> in
                jurisdictions where local data protection legislation, such as the European General Data
                Protection Regulation, requires a higher minimum age for autonomous digital consent).
              </li>
              <li>
                If you are under the legal age of majority in your jurisdiction, you have obtained the
                affirmative consent of your parent or legal guardian to use the Service.
              </li>
              <li>
                You have the full power, capacity, and legal authority to enter into these Terms.
              </li>
              <li>
                Your use of Darklynk does not violate any applicable local, state, national, or
                international law or regulation.
              </li>
            </ol>
          </div>
        ),
      },
      {
        id: 'acceptable-use',
        number: '07',
        title: 'Acceptable Use Policy & Prohibited Conduct',
        shortTitle: 'Acceptable Use Policy',
        category: 'rights',
        summary:
          'Strict prohibitions against illegal activities, malware, CSAM, harassment, and infrastructure abuse.',
        content: (
          <div className="space-y-4">
            <p>
              Darklynk is committed to safeguarding fundamental digital privacy for legitimate, lawful
              human interaction. You agree that you will not use Darklynk to facilitate, execute, or
              support any unlawful, harmful, or abusive conduct.
            </p>
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-5">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span>EXPRESSLY PROHIBITED ACTIVITIES:</span>
              </div>
              <ul className="mt-3 list-disc pl-5 space-y-2 text-xs text-zinc-300 leading-relaxed">
                <li>
                  <strong>Child Sexual Exploitation and Abuse:</strong> Any creation, solicitation,
                  transmission, or dissemination of Child Sexual Abuse Material (CSAM) or Child Sexual
                  Exploitation and Abuse (CSAE) is subject to zero tolerance.
                </li>
                <li>
                  <strong>Malware &amp; Exploit Payloads:</strong> Dissemination of viruses, trojans,
                  worms, keystroke loggers, spyware, or malicious code designed to compromise participant
                  devices or server nodes.
                </li>
                <li>
                  <strong>Physical Violence &amp; Terrorism:</strong> Promoting violent extremism,
                  coordinating violent crimes, illicit arms trafficking, or credible threats against human
                  safety.
                </li>
                <li>
                  <strong>Harassment, Extortion &amp; Doxxing:</strong> Targeted stalking, cyberbullying,
                  extortion, or distributing unauthorized private personal information.
                </li>
                <li>
                  <strong>Infrastructure Disruption:</strong> Launching denial-of-service (DoS/DDoS)
                  attacks, packet flooding, bot-driven room exhaustion, stress-testing our WebSocket
                  clusters, or tampering with room duration counters.
                </li>
                <li>
                  <strong>Protocol Circumvention:</strong> Reverse-engineering, injecting malicious
                  frames, or attempting to compromise memory boundaries of other active rooms.
                </li>
              </ul>
            </div>
            <p className="text-xs text-zinc-400">
              Violations of this section may result in immediate IP-level network throttling, connection
              revocation, and where required by mandatory criminal statutes, cooperation with recognized
              law enforcement agencies.
            </p>
          </div>
        ),
      },
      {
        id: 'user-content',
        number: '08',
        title: 'User-Generated Content & Neutral Intermediary Status',
        shortTitle: 'Content & Intermediary Status',
        category: 'rights',
        summary:
          'Darklynk acts as a neutral conduit and does not monitor private room content. Users bear sole responsibility.',
        content: (
          <div className="space-y-4">
            <p>
              Darklynk functions purely as a <strong>neutral technological conduit</strong> and passive
              communications utility. We do not preview, moderate, alter, screen, or curate messages
              transmitted between room participants.
            </p>
            <p>
              <strong>Sole User Responsibility:</strong> You acknowledge and agree that you are
              exclusively responsible for any content, statements, links, or media descriptions you
              transmit into a Darklynk room. Darklynk neither endorses nor verifies user content and
              disclaims all liability related to communications between participants.
            </p>
            <p>
              <strong>Safe Harbor Protections:</strong> In accordance with statutory protections
              accorded to telecommunications and interactive computer conduits (including Section 230 of
              the Communications Decency Act and equivalent international directives), Darklynk shall
              not be held liable as the publisher or speaker of any information provided by another
              information content provider.
            </p>
          </div>
        ),
      },
      {
        id: 'intellectual-property',
        number: '09',
        title: 'Intellectual Property Rights & Software License',
        shortTitle: 'Intellectual Property',
        category: 'rights',
        summary:
          'Darklynk owns its platform, design, and code. You own your transmitted words.',
        content: (
          <div className="space-y-4">
            <p>
              <strong>Platform Ownership:</strong> All intellectual property rights in and to the
              Darklynk application, including but not limited to the source code, visual design, user
              interfaces, graphics, brand identity, &ldquo;darklynk&rdquo; name, logo, typography, and
              ephemeral protocol architecture, are the exclusive property of Darklynk and its licensors.
            </p>
            <p>
              <strong>Limited User License:</strong> We grant you a revocable, non-exclusive,
              non-transferable, limited license to access and interact with the Darklynk web interface
              solely for personal, non-commercial communication purposes in compliance with these Terms.
            </p>
            <p>
              <strong>No Claim on User Communications:</strong> Darklynk claims zero ownership,
              copyright, or licensing rights over the text messages transmitted across our ephemeral
              channels. You retain whatever intellectual property rights you hold in your communications.
            </p>
          </div>
        ),
      },
      {
        id: 'fees-subscriptions',
        number: '10',
        title: 'Fees, Payments & Absence of Subscriptions',
        shortTitle: 'Fees & Subscriptions',
        category: 'rights',
        summary:
          'Darklynk is provided free of charge. No payment card processing or recurring charges currently exist.',
        content: (
          <div className="space-y-4">
            <p>
              Darklynk is provided to the public as a <strong>free privacy utility</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300 text-sm">
              <li>There are no user subscription fees, paywalls, or periodic billing models.</li>
              <li>We do not request, process, or store credit card numbers, bank details, or crypto wallets.</li>
              <li>No refunds or cancellations apply as no commercial transactions occur.</li>
            </ul>
            <p className="text-xs text-zinc-400">
              Should Darklynk ever introduce optional enterprise-grade deployments or dedicated hosting
              tiers, such features will be governed by explicit supplemental commercial contracts and
              transparent terms established prior to billing.
            </p>
          </div>
        ),
      },
      {
        id: 'third-party-services',
        number: '11',
        title: 'Third-Party Services & External Hyperlinks',
        shortTitle: 'Third-Party Links',
        category: 'rights',
        summary:
          'We rely on third-party hosting infrastructure. External links posted by users are clicked at your own risk.',
        content: (
          <div className="space-y-4">
            <p>
              <strong>Infrastructure Dependencies:</strong> Darklynk utilizes third-party infrastructure
              providers (such as cloud hosting, DNS providers, and content delivery networks) to host our
              frontend and manage WebSocket transmission. We are not responsible for downtime, latency, or
              service interruptions caused by upstream provider failures.
            </p>
            <p>
              <strong>User-Shared Hyperlinks:</strong> Participants in a room may post hyperlinks leading
              to third-party websites or services. Darklynk has no control over, does not verify, and
              assumes no responsibility for the content, privacy policies, safety, or practices of any
              third-party web destinations. You access external links entirely at your own risk.
            </p>
          </div>
        ),
      },
      {
        id: 'emergency-disclaimer',
        number: '12',
        title: 'Critical Emergency Services Disclaimer',
        shortTitle: 'Emergency Disclaimer',
        category: 'liability',
        summary:
          'Darklynk is NOT an emergency communication service and cannot be used for 911, 999, 112, or life-safety calls.',
        content: (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5 text-zinc-200">
            <div className="flex items-center gap-2 font-mono text-sm font-bold text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>NO EMERGENCY SERVICE ACCESS (911 / 999 / 112)</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-300">
              DARKLYNK DOES NOT PROVIDE ACCESS TO EMERGENCY CALL CENTERS, MEDICAL DISPATCHERS, POLICE,
              FIRE DEPARTMENTS, OR PUBLIC SAFETY ANSWERING POINTS (PSAPs). DO NOT ATTEMPT TO USE DARKLYNK
              FOR LIFE-CRITICAL, EMERGENCY, RESCUE, OR URGENT DISASTER COMMUNICATIONS. IN AN EMERGENCY,
              USE A DEDICATED TELEPHONE LINE OR DIRECT LOCAL EMERGENCY DISPATCH NETWORK.
            </p>
          </div>
        ),
      },
      {
        id: 'disclaimer-warranties',
        number: '13',
        title: 'Disclaimer of Warranties',
        shortTitle: 'Disclaimer of Warranties',
        category: 'liability',
        summary:
          'Darklynk is provided strictly "AS IS" and "AS AVAILABLE" with no express or implied warranties.',
        content: (
          <div className="space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed font-mono">
            <p>
              TO THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW, THE DARKLYNK SERVICE, PROTOCOL, AND
              ALL ACCOMPANYING SOFTWARE ARE PROVIDED ON AN <strong>&ldquo;AS IS&rdquo;</strong> AND{' '}
              <strong>&ldquo;AS AVAILABLE&rdquo;</strong> BASIS, WITHOUT WARRANTIES OF ANY KIND, WHETHER
              EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
            </p>
            <p>
              WE SPECIFICALLY DISCLAIM ALL IMPLIED WARRANTIES, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, QUIET ENJOYMENT, SYSTEM
              INTEGRATION, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT DARKLYNK WILL OPERATE
              UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM TRANSMISSION DELAYS, VOLATILITY, OR PACKET
              LOSS.
            </p>
          </div>
        ),
      },
      {
        id: 'limitation-liability',
        number: '14',
        title: 'Limitation of Liability',
        shortTitle: 'Limitation of Liability',
        category: 'liability',
        summary:
          'Operators and contributors will not be liable for incidental, indirect, punitive, or consequential damages.',
        content: (
          <div className="space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed font-mono">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL DARKLYNK, ITS
              FOUNDERS, CONTRIBUTORS, OPERATORS, AFFILIATES, OR HOSTING PARTNERS BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES WHATSOEVER
              (INCLUDING, WITHOUT LIMITATION, DAMAGES FOR LOSS OF DATA, GOODWILL, REPUTATIONAL INJURY,
              BUSINESS INTERRUPTION, DEVICE COMPROMISE, OR EXPOSURE OF SECRETS THROUGH THIRD-PARTY
              SCREENSHOTS OR CODE LEAKS), REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, STRICT
              LIABILITY, OR NEGLIGENCE), EVEN IF INFORMED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p>
              BECAUSE DARKLYNK IS OFFERED FREE OF CHARGE, OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR
              RELATING TO THESE TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED THE TOTAL AMOUNT OF ZERO
              DOLLARS ($0.00 USD).
            </p>
          </div>
        ),
      },
      {
        id: 'indemnification',
        number: '15',
        title: 'Indemnification Obligations',
        shortTitle: 'Indemnification',
        category: 'liability',
        summary:
          'You agree to indemnify and hold Darklynk harmless from claims arising from your conduct or content.',
        content: (
          <div className="space-y-4">
            <p>
              You agree to defend, indemnify, and hold harmless Darklynk, its developers, operators,
              contractors, and infrastructure providers from and against any claims, liabilities, damages,
              losses, expenses, and reasonable attorneys&apos; fees arising out of or in any way connected
              with:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300 text-xs sm:text-sm">
              <li>Your access to or use of the Darklynk platform;</li>
              <li>Your violation of any provision of these Terms or Acceptable Use Policy;</li>
              <li>
                Your transmission of any prohibited, infringing, defamatory, or unlawful material; or
              </li>
              <li>Your infringement or violation of any third-party rights, including privacy rights.</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'governing-law',
        number: '16',
        title: 'Governing Law & Legal Entity Verification',
        shortTitle: 'Governing Law',
        category: 'legal',
        summary:
          'Formal corporate registration, choice of law, and arbitration venue to be confirmed upon corporate incorporation.',
        content: (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#00ff66]/20 bg-[#00ff66]/[0.02] p-4 text-xs font-mono">
              <span className="text-[#00ff66] font-bold">// LEGAL DISCLOSURE &amp; JURISDICTION NOTICE:</span>
              <p className="mt-1 text-zinc-400 leading-relaxed">
                Darklynk is currently maintained as an open privacy-preserving technological protocol.
                Formal corporate incorporation, registered business jurisdiction, and designated dispute
                resolution forums are subject to formal legal verification prior to commercial deployment.
              </p>
            </div>
            <p>
              Except to the extent designated otherwise upon formal legal incorporation, any legal
              disputes arising from these Terms or the use of Darklynk shall be resolved under the
              principles of equity and standard international arbitration standards, without regard to
              conflict of law provisions.
            </p>
            <p>
              <strong>Class Action Waiver:</strong> TO THE EXTENT PERMITTED BY LAW, ALL DISPUTES SHALL BE
              RESOLVED ON AN INDIVIDUAL BASIS, AND YOU AGREE NOT TO INITIATE, JOIN, OR PARTICIPATE IN ANY
              CLASS ACTION, CONSOLIDATED SUIT, OR REPRESENTATIVE PROCEEDING AGAINST DARKLYNK.
            </p>
          </div>
        ),
      },
      {
        id: 'modifications-contact',
        number: '17',
        title: 'Modifications to Terms & Legal Contact',
        shortTitle: 'Modifications & Contact',
        category: 'legal',
        summary:
          'Updates are published with revised timestamps. Reach our security and legal channels for notices.',
        content: (
          <div className="space-y-4">
            <p>
              <strong>Revisions to these Terms:</strong> We reserve the right to amend, update, or revise
              these Terms at our discretion as the Darklynk protocol evolves. When updates occur, we will
              update the &ldquo;Last Updated&rdquo; date at the top of this document. Your continued use of
              Darklynk following any modification constitutes your constructive acceptance of the revised
              Terms.
            </p>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#00ff66]">
                <Mail className="h-4 w-4" />
                <span>COMMUNICATION CHANNELS &amp; ABUSE DISCLOSURES:</span>
              </div>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                For questions regarding these Terms, security disclosures, technical vulnerabilities, or
                legal notifications, contact our designated channels:
              </p>
              <div className="mt-3 flex flex-wrap gap-4 font-mono text-xs">
                <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/60 px-3 py-1.5 text-zinc-300">
                  <span className="text-zinc-500">Security &amp; Vulnerabilities:</span>
                  <span className="text-[#00ff66]">security@darklynk.local</span>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/60 px-3 py-1.5 text-zinc-300">
                  <span className="text-zinc-500">Legal &amp; Abuse:</span>
                  <span className="text-[#00ff66]">legal@darklynk.local</span>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-zinc-500">
                Note: Standard corporate entity details, physical mailing address, and registered agent
                records will be populated upon final formal legal review and corporate registration.
              </p>
            </div>
          </div>
        ),
      },
    ],
    []
  )

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections
    const q = searchQuery.toLowerCase()
    return sections.filter((s) => {
      return (
        s.title.toLowerCase().includes(q) ||
        s.shortTitle.toLowerCase().includes(q) ||
        s.number.includes(q) ||
        (s.summary && s.summary.toLowerCase().includes(q))
      )
    })
  }, [sections, searchQuery])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#00ff66]/30 selection:text-[#00ff66]">
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#00ff66]/5 blur-[160px]" />
        <div className="pointer-events-none absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-[#00ff66]/[0.03] blur-[140px]" />

        {/* Hero / Header Section */}
        <header className="relative border-b border-white/10 bg-[#050505] px-4 py-12 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            {/* Breadcrumb & Status */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-zinc-500">
                <Link
                  href="/"
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Home</span>
                </Link>
                <span>/</span>
                <span className="text-zinc-400">Legal</span>
                <span>/</span>
                <span className="text-[#00ff66]">Terms &amp; Conditions</span>
              </nav>

              <div className="flex items-center gap-2 rounded-full border border-[#00ff66]/30 bg-[#00ff66]/10 px-3 py-1 text-[11px] text-[#00ff66]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff66]" />
                <span>EPHEMERAL PROTOCOL // OPERATIONAL</span>
              </div>
            </div>

            {/* Title & Description */}
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 font-mono text-xs tracking-widest text-[#00ff66]">
                <span>{"//"}</span>
                <span>LEGAL FRAMEWORK &amp; OPERATIONAL PROTOCOL</span>
              </div>
              <h1 className="font-mono text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Terms and Conditions
              </h1>
              <p className="mt-4 text-base text-zinc-400 leading-relaxed sm:text-lg">
                The governing legal terms, acceptable use policy, and technical privacy architecture
                for private, temporary text sessions on Darklynk.
              </p>
            </div>

            {/* Document Metadata Bar */}
            <div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/10 pt-6 font-mono text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">EFFECTIVE DATE</span>
                <span className="text-zinc-200 font-semibold mt-1 block">October 29, 2026</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">PROTOCOL VERSION</span>
                <span className="text-[#00ff66] font-semibold mt-1 block">v1.0.0 (Ephemeral)</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">DATA RETENTION</span>
                <span className="text-zinc-200 font-semibold mt-1 block">Zero (In-Memory Only)</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">STATUS</span>
                <span className="text-amber-400 font-semibold mt-1 block">Draft (Legal Review)</span>
              </div>
            </div>

            {/* Action Buttons: Print, Copy Link, Search */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter sections (e.g. privacy, codes, liability)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-9 text-xs font-mono text-white placeholder:text-zinc-600 focus:border-[#00ff66]/70 focus:bg-[#00ff66]/[0.03] focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    title="Clear filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={() => handleCopyLink()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-zinc-300 hover:border-white/30 hover:bg-white/[0.06] hover:text-white transition-all"
                  title="Copy direct link to document"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-zinc-300 hover:border-white/30 hover:bg-white/[0.06] hover:text-white transition-all"
                  title="Print or save as PDF"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Executive Summary Cards */}
        <section aria-label="Key Principles" className="border-b border-white/10 bg-[#050505]/60 px-4 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-[#00ff66]">
                // AT A GLANCE — KEY PRINCIPLES
              </span>
              <span className="font-mono text-[10px] text-zinc-500">SUMMARY ONLY — FULL TERMS APPLY</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm transition-all hover:border-[#00ff66]/40 hover:bg-[#00ff66]/[0.02]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[#00ff66]/20 bg-[#00ff66]/10 text-[#00ff66]">
                  <Flame className="h-4 w-4" />
                </div>
                <h2 className="font-mono text-sm font-semibold text-white">Instant Destruction</h2>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Rooms are strictly ephemeral. Once the timer reaches zero, all messages and session state
                  are permanently purged from volatile memory.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm transition-all hover:border-[#00ff66]/40 hover:bg-[#00ff66]/[0.02]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[#00ff66]/20 bg-[#00ff66]/10 text-[#00ff66]">
                  <UserRoundX className="h-4 w-4" />
                </div>
                <h2 className="font-mono text-sm font-semibold text-white">No Account System</h2>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  No passwords, emails, phone numbers, or identity profiles. You join with temporary
                  handles and access codes.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm transition-all hover:border-[#00ff66]/40 hover:bg-[#00ff66]/[0.02]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[#00ff66]/20 bg-[#00ff66]/10 text-[#00ff66]">
                  <LockKeyhole className="h-4 w-4" />
                </div>
                <h2 className="font-mono text-sm font-semibold text-white">Zero Data Retention</h2>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Zero chat databases, zero tracking cookies, and zero advertising profiling. We don&apos;t sell
                  or monetize user data.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm transition-all hover:border-[#00ff66]/40 hover:bg-[#00ff66]/[0.02]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[#00ff66]/20 bg-[#00ff66]/10 text-[#00ff66]">
                  <Scale className="h-4 w-4" />
                </div>
                <h2 className="font-mono text-sm font-semibold text-white">Conduit &amp; Neutrality</h2>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                  Darklynk acts as a neutral transport pipe. Users bear sole legal responsibility for the
                  content they transmit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Layout with Sticky Sidebar */}
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 lg:px-12">
          {/* Mobile TOC Toggle Bar */}
          <div className="mb-8 block lg:hidden">
            <button
              onClick={() => setMobileTocOpen(!mobileTocOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-xs text-zinc-300"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#00ff66]" />
                <span>Table of Contents ({sections.length} Sections)</span>
              </div>
              <ChevronRight
                className={`h-4 w-4 transition-transform duration-200 ${
                  mobileTocOpen ? 'rotate-90' : ''
                }`}
              />
            </button>

            {mobileTocOpen && (
              <div className="mt-2 rounded-lg border border-white/10 bg-[#080808] p-3 font-mono text-xs space-y-1 max-h-80 overflow-y-auto">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setMobileTocOpen(false)}
                    className={`flex items-center justify-between rounded px-2.5 py-1.5 transition-colors ${
                      activeSection === s.id
                        ? 'bg-[#00ff66]/10 text-[#00ff66] font-semibold'
                        : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <span>
                      {s.number}. {s.shortTitle}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Desktop Sticky Table of Contents Sidebar */}
            <aside className="hidden lg:col-span-4 lg:block">
              <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-mono text-xs font-semibold tracking-wider text-[#00ff66]">
                    TABLE OF CONTENTS
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {filteredSections.length} OF {sections.length}
                  </span>
                </div>

                <nav aria-label="Legal Sections Navigation" className="space-y-1 font-mono text-xs">
                  {filteredSections.map((section) => {
                    const isActive = activeSection === section.id
                    return (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className={`group flex items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-200 ${
                          isActive
                            ? 'bg-[#00ff66]/10 text-[#00ff66] font-semibold border-l-2 border-[#00ff66]'
                            : 'text-zinc-400 hover:bg-white/[0.03] hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] opacity-60 font-mono pt-0.5">
                          {section.number}
                        </span>
                        <span className="flex-1 leading-snug">{section.shortTitle}</span>
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff66] mt-1.5 shadow-[0_0_6px_#00ff66]" />
                        )}
                      </a>
                    )
                  })}
                </nav>

                {/* Quick Help Card */}
                <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <Info className="h-3.5 w-3.5 text-[#00ff66]" />
                    <span>Need Clarification?</span>
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed">
                    Have questions about room lifespans or security? Check our contact channels or open an
                    inquiry.
                  </p>
                  <a
                    href="mailto:legal@darklynk.local"
                    className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#00ff66] hover:underline"
                  >
                    <span>legal@darklynk.local</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </aside>

            {/* Legal Document Sections Column */}
            <article className="lg:col-span-8 space-y-12">
              {filteredSections.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center font-mono">
                  <Search className="mx-auto h-8 w-8 text-zinc-600" />
                  <h3 className="mt-4 text-base font-semibold text-white">No Matching Sections Found</h3>
                  <p className="mt-2 text-xs text-zinc-500">
                    No legal terms matched your search &ldquo;{searchQuery}&rdquo;. Try another term or
                    clear the search.
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 rounded-md border border-[#00ff66]/40 bg-[#00ff66]/10 px-4 py-2 text-xs text-[#00ff66] hover:bg-[#00ff66]/20 transition-all"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                filteredSections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    data-legal-section
                    className="scroll-mt-28 rounded-2xl border border-white/10 bg-[#060606] p-6 sm:p-8 transition-colors hover:border-white/20"
                  >
                    {/* Section Header */}
                    <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-[#00ff66]">
                          § {section.number}
                        </span>
                        <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                          {section.title}
                        </h2>
                      </div>

                      {/* Copy Anchor Button */}
                      <button
                        onClick={() => handleCopyLink(section.id)}
                        className="flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] text-zinc-400 hover:border-white/20 hover:text-white transition-all shrink-0"
                        title="Copy direct link to this section"
                      >
                        {copiedId === section.id ? (
                          <>
                            <Check className="h-3 w-3 text-[#00ff66]" />
                            <span className="text-[#00ff66]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span className="hidden sm:inline">Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Section Summary Highlight if available */}
                    {section.summary && (
                      <div className="mb-5 rounded-lg border-l-2 border-[#00ff66] bg-[#00ff66]/[0.03] py-2 px-3.5 text-xs text-zinc-400 font-mono">
                        <strong className="text-zinc-300">Section Takeaway: </strong>
                        {section.summary}
                      </div>
                    )}

                    {/* Section Body */}
                    <div className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                      {section.content}
                    </div>
                  </section>
                ))
              )}

              {/* Bottom Document Notice / Formal Counsel Disclaimer */}
              <div className="rounded-2xl border border-white/10 bg-[#050505] p-6 sm:p-8 font-mono text-xs">
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-[#00ff66]" />
                  <span>FORMAL LEGAL COUNSEL REVIEW NOTICE</span>
                </div>
                <p className="mt-3 text-zinc-500 leading-relaxed">
                  This document serves as an authentic operational draft and technical governance policy
                  reflecting Darklynk&apos;s ephemeral, zero-retention architecture. Prior to commercial
                  launch or corporate incorporation, these terms should be reviewed and verified by a
                  licensed legal practitioner qualified in your designated operating jurisdiction.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4 text-[11px] text-zinc-500">
                  <span>Document ID: DL-TERMS-2026-OCT</span>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="text-[#00ff66] hover:underline"
                    >
                      ↑ Return to Top
                    </button>
                    <Link href="/" className="hover:text-white transition-colors">
                      Back to Darklynk Home
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </main>

      {/* Floating Copied Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-[#00ff66]/40 bg-black/90 px-4 py-2.5 font-mono text-xs text-[#00ff66] shadow-[0_0_20px_rgba(0,255,102,0.2)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="h-3.5 w-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Footer />
    </div>
  )
}
