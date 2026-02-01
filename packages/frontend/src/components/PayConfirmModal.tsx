import type { ReactNode } from "react";

export type PayConfirmModalProps = {
  open: boolean;
  title?: string;
  amountLabel: string;
  recipientLabel: string;
  chainLabel: string;
  firewallSummary: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  confirmText?: string;
  children?: ReactNode;
};

export function PayConfirmModal({
  open,
  title = "Confirm payment",
  amountLabel,
  recipientLabel,
  chainLabel,
  firewallSummary,
  onClose,
  onConfirm,
  confirmDisabled,
  confirmText = "Confirm & Pay",
}: PayConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-gray-400">
              Please verify the details below before proceeding.
            </p>
          </div>
          <button
            className="rounded-lg px-3 py-1 text-sm text-gray-300 hover:bg-gray-800"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Amount</div>
            <div className="mt-1 font-medium text-white">{amountLabel}</div>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Recipient</div>
            <div className="mt-1 font-medium text-white break-all">{recipientLabel}</div>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Network</div>
            <div className="mt-1 font-medium text-white">{chainLabel}</div>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Firewall summary</div>
            <div className="mt-1 text-sm text-gray-200">{firewallSummary}</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              confirmDisabled
                ? "bg-gray-700 cursor-not-allowed"
                : "bg-primary-500 hover:bg-primary-600"
            }`}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
