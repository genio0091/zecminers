import { TOTAL_SUPPLY } from "@zecminers/economy";
import type { ChainIndexer, IndexerStatus, InscriptionInfo, TokenInfo } from "@zecminers/zord-client";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { DbOrTx } from "../client";
import { passes, payoutItems } from "../schema";
import { getRegistry } from "../system";

const EPOCH = Date.parse("2026-09-22T00:00:00Z");
const EPOCH_HEIGHT = 3_480_000;

/**
 * DEVELOPMENT ONLY (ZORD_MODE=mock). An indexer that answers from our own database as if the
 * chain were perfectly in sync, so the site, the checks and the payout pipeline can run end to
 * end without Zebra or Zord. Height follows wall-clock time at 75 s per block, so every process
 * sees the same tip.
 */
export class DbMockIndexer implements ChainIndexer {
  constructor(private readonly db: DbOrTx) {}

  height(): number {
    return EPOCH_HEIGHT + Math.floor((Date.now() - EPOCH) / 75_000);
  }

  async status(): Promise<IndexerStatus> {
    return { height: this.height(), blockTime: new Date().toISOString() };
  }

  private async paidTo(statuses: ("settled" | "sent")[], address?: string): Promise<bigint> {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${payoutItems.amount}), 0)` })
      .from(payoutItems)
      .where(address ? and(inArray(payoutItems.status, statuses), eq(payoutItems.address, address)) : inArray(payoutItems.status, statuses));
    return BigInt(row?.total ?? "0");
  }

  async token(tick: string): Promise<TokenInfo | null> {
    const reg = await getRegistry(this.db);
    if (!reg.treasury_address) return null;
    const [holders] = await this.db
      .select({ n: sql<number>`count(distinct ${payoutItems.address})` })
      .from(payoutItems)
      .where(inArray(payoutItems.status, ["settled", "sent"]));
    return {
      tick,
      max: TOTAL_SUPPLY,
      minted: TOTAL_SUPPLY,
      holders: 1 + Number(holders?.n ?? 0),
      deployInscriptionId: reg.token_inscription_id ?? "mock-deploy-i0",
      deployTxid: reg.token_deploy_txid ?? null,
    };
  }

  async balance(address: string): Promise<bigint> {
    const reg = await getRegistry(this.db);
    if (address === reg.treasury_address) return TOTAL_SUPPLY - (await this.paidTo(["settled", "sent"]));
    if (address === reg.hot_wallet_address) return 0n;
    return this.paidTo(["settled", "sent"], address);
  }

  async inscription(id: string): Promise<InscriptionInfo | null> {
    const [pass] = await this.db.select().from(passes).where(eq(passes.inscriptionId, id)).limit(1);
    if (pass) {
      return { id, owner: pass.originAddress, outpoint: null, height: EPOCH_HEIGHT, contentType: "application/json", body: { p: "zrc-721", op: "mint" } };
    }
    const [item] = await this.db.select().from(payoutItems).where(eq(payoutItems.transferInscriptionId, id)).limit(1);
    if (item) {
      return { id, owner: item.address, outpoint: null, height: item.sendHeight, contentType: "application/json", body: { p: "zrc-20", op: "transfer" } };
    }
    return null;
  }

  async utxoInscriptions(): Promise<string[]> {
    return [];
  }
}
