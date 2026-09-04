import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import ContactForm from '@/components/ContactForm';
import PageHeader from '@/components/PageHeader';
import Reveal from '@/components/Reveal';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Ask JainCo about prices, availability or anything in the catalogue. Send the item numbers you are interested in and we will come straight back to you.',
};

const ANSWERS = [
  {
    question: 'How do I ask about a price?',
    answer:
      'Send the reference numbers shown on the photographs with the quantities you want. We reply with prices and current stock.',
  },
  {
    question: 'Can I buy just one?',
    answer:
      'Yes. Most of the catalogue is sold by the piece. Larger quantities are also fine, so tell us if you need many of something.',
  },
  {
    question: 'Will you hold something for me?',
    answer:
      'Yes. Send a shortlist and we will set those pieces aside at the counter.',
  },
  {
    question: 'Do you have more than what is listed?',
    answer:
      'The catalogue covers what is on the shelves, and the range changes through the year. If you cannot find something, ask and we will tell you whether we stock it or can order it in.',
  },
];

export default function ContactPage() {
  const settings = getSettings();

  const channels = [
    settings.contact_email && {
      icon: Mail,
      label: 'Email',
      value: settings.contact_email,
      href: `mailto:${settings.contact_email}`,
    },
    settings.contact_phone && {
      icon: Phone,
      label: 'Telephone',
      value: settings.contact_phone,
      href: `tel:${settings.contact_phone.replace(/\s+/g, '')}`,
    },
    settings.whatsapp && {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: 'Message us',
      href: `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`,
    },
    settings.address && { icon: MapPin, label: 'Shop', value: settings.address },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href?: string }[];

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        lede="Send the item numbers and quantities you are interested in. We will confirm prices and availability, and hold them for collection."
      />

      <section className="shell pb-10">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal variant="left">
            <Suspense fallback={<div className="glass h-[520px] animate-pulse" />}>
              <ContactForm />
            </Suspense>
          </Reveal>

          <Reveal variant="right" delay={0.1}>
            <div className="space-y-4">
              <div className="glass p-7">
                <p className="eyebrow">Reach us directly</p>

                <ul className="mt-6 space-y-5">
                  {channels.map((channel) => {
                    const Icon = channel.icon;
                    const content = (
                      <>
                        <span className="glass grid h-10 w-10 shrink-0 place-items-center rounded-full">
                          <Icon size={15} className="text-[color:var(--aqua)]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[0.68rem] uppercase tracking-[0.2em] text-[color:var(--faint)]">
                            {channel.label}
                          </span>
                          <span className="mt-1 block break-words text-[0.92rem] text-white/90">
                            {channel.value}
                          </span>
                        </span>
                      </>
                    );

                    return (
                      <li key={channel.label}>
                        {channel.href ? (
                          <a
                            href={channel.href}
                            target={channel.href.startsWith('http') ? '_blank' : undefined}
                            rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            className="flex items-start gap-4 transition-opacity hover:opacity-80"
                          >
                            {content}
                          </a>
                        ) : (
                          <div className="flex items-start gap-4">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="glass p-7">
                <span className="glass grid h-10 w-10 place-items-center rounded-full">
                  <Clock size={15} className="text-[color:var(--aqua)]" />
                </span>
                <p className="mt-4 text-[0.95rem] font-medium text-white">Response time</p>
                <p className="mt-2 text-[0.85rem] leading-relaxed text-[color:var(--muted)]">
                  We aim to reply within three business days. Large orders or anything we need to
                  check stock on can take longer.
                </p>
                {settings.contact_phone && (
                  <p className="mt-3 text-[0.85rem] leading-relaxed text-[color:var(--muted)]">
                    For a quicker answer, call us on{' '}
                    <a
                      href={`tel:${settings.contact_phone.replace(/\s+/g, '')}`}
                      className="font-medium text-[color:var(--aqua)] transition-colors hover:text-white"
                    >
                      {settings.contact_phone}
                    </a>
                    .
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="shell pt-20">
        <Reveal>
          <p className="eyebrow">Common questions</p>
          <h2 className="display mt-4 max-w-2xl text-[clamp(1.9rem,4.4vw,3rem)] text-balance">
            Answers before you write
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {ANSWERS.map((entry, index) => (
            <Reveal key={entry.question} delay={index * 0.08} variant="scale">
              <article className="glass sheen h-full p-7">
                <h3 className="text-[1rem] font-medium text-white">{entry.question}</h3>
                <p className="mt-3 text-[0.87rem] leading-relaxed text-[color:var(--muted)]">
                  {entry.answer}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
