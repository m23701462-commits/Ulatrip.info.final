import { useState } from 'react';
import { ArrowRight, Coffee, Lock, MapPin, ShieldCheck, Users } from 'lucide-react';
import { INDIAN_STATES, type IndianState } from '../types';

interface LandingPageProps {
  partyChatFee: number;
  onOpenPartyGate: (preferredState?: IndianState) => void;
  onHostParty: () => void;
}

const SAMPLE_CHAT_LINES = [
  {
    sender: 'Karthik · Chennai',
    time: '09:14 AM',
    text: 'Anyone joining the Mylapore courtyard filter coffee walk this Saturday at 7:30 AM? 6 travelers confirmed!',
  },
  {
    sender: 'Meera · Kochi',
    time: '09:18 AM',
    text: 'Fort Kochi sunset promenade meetup is open! Strictly chai & local snacks, zero alcohol.',
  },
  {
    sender: 'Rohan · Pune',
    time: '09:23 AM',
    text: 'Heading to Bengaluru Indiranagar this weekend — looking forward to the bookstore chai circle.',
  },
  {
    sender: 'Divya · Hyderabad',
    time: '09:29 AM',
    text: 'Just unlocked Telangana pass via Cashfree! Secret address for Jubilee Hills cultural dinner worked smoothly.',
  },
];

function ResilientImage({
  src,
  alt,
  fallbackTitle,
  className,
}: {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 p-6 text-center text-slate-600 ${className || ''}`}
      >
        <Coffee className="h-8 w-8 text-emerald-600" />
        <p className="mt-2 text-sm font-semibold text-slate-800">{fallbackTitle}</p>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function LandingPage({ partyChatFee, onOpenPartyGate, onHostParty }: LandingPageProps) {
  return (
    <main className="bg-[#FAFAFA]">
      {/* 1. Hero & Safety Trust Line */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:py-16">
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-xs font-semibold tracking-wide text-emerald-700">
              ulatrip.online · India Verified Community
            </p>
            <h1
              className="mt-3 font-display font-bold tracking-tight text-slate-900"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.35rem)', lineHeight: 1.08, textWrap: 'balance' }}
            >
              UlaTrip Travelers &amp; Home Party Community
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              State-wise live member chat rooms, safe cultural meetups &amp; local host gatherings across India
            </p>

            {/* Safety Badges rendered cleanly without pill spam */}
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-slate-200 py-3.5 text-sm font-semibold text-slate-800">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Safe</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Alcohol-Free</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Verified Members</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Public &amp; Cultural Meetups Only</span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenPartyGate('Tamil Nadu')}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
              >
                <span>Open Party</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onHostParty}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-xs transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <span>Host a Safe Meetup</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-72 overflow-hidden rounded-2xl border border-slate-200 shadow-sm sm:h-96 lg:h-full">
              <ResilientImage
                src="/src/assets/images/hero_cultural_gathering_1795024062209.jpg"
                alt="Verified travelers sharing chai at a courtyard meetup in India"
                fallbackTitle="UlaTrip Cultural Gatherings"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Blurred Community Chat Gate */}
      <section className="border-b border-slate-200 bg-[#FAFAFA] py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Live State Chat Rooms &amp; Private Gatherings
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
              Every state room is strictly locked behind a 30-day verified pass. Unlock the state you are visiting or living in via Cashfree to read live travel plans and RSVP to verified events.
            </p>
          </div>

          <div className="relative mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {/* Blurred Sample Chat Preview */}
            <div className="blur-md select-none pointer-events-none space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-display text-base font-bold text-slate-900">
                  Tamil Nadu · Kerala · Karnataka Live Community Stream
                </span>
                <span className="font-mono text-xs text-slate-500">42 members active today</span>
              </div>
              {SAMPLE_CHAT_LINES.map((line, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{line.sender}</span>
                    <span className="font-mono">{line.time}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{line.text}</p>
                </div>
              ))}
            </div>

            {/* Gate Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/75 p-4 backdrop-blur-[2px]">
              <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg sm:p-8">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-slate-900">
                  Unlock Verified State Chat &amp; Meetups
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Choose any of 7 Indian states. Instant 30-day access unlocks automatically via Cashfree.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenPartyGate('Tamil Nadu')}
                  className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:w-auto"
                >
                  <Lock className="h-4 w-4" />
                  <span className="tabular-nums">
                    Open Party &amp; State Chat (Unlock for ₹{partyChatFee}/month)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Community Formats & State Coverage */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Two Safe Meetup Formats Across 7 States
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 sm:text-base">
                Admin-verified hosts, zero alcohol tolerance, and protected exact addresses until your entry is approved.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <ResilientImage
                  src="/src/assets/images/event_home_dinner_1795024062719.jpg"
                  alt="Safe cultural home dinner gathering in India"
                  fallbackTitle="Cultural Home Parties"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold text-emerald-700">01 · Home Party Format</p>
                <h3 className="mt-1.5 font-display text-lg font-bold text-slate-900">
                  Cultural Home Dinners &amp; Acoustic Evenings
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Intimate 8–15 guest vegetarian dinners, board games, and music sessions hosted by verified local families. Exact street address stays hidden until approved.
                </p>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <ResilientImage
                  src="/src/assets/images/event_chai_meetup_1795024062815.jpg"
                  alt="Public courtyard chai and snack meetup"
                  fallbackTitle="Public Chai & Food Meetups"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold text-emerald-700">02 · Public Meetup Format</p>
                <h3 className="mt-1.5 font-display text-lg font-bold text-slate-900">
                  Public Place Chai &amp; Food Trails
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Free or low-cost heritage cafe hangouts, filter-coffee walks, and regional breakfast trails. Instant entry for free meetups inside your unlocked state.
                </p>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <ResilientImage
                  src="/src/assets/images/event_coastal_travel_1795024063244.jpg"
                  alt="Verified travelers exploring Fort Kochi coast"
                  fallbackTitle="Verified State Travel Circles"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold text-emerald-700">03 · Per-State Isolation</p>
                <h3 className="mt-1.5 font-display text-lg font-bold text-slate-900">
                  State-Isolated Real-Time Group Chat
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Coordinate carpools, local transit, and weekend itineraries strictly with travelers who hold an active 30-day pass for that state.
                </p>
              </div>
            </article>
          </div>

          {/* Interactive State Jump Row */}
          <div className="mt-10 rounded-2xl border border-slate-200 bg-[#FAFAFA] p-6 shadow-xs">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Explore State Hubs Across India
                  </h3>
                  <p className="text-xs text-slate-600">
                    Select any state below to unlock your 30-day pass and enter the state community.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <Users className="h-4 w-4 text-emerald-600" />
                <span>7 Active State Communities</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {INDIAN_STATES.map((stateName) => (
                <button
                  key={stateName}
                  type="button"
                  onClick={() => onOpenPartyGate(stateName)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs transition-colors hover:border-emerald-600 hover:bg-emerald-50/40 whitespace-nowrap shrink-0"
                >
                  {stateName}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
