/**
 * Malaysian Payment Methods configuration
 * Used across the frontend for dropdowns, display labels, and icons.
 */

export interface PaymentMethod {
  value: string;        // stored in DB
  label: string;        // display name
  group: PaymentGroup;  // category
  isActive: boolean;
}

export type PaymentGroup = 'E-Wallet' | 'Bank Transfer' | 'Card' | 'Cash';

export const PAYMENT_METHODS: PaymentMethod[] = [
  // ── E-Wallets ──────────────────────────────────────────────
  { value: 'TNG', label: "Touch 'n Go (TNG)", group: 'E-Wallet', isActive: true },
  { value: 'GrabPay', label: 'GrabPay', group: 'E-Wallet', isActive: true },
  { value: 'ShopeePay', label: 'ShopeePay', group: 'E-Wallet', isActive: true },
  { value: 'Boost', label: 'Boost', group: 'E-Wallet', isActive: true },
  { value: 'MAE', label: 'MAE (Maybank App)', group: 'E-Wallet', isActive: true },
  { value: 'BigPay', label: 'BigPay', group: 'E-Wallet', isActive: true },
  { value: 'Setel', label: 'Setel', group: 'E-Wallet', isActive: true },
  // ── Bank Transfers ─────────────────────────────────────────
  { value: 'DuitNow', label: 'DuitNow', group: 'Bank Transfer', isActive: true },
  { value: 'DuitNowQR', label: 'DuitNow QR', group: 'Bank Transfer', isActive: true },
  { value: 'FPX', label: 'FPX', group: 'Bank Transfer', isActive: true },
  // ── Cards ──────────────────────────────────────────────────
  { value: 'Visa', label: 'Visa', group: 'Card', isActive: true },
  { value: 'Mastercard', label: 'Mastercard', group: 'Card', isActive: true },
  // ── Cash ───────────────────────────────────────────────────
  { value: 'Cash', label: 'Cash', group: 'Cash', isActive: true },
];

/** Active payment method values — used in Zod validation on both ends */
export const PAYMENT_MODE_VALUES = PAYMENT_METHODS
  .filter((m) => m.isActive)
  .map((m) => m.value) as [string, ...string[]];

/** Grouped for <optgroup> rendering */
export const PAYMENT_GROUPS: PaymentGroup[] = ['E-Wallet', 'Bank Transfer', 'Card', 'Cash'];

export function getMethodsByGroup(group: PaymentGroup): PaymentMethod[] {
  return PAYMENT_METHODS.filter((m) => m.group === group && m.isActive);
}

/** Lookup by value — returns label or the raw value if unknown */
export function getPaymentLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}



/**
 * Maps OLD payment mode values (from the original enum) to new ones.
 * Ensures backward compatibility for transactions saved with old values.
 */
export function migratePaymentMode(old: string): string {
  const map: Record<string, string> = {
    Online: 'DuitNow',
    M2U: 'DuitNow',
    CreditCard: 'Visa',
    ShopeePay: 'ShopeePay',
    Epay: 'TNG',
    Cash: 'Cash',
  };
  return map[old] ?? old;
}

/**
 * Normalises a raw payment mode string (e.g. from TNG CSV import)
 * to a known value in PAYMENT_MODE_VALUES. Falls back to 'DuitNow'.
 */
export function normalizeImportedPaymentMode(raw: string | null | undefined): string {
  if (!raw) return 'DuitNow';
  const lower = raw.trim().toLowerCase();
  const match = PAYMENT_METHODS.find(
    (m) => m.value.toLowerCase() === lower || m.label.toLowerCase() === lower,
  );
  if (match) return match.value;
  // legacy string matching
  if (lower.includes('tng') || lower.includes('touch')) return 'TNG';
  if (lower.includes('grab')) return 'GrabPay';
  if (lower.includes('shopee')) return 'ShopeePay';
  if (lower.includes('boost')) return 'Boost';
  if (lower.includes('mae') || lower.includes('maybank')) return 'MAE';
  if (lower.includes('bigpay')) return 'BigPay';
  if (lower.includes('fpx')) return 'FPX';
  if (lower.includes('duitnow') || lower.includes('duit now')) return 'DuitNow';
  if (lower.includes('visa')) return 'Visa';
  if (lower.includes('master')) return 'Mastercard';
  if (lower.includes('cash')) return 'Cash';
  return 'DuitNow';
}
