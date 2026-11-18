import type { AppRoute } from './Navbar';

interface FooterProps {
  onNavigate: (route: AppRoute) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-lg font-bold text-slate-900">
              UlaTrip Community &amp; Party Hub
            </p>
            <p className="mt-1 text-sm text-slate-600">
              ulatrip.online · Safe, Alcohol-Free Cultural Home Parties &amp; Public Chai Meetups across India
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => onNavigate('/terms')}
              className="cursor-pointer hover:text-emerald-700 whitespace-nowrap shrink-0"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/privacy')}
              className="cursor-pointer hover:text-emerald-700 whitespace-nowrap shrink-0"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/refund')}
              className="cursor-pointer hover:text-emerald-700 whitespace-nowrap shrink-0"
            >
              Refund Policy
            </button>
            <a
              href="mailto:mgsolition@gmail.com"
              className="font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
            >
              Support: mgsolition@gmail.com
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} UlaTrip (ulatrip.online / ulatrip.info). Platform operates solely as a 3rd-party online intermediary under Section 79 of the Information Technology Act, 2000. Support: mgsolition@gmail.com
        </div>
      </div>
    </footer>
  );
}
