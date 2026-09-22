# Phase 0: genesis runbook (blueprint §6)

Phase 0 deploys **$ZGEMS**, mints the whole supply in **one** mint, and deploys the **Whitelist Pass** collection (ZRC-721), all from the treasury address. It is done quietly in a single session, verified in Zord, and only then announced. None of this runs on a server: the treasury seed lives on a dedicated, clean device only (§11.1).

## Before the session

- [ ] The 7 verifications in §3.3 are done against the `zatoshilabs/zord` source: carrier byte limit, whether a 5-letter ticker is accepted, deploy + mint in the same block, Zebra compatibility, NU7 support, reorg handling, testnet.
- [ ] `ZGEMS` is still unused on Zord, Zatoshi Market and Zecscriptions, and a checked backup ticker is ready.
- [ ] Pass collection name (e.g. `ZMPASS`), supply, and metadata + images on IPFS (`<id>.json`).
- [ ] A dedicated treasury laptop with Zatoshi Wallet and a fresh wallet. The seed is backed up offline in 2 places, and a restore has been tested once.
- [ ] About 0.01 ZEC is on the treasury address for genesis fees, sent from the owner's shielded wallet.
- [ ] A full dress rehearsal on testnet (or mainnet with a random ticker and a tiny supply).
- [ ] The session is **outside the NU7 freeze window**: no $ZGEMS transactions from 48 h before to 48 h after activation (target 5 Nov 2026). Finish genesis before 1 Nov 2026.

## Payloads (minified, byte sizes computed by `packages/zcash`)

| Operation | Payload | Bytes |
|---|---|---|
| deploy | `{"p":"zrc-20","op":"deploy","tick":"ZGEMS","max":"10000000000","lim":"10000000000"}` | 83 (over the 80-byte OP_RETURN standard, so check the carrier) |
| deploy (no `lim`) | `{"p":"zrc-20","op":"deploy","tick":"ZGEMS","max":"10000000000"}` | 63 (only if Zord treats a missing `lim` as `max`) |
| mint | `{"p":"zrc-20","op":"mint","tick":"ZGEMS","amt":"10000000000"}` | 61 |
| pass collection | `{"p":"zrc-721","op":"deploy","collection":"ZMPASS","supply":"<n>","meta":"<CID>"}` | > 80 with a CID |
| pass mint | `{"p":"zrc-721","op":"mint","collection":"ZMPASS","id":"0"}` | 58 |

`lim = max` is deliberate: the whole supply leaves in one mint, so nobody else can mint the ticker.

## The session

1. Pick a quiet hour. Announce nothing.
2. Broadcast the **deploy** inscription.
3. Immediately broadcast the **mint**: in the same block if Zord allows it, otherwise right after 1 confirmation.
4. Watch the mempool and Zord for ZGEMS mints from other addresses.
5. If someone minted first, **stop**. The ticker is lost; repeat the whole session with the backup ticker.
6. Deploy the pass collection in the same session.

## Verify after finality (~15 min)

| Check | Expected |
|---|---|
| Zord `/api/v1/tokens` | tick ZGEMS, max 10,000,000,000 |
| total minted | 10,000,000,000 (100%) |
| holders | exactly 1: the treasury, 10,000,000,000 |
| canonical deploy | ours is the first valid deploy of ZGEMS (also on another explorer) |

## Record and publish

In **Admin → Genesis registry**, fill in `token_deploy_txid`, `token_mint_txid`, `token_inscription_id`, `token_deploy_height`, `token_mint_outpoint`, `treasury_address`, `hot_wallet_address`, `pass_collection`, `pass_collection_inscription_id`, `pass_collection_deploy_txid`, `pass_supply` and `explorer_base_url`. Then tick **Post the genesis ledger transaction**. That funds the pools (+8B / +1B / +0.5B / +0.5B) against `treasury_backing −10B`, exactly once.

After that, `/proof-of-reserves` shows the facts with explorer links. Switch `ZORD_MODE=live` once the chain server is reachable, and the on-chain treasury check starts running every 15 minutes.

## After genesis

- Power the treasury device down and store it. The only later treasury transactions are tranches to the hot wallet for payouts (§10.2).
- Airdrop passes: **Admin → Pass import** generates one-time claim codes (download the CSV once and DM each winner). Mint each pass inscription to the winner's address and record its inscription id on the pass row.
- The worker alerts if the treasury balance changes outside approved tranches.
