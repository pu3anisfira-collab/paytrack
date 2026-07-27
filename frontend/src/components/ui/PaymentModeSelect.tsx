import { PAYMENT_GROUPS, PAYMENT_METHODS, getMethodsByGroup, migratePaymentMode } from '@/config/paymentMethods';
import { cn } from '@/utils/cn';

interface PaymentModeSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const GROUP_LABELS: Record<string, string> = {
  'E-Wallet':      'E-Wallets',
  'Bank Transfer': 'Bank Transfers',
  'Card':          'Cards',
  'Cash':          'Cash',
};

/**
 * Grouped payment mode <select> with Malaysian payment methods.
 * Automatically migrates legacy values (e.g. 'M2U' → 'DuitNow').
 */
export function PaymentModeSelect({ value, onChange, disabled, className }: PaymentModeSelectProps) {
  // Migrate old enum values transparently
  const safeValue = PAYMENT_METHODS.some((m) => m.value === value)
    ? value
    : migratePaymentMode(value);

  return (
    <select
      value={safeValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary shadow-sm',
        'focus:border-paytrack-blue focus:outline-none focus:ring-2 focus:ring-paytrack-blue/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {PAYMENT_GROUPS.map((group) => (
        <optgroup key={group} label={GROUP_LABELS[group]}>
          {getMethodsByGroup(group).map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
