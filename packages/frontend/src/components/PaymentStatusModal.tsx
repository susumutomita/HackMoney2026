export type PaymentStatus = "idle" | "processing" | "success" | "failed";

export type PaymentStatusModalProps = {
  open: boolean;
  status: PaymentStatus;
  amountLabel: string;
  recipientLabel: string;
  onClose: () => void;
  onRetry?: () => void;
  errorMessage?: string;
  resultUrl?: string;
};

export function PaymentStatusModal({
  open,
  status,
  amountLabel,
  recipientLabel,
  onClose,
  onRetry,
  errorMessage,
  resultUrl,
}: PaymentStatusModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={status === "processing" ? undefined : onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {status === "processing"
                ? "Processing payment"
                : status === "success"
                  ? "Payment successful"
                  : status === "failed"
                    ? "Payment failed"
                    : "Payment"}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {amountLabel} → {recipientLabel}
            </p>
          </div>
          <button
            className={`rounded-lg px-3 py-1 text-sm text-gray-300 hover:bg-gray-800 ${
              status === "processing" ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={status === "processing" ? undefined : onClose}
            aria-label="Close"
            disabled={status === "processing"}
          >
            ✕
          </button>
        </div>

        <div className="mt-6">
          {status === "processing" && (
            <div className="rounded-xl border border-blue-700 bg-blue-900/20 p-4">
              <div className="text-sm text-blue-100 font-medium">
                Please confirm in your wallet…
              </div>
              <div className="mt-1 text-xs text-blue-200/80">
                Do not close this tab while processing.
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded bg-blue-900/40">
                <div className="h-full w-1/2 animate-pulse rounded bg-blue-400" />
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="rounded-xl border border-green-700 bg-green-900/20 p-4">
              <div className="text-sm text-green-100 font-medium">✅ Payment completed</div>
              <div className="mt-1 text-xs text-green-200/80">
                You can now proceed with the service execution.
              </div>

              {resultUrl && (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-wide text-green-200/80 mb-2">
                    Purchased output
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resultUrl}
                    alt="Purchased output"
                    className="w-full rounded-md border border-white/10 bg-white/5"
                  />
                </div>
              )}
            </div>
          )}

          {status === "failed" && (
            <div className="rounded-xl border border-red-700 bg-red-900/20 p-4">
              <div className="text-sm text-red-100 font-medium">⛔ Something went wrong</div>
              <div className="mt-1 text-xs text-red-200/80">
                {errorMessage ?? "Payment could not be completed. Please try again."}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {status === "failed" && onRetry && (
            <button
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              status === "processing"
                ? "bg-gray-700 cursor-not-allowed"
                : "bg-primary-500 hover:bg-primary-600"
            }`}
            onClick={onClose}
            disabled={status === "processing"}
          >
            {status === "processing" ? "Processing…" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
