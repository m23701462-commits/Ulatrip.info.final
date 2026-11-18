import { ArrowLeft } from 'lucide-react';
import type { AppRoute } from './Navbar';

interface LegalPageProps {
  page: '/terms' | '/privacy' | '/refund';
  onBack: () => void;
  onNavigate: (route: AppRoute) => void;
}

export function LegalPages({ page, onBack, onNavigate }: LegalPageProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-teal-800"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to UlaTrip Community</span>
      </button>

      <div className="mt-4 flex gap-2 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={() => onNavigate('/terms')}
          className={`cursor-pointer rounded-lg px-3.5 py-2 text-xs font-semibold ${
            page === '/terms' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Terms of Service
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/privacy')}
          className={`cursor-pointer rounded-lg px-3.5 py-2 text-xs font-semibold ${
            page === '/privacy' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Privacy Policy
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/refund')}
          className={`cursor-pointer rounded-lg px-3.5 py-2 text-xs font-semibold ${
            page === '/refund' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Refund Policy
        </button>
      </div>

      {page === '/terms' && (
        <article className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Terms of Service &amp; 3rd-Party Intermediary Disclaimer
          </h1>
          <p className="text-xs text-slate-500">
            Platform Domain: ulatrip.info · Grievance &amp; Support Contact: mgsolition@gmail.com
          </p>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="font-display text-base font-bold text-slate-900">
              1. Information Technology Act, 2000 — Section 79 Intermediary Status
            </h2>
            <p className="mt-2">
              UlaTrip Community &amp; Party Hub (<strong>ulatrip.info</strong>) operates strictly as a neutral 3rd-party online intermediary platform under Section 79 of the Information Technology Act, 2000 (India) and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. UlaTrip does not organize, own, manage, or supervise physical home parties or public chai/food meetups listed by independent community hosts.
            </p>
            <p className="mt-2">
              By unlocking a state pass or attending any listing, users acknowledge zero platform liability for third-party host conduct, venue conditions, food allergies, transit, or personal disputes occurring offline. Hosts bear sole legal and personal responsibility for venue compliance and guest safety.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-slate-900">
              2. Strict Community Safety Rules (Zero Tolerance)
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>All gatherings listed on ulatrip.info must be strictly alcohol-free, drug-free, and free of any sexual or explicit content.</li>
              <li>Only cultural dinners, travel planning circles, acoustic/art sessions, and public chai/food meetups are permitted.</li>
              <li>Any member violating safety rules or posting abusive content in state/party chats is subject to immediate permanent account ban.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-slate-900">
              3. State-Wise Access Passes &amp; Host UPI Transactions
            </h2>
            <p className="mt-2">
              Monthly state access passes are billed per individual Indian state via Cashfree Payment Gateway and remain active for 30 calendar days from verification. Optional event entry fees listed by hosts are paid directly by guests to the Host&apos;s UPI ID; UlaTrip is not a financial custodian of host-to-guest UPI transfers.
            </p>
          </section>
        </article>
      )}

      {page === '/privacy' && (
        <article className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
          <h1 className="font-display text-3xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="text-xs text-slate-500">
            ulatrip.info · Data Protection &amp; Grievance Contact: mgsolition@gmail.com
          </p>

          <section>
            <h2 className="font-display text-base font-bold text-slate-900">
              1. Information We Collect
            </h2>
            <p className="mt-2">
              We collect member full name, verified email address, mobile number, state pass payment metadata (Cashfree order and payment reference IDs), submitted 12-digit UPI UTR numbers for host verification, and messages posted in state or event rooms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-slate-900">
              2. Secret Venue Address Protection
            </h2>
            <p className="mt-2">
              Host venue addresses (`secret_address`) are never displayed in public listings. Access to an event&apos;s exact address is restricted server-side strictly to the Host, Platform Admin, and participants whose `payment_status` is `approved`.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-slate-900">
              3. Data Deletion &amp; Contact
            </h2>
            <p className="mt-2">
              To request account deletion or report a privacy concern, email{' '}
              <a href="mailto:mgsolition@gmail.com" className="font-semibold text-emerald-600 underline">
                mgsolition@gmail.com
              </a>
              .
            </p>
          </section>
        </article>
      )}

      {page === '/refund' && (
        <article className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
          <h1 className="font-display text-3xl font-bold text-slate-900">Refund &amp; Dispute Policy</h1>
          <p className="text-xs text-slate-500">
            ulatrip.info · Billing &amp; Dispute Support: mgsolition@gmail.com
          </p>

          <section>
            <h2 className="font-display text-base font-bold text-slate-900">
              1. 30-Day State Community Pass (Cashfree)
            </h2>
            <p className="mt-2">
              State chat passes unlock digital community access immediately upon Cashfree payment confirmation and are generally non-refundable once unlocked. Duplicate charges or failed auto-unlocks caused by gateway latency are refunded in full within 5–7 business days after verification.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-bold text-slate-900">
              2. Paid Event Host UPI Entry Disputes
            </h2>
            <p className="mt-2">
              If you paid a Host&apos;s UPI ID and submitted your 12-digit UTR but were not admitted to the party chat, click <strong>&quot;I Paid, But Not Entered in Party Chat&quot;</strong> inside the event card to alert our Admin team, or write to{' '}
              <a href="mailto:mgsolition@gmail.com" className="font-semibold text-emerald-600 underline">
                mgsolition@gmail.com
              </a>{' '}
              with your UTR screenshot.
            </p>
          </section>
        </article>
      )}
    </main>
  );
}
