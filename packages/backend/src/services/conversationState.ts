import type { ConversationMessageType, ConversationSessionState } from "@zerokey/shared";

export type TransitionRule = {
  from: ConversationSessionState;
  type: ConversationMessageType;
  to: ConversationSessionState;
};

export const TRANSITIONS: TransitionRule[] = [
  { from: "NEW", type: "discover", to: "DISCOVERED" },
  { from: "DISCOVERED", type: "negotiate.start", to: "NEGOTIATING" },
  { from: "NEGOTIATING", type: "negotiate.accept", to: "AGREED" },
  { from: "NEGOTIATING", type: "negotiate.reject", to: "CANCELLED" },
  { from: "NEGOTIATING", type: "session.cancel", to: "CANCELLED" },

  { from: "AGREED", type: "firewall.check", to: "FIREWALL_APPROVED" }, // decision is checked elsewhere; state updated accordingly

  { from: "FIREWALL_APPROVED", type: "pay.request", to: "PAYMENT_REQUIRED" },
  { from: "PAYMENT_REQUIRED", type: "pay.proof", to: "PAID" },
  { from: "PAID", type: "session.get", to: "PAID" },
];

export function canAcceptMessage(
  state: ConversationSessionState,
  type: ConversationMessageType
): boolean {
  // Always allow session.get (read-only)
  if (type === "session.get") return true;

  // Hard rule: pay.* impossible without approval
  if (
    (type === "pay.request" || type === "pay.proof") &&
    !(state === "FIREWALL_APPROVED" || state === "PAYMENT_REQUIRED")
  ) {
    return false;
  }

  return TRANSITIONS.some((t) => t.from === state && t.type === type);
}

export function nextState(
  state: ConversationSessionState,
  type: ConversationMessageType
): ConversationSessionState {
  const rule = TRANSITIONS.find((t) => t.from === state && t.type === type);
  if (!rule) return state;
  return rule.to;
}
