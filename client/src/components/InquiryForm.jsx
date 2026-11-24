import { useState } from 'react';
import { Check } from 'lucide-react';
import { apiPost } from '../lib/api.js';

export default function InquiryForm({
  inquiryType = 'contact',
  entityType = '',
  entityId = null,
  itemTitle = '',
  variantChoice = '',
  heading = 'Skicka förfrågan',
  subtitle = '',
  submitLabel = 'Skicka',
  messagePlaceholder = 'Skriv ditt meddelande, storlek eller eventuella frågor...',
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // osynligt spamskydd (honeypot)
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiPost('/api/public/inquiries', {
        inquiry_type: inquiryType,
        entity_type: entityType,
        entity_id: entityId,
        item_title: itemTitle,
        variant_choice: variantChoice,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        message,
        website,
      });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Kunde inte skicka formuläret. Försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="border border-black/10 bg-brand-surface p-6 sm:p-8 text-center space-y-3">
        <div className="w-10 h-10 mx-auto rounded-full bg-brand-ink text-brand-bg flex items-center justify-center">
          <Check className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <h3 className="text-base uppercase tracking-[0.18em]">Tack!</h3>
        <p className="text-sm text-brand-muted leading-relaxed">
          {inquiryType === 'jewelry_order'
            ? 'Din beställning är nu mottagen. Anna-Lea återkopplar till dig så snart som möjligt.'
            : 'Ditt meddelande är skickat. Anna-Lea återkommer till dig så snart som möjligt.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setMessage('');
          }}
          className="text-xs uppercase tracking-[0.18em] text-brand-muted hover:text-brand-ink underline underline-offset-4 pt-2"
        >
          Skicka ett nytt meddelande
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-black/10 bg-brand-surface/70 p-6 sm:p-8 space-y-4"
    >
      <div className="space-y-1">
        <h3 className="text-sm uppercase tracking-[0.2em] text-brand-ink">{heading}</h3>
        {subtitle && <p className="text-xs text-brand-muted leading-relaxed">{subtitle}</p>}
      </div>

      {variantChoice && (
        <div className="text-xs text-brand-muted bg-brand-bg border border-black/[0.07] px-3 py-2">
          Valt utförande: <span className="text-brand-ink font-normal">{variantChoice}</span>
        </div>
      )}

      {/* Osynligt honeypot-fält mot bottar */}
      <div className="hidden" aria-hidden="true">
        <label>
          Webbplats
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-[0.14em] text-brand-muted mb-1">
            Namn *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ditt namn"
            className="w-full bg-brand-bg border border-black/15 px-3.5 py-2.5 text-sm text-brand-ink focus:outline-none focus:border-brand-ink transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-[0.14em] text-brand-muted mb-1">
              E-post *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namn@exempel.se"
              className="w-full bg-brand-bg border border-black/15 px-3.5 py-2.5 text-sm text-brand-ink focus:outline-none focus:border-brand-ink transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.14em] text-brand-muted mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Valfritt"
              className="w-full bg-brand-bg border border-black/15 px-3.5 py-2.5 text-sm text-brand-ink focus:outline-none focus:border-brand-ink transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.14em] text-brand-muted mb-1">
            Meddelande / önskemål
          </label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={messagePlaceholder}
            className="w-full bg-brand-bg border border-black/15 px-3.5 py-2.5 text-sm text-brand-ink focus:outline-none focus:border-brand-ink transition-colors resize-y"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-ink text-brand-bg py-3 px-6 text-xs uppercase tracking-[0.22em] hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {submitting ? 'Skickar...' : submitLabel}
      </button>
    </form>
  );
}
