//! Outbound-only job queue on Postgres. The signer never listens on a port: it polls
//! `payout_items` with SKIP LOCKED so several signers can never take the same item.

use postgres::{Client, NoTls};

pub struct Claimed {
    pub item_id: String,
    pub address: String,
    pub amount: u64,
    pub attempts: i32,
}

pub fn connect(url: &str) -> Result<Client, postgres::Error> {
    // Production should use TLS to the DB (e.g. Neon requires it) — wire postgres-native-tls
    // or rustls here; NoTls is only acceptable on a private network.
    Client::connect(url, NoTls)
}

pub fn maintenance_on(c: &mut Client) -> Result<bool, postgres::Error> {
    let row = c.query_opt("select (value->>'on')::boolean from system_flags where key = 'maintenance'", &[])?;
    Ok(row.and_then(|r| r.get::<_, Option<bool>>(0)).unwrap_or(false))
}

/// Items waiting for a signer (read-only — used by dry-run).
pub fn peek(c: &mut Client, limit: i64) -> Result<Vec<Claimed>, postgres::Error> {
    let rows = c.query(
        "select pi.id::text, pi.address, pi.amount::text, pi.attempts
           from payout_items pi join payout_batches pb on pb.id = pi.batch_id
          where pi.status = 'approved' and pb.status in ('approved','sending')
          order by pi.updated_at limit $1",
        &[&limit],
    )?;
    Ok(rows.iter().map(row_to_claimed).collect())
}

/// Atomically move one approved item to `signing`.
pub fn claim_next(c: &mut Client) -> Result<Option<Claimed>, postgres::Error> {
    let row = c.query_opt(
        "update payout_items set status = 'signing', attempts = attempts + 1, updated_at = now()
          where id = (
            select pi.id from payout_items pi join payout_batches pb on pb.id = pi.batch_id
             where pi.status = 'approved' and pb.status in ('approved','sending')
             order by pi.updated_at limit 1
             for update of pi skip locked)
        returning id::text, address, amount::text, attempts",
        &[],
    )?;
    if let Some(r) = &row {
        let id: String = r.get(0);
        c.execute(
            "update payout_batches set status = 'sending' where status = 'approved' and id = (select batch_id from payout_items where id::text = $1)",
            &[&id],
        )?;
    }
    Ok(row.as_ref().map(row_to_claimed))
}

pub fn mark_inscribed(c: &mut Client, id: &str, txid: &str, transfer_inscription_id: &str) -> Result<(), postgres::Error> {
    c.execute(
        "update payout_items set status = 'inscribed', inscribe_txid = $2, transfer_inscription_id = $3, updated_at = now() where id::text = $1",
        &[&id, &txid, &transfer_inscription_id],
    )?;
    Ok(())
}

pub fn mark_sent(c: &mut Client, id: &str, txid: &str, height: Option<i32>) -> Result<(), postgres::Error> {
    c.execute(
        "update payout_items set status = 'sent', send_txid = $2, send_height = $3, updated_at = now() where id::text = $1",
        &[&id, &txid, &height],
    )?;
    Ok(())
}

/// Back to `approved` for a retry, or `failed` (→ returned to the player's balance by the worker).
pub fn mark_error(c: &mut Client, id: &str, error: &str, attempts: i32, max_attempts: i32) -> Result<(), postgres::Error> {
    let next = if attempts >= max_attempts { "failed" } else { "approved" };
    c.execute("update payout_items set status = $2, error = $3, updated_at = now() where id::text = $1", &[&id, &next, &error])?;
    Ok(())
}

fn row_to_claimed(r: &postgres::Row) -> Claimed {
    Claimed {
        item_id: r.get(0),
        address: r.get(1),
        amount: r.get::<_, String>(2).parse().unwrap_or(0),
        attempts: r.get(3),
    }
}
