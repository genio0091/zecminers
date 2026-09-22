# Payout signer (blueprint §10.3–10.6)

The signer is the only component that holds a key: the **hot wallet** key, never the treasury seed. It runs on its own host with **no inbound ports**. It only connects out to Postgres, and later to Zord and Zebra over the VPN.

## Current state

`apps/signer` contains the parts that can be written and tested now:

- `fee.rs`: ZIP 317 fees (the same formula as `packages/zcash`)
- `payload.rs`: the ZRC-20 transfer payload, byte-identical to the TypeScript builder
- `utxo.rs`: coin-selection rules. Unknown coins are never spent, fee coins and token coins are never mixed, and the token coin must carry exactly the one transfer inscription
- `queue.rs`: `claim_next` (`FOR UPDATE SKIP LOCKED`), `mark_inscribed`, `mark_sent` and `mark_error`, plus a maintenance-flag check
- `builder.rs`: the `TxBuilder` trait and a `RefusingBuilder`

`SIGNER_MODE=dry-run` (the default) lists approved items with payload sizes and fee estimates. `SIGNER_MODE=live` **exits with code 3** while `RefusingBuilder` is the builder. This is intentional: nothing can sign by accident.

## What must be built (M3) before `live`

1. **Verify at M0 (§3.3)** against the `zatoshilabs/zord` source: the carrier encoding and byte limits, how a transfer inscription is created at the sender, how Zord attributes it, and reorg handling.
2. **Implement `TxBuilder`** on the official `librustzcash` crates (`zcash_primitives`, `zcash_transparent`, `zcash_proofs` as needed):
   - v5 transactions only (v4 is rejected after NU7)
   - fees from ZIP 317 on the real serialized sizes
   - `nExpiryHeight` set by wall-clock time (after NU7, 40 blocks is only about 17 minutes)
   - tx1: inscribe the `transfer` at the hot wallet, paid from clean fee coins
   - tx2: send exactly the coin carrying that inscription to `payout_items.address` (always the pass origin address)
3. **Key custody:** a KMS/HSM, or an encrypted key file whose passphrase exists only in memory.
4. **Wire the loop** in `main.rs`:
   1. load hot-wallet UTXOs
   2. ask Zord which inscriptions each coin carries
   3. `select_fee_inputs`
   4. tx1, then `mark_inscribed`
   5. wait for tx1
   6. `select_token_input`
   7. tx2, then `mark_sent(send_height)`
   8. any error → `mark_error`
5. **TLS** to Postgres (Neon requires it). Use a restricted DB role that can only update `payout_items` and `payout_batches`, and read `system_flags`.
6. **External security review** of the signer and the payout path, then 3 small mainnet payouts to internal addresses (§12.2).

The worker settles items only after finality **and** after Zord shows the transfer inscription at the player's address (`ZORD_MODE=live`). Failed items are credited back to the player's in-game balance.

## Operating rules

- The treasury stays cold. It sends periodic tranches (for example 7 days of payouts) to the hot wallet with an ordinary ZRC-20 transfer, from the dedicated treasury device.
- Every batch needs an admin approval. Approval is refused while maintenance is on or the latest reserve check failed.
- No payouts during the NU7 freeze window (`system_flags.freeze_windows`).
