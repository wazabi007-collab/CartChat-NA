/** Preserve a recorded Ready milestone even if the store later changes flow. */
export function trackingSteps(usesReadyStep: boolean | null | undefined, status: string, history: { status: string }[] = []) {
  return usesReadyStep !== false || status === "ready" || history.some((entry) => entry.status === "ready")
    ? ["pending", "confirmed", "ready", "completed"]
    : ["pending", "confirmed", "completed"];
}
