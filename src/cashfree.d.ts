declare module '@cashfreepayments/cashfree-js' {
  export interface CashfreeInstance {
    checkout(options: {
      paymentSessionId: string;
      redirectTarget?: '_self' | '_blank' | '_top' | '_modal';
    }): Promise<{
      error?: { message?: string };
      redirect?: boolean;
      paymentDetails?: unknown;
    }>;
  }

  export function load(options: {
    mode: 'sandbox' | 'production';
  }): Promise<CashfreeInstance>;
}
