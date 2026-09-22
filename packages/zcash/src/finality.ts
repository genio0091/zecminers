/**
 * Finality is time-based (~15 minutes), not a fixed block count (blueprint §2):
 * 12 confirmations at 75 s blocks before NU7, 36 confirmations at 25 s blocks after.
 */
export const PRE_NU7_CONFIRMATIONS = 12;
export const POST_NU7_CONFIRMATIONS = 36;
export const PRE_NU7_BLOCK_SECONDS = 75;
export const POST_NU7_BLOCK_SECONDS = 25;

export function requiredConfirmations(txHeight: number, nu7ActivationHeight: number | null): number {
  if (nu7ActivationHeight !== null && txHeight >= nu7ActivationHeight) return POST_NU7_CONFIRMATIONS;
  return PRE_NU7_CONFIRMATIONS;
}

export function isFinal(txHeight: number, tipHeight: number, nu7ActivationHeight: number | null): boolean {
  if (txHeight <= 0) return false;
  return tipHeight - txHeight + 1 >= requiredConfirmations(txHeight, nu7ActivationHeight);
}

export function blockSeconds(height: number, nu7ActivationHeight: number | null): number {
  return nu7ActivationHeight !== null && height >= nu7ActivationHeight ? POST_NU7_BLOCK_SECONDS : PRE_NU7_BLOCK_SECONDS;
}

/**
 * nExpiryHeight should track wall-clock time: after NU7, 40 blocks is only ~17 minutes.
 * `targetMinutes` is converted to blocks at the block time in force at `currentHeight`.
 */
export function expiryHeight(currentHeight: number, nu7ActivationHeight: number | null, targetMinutes = 50): number {
  const seconds = blockSeconds(currentHeight, nu7ActivationHeight);
  return currentHeight + Math.max(20, Math.ceil((targetMinutes * 60) / seconds));
}

/** Estimated wall-clock time until `targetHeight`, used when choosing a raffle close height. */
export function estimateHeightAt(
  tipHeight: number,
  at: Date,
  now: Date,
  nu7ActivationHeight: number | null,
): number {
  let height = tipHeight;
  let seconds = Math.max(0, (at.getTime() - now.getTime()) / 1000);
  while (seconds > 0) {
    seconds -= blockSeconds(height + 1, nu7ActivationHeight);
    if (seconds >= 0) height++;
  }
  return height;
}
