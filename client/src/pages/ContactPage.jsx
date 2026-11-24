import { Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';
import InquiryForm from '../components/InquiryForm.jsx';

export default function ContactPage() {
  const { settings } = useSite();
  const { contact } = settings;

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <header className="text-center space-y-3 mb-14">
        <p className="text-xs uppercase tracking-[0.25em] text-brand-muted">Hör av dig</p>
        <h1 className="text-3xl sm:text-4xl uppercase tracking-[0.18em]">Kontakt</h1>
        <p className="text-sm sm:text-base text-brand-muted max-w-xl mx-auto">
          Har du frågor om ett smycke, ett konstverk eller vill boka ett personligt besök i
          ateljén på Södermalm? Hör gärna av dig.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        <div className="lg:col-span-5 space-y-8 text-sm">
          <div className="space-y-5">
            {contact.email && (
              <div className="flex items-start gap-3.5">
                <Mail className="w-4 h-4 mt-1 text-brand-muted shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-brand-muted mb-1">E-post</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-brand-ink hover:text-brand-accent transition-colors"
                  >
                    {contact.email}
                  </a>
                </div>
              </div>
            )}

            {contact.phone && (
              <div className="flex items-start gap-3.5">
                <Phone className="w-4 h-4 mt-1 text-brand-muted shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-brand-muted mb-1">Telefon</p>
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                    className="text-brand-ink hover:text-brand-accent transition-colors"
                  >
                    {contact.phone}
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3.5">
              <MapPin className="w-4 h-4 mt-1 text-brand-muted shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-brand-muted mb-1">
                  {contact.studioTitle || 'Ateljé'}
                </p>
                <p className="text-brand-ink">{contact.addressLine1}</p>
                <p className="text-brand-muted">{contact.addressLine2}</p>
              </div>
            </div>

            {contact.instagramUrl && (
              <div className="flex items-start gap-3.5">
                <Instagram className="w-4 h-4 mt-1 text-brand-muted shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-brand-muted mb-1">
                    Instagram
                  </p>
                  <a
                    href={contact.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-ink hover:text-brand-accent transition-colors"
                  >
                    Följ Anna-Lea
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <InquiryForm
            inquiryType="contact"
            heading="Skicka meddelande"
            subtitle="Fyll i formuläret nedan så hör Anna-Lea av sig så snart som möjligt."
            submitLabel="Skicka meddelande"
            messagePlaceholder="Vad kan vi hjälpa dig med?"
          />
        </div>
      </div>
    </div>
  );
}
