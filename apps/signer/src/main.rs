//! ZecMiners payout signer.
//!
//! SIGNER_MODE=dry-run (default): list what would be signed, change nothing.
//! SIGNER_MODE=live: claim approved items and build/broadcast payouts. Refuses to start until a
//! real, reviewed `TxBuilder` replaces `RefusingBuilder` (see docs/SIGNER.md).

// Building blocks for the real builder; unused until it lands (see builder.rs).
#[allow(dead_code)]
mod builder;
mod fee;
#[allow(dead_code)]
mod payload;
#[allow(dead_code)]
mod utxo;
#[cfg(feature = "pg")]
#[allow(dead_code)]
mod queue;

#[cfg(feature = "pg")]
fn main() {
    use std::{env, thread, time::Duration};

    let url = env::var("SIGNER_DATABASE_URL").or_else(|_| env::var("DATABASE_URL")).unwrap_or_else(|_| {
        eprintln!("SIGNER_DATABASE_URL is required");
        std::process::exit(2);
    });
    let mode = env::var("SIGNER_MODE").unwrap_or_else(|_| "dry-run".into());
    let tick = env::var("TOKEN_TICK").unwrap_or_else(|_| "ZGEMS".into());
    let poll = Duration::from_secs(env::var("SIGNER_POLL_SECONDS").ok().and_then(|s| s.parse().ok()).unwrap_or(15));

    let mut db = queue::connect(&url).unwrap_or_else(|e| {
        eprintln!("database connection failed: {e}");
        std::process::exit(2);
    });

    if mode != "live" {
        let items = queue::peek(&mut db, 50).expect("query failed");
        println!("dry-run: {} approved payout item(s) waiting", items.len());
        for i in items {
            let p = payload::zrc20_transfer(&tick, i.amount).expect("payload");
            // Rough size for a 1-in/2-out tx1 carrying the payload; the real builder computes exact sizes.
            let est = fee::zip317_fee(150, 34 * 2 + p.len() as u64 + 11) + fee::zip317_fee(300, 68);
            println!("  {} → {} amt {} payload {}B est. fee {} zats", i.item_id, i.address, i.amount, p.len(), est);
        }
        return;
    }

    let builder = builder::RefusingBuilder;
    // Safety interlock: never run live with the refusing builder.
    if std::any::type_name_of_val(&builder).ends_with("RefusingBuilder") {
        eprintln!("SIGNER_MODE=live requires a reviewed TxBuilder (librustzcash). See docs/SIGNER.md. Refusing to start.");
        std::process::exit(3);
    }

    #[allow(unreachable_code)]
    loop {
        if queue::maintenance_on(&mut db).unwrap_or(true) {
            thread::sleep(poll);
            continue;
        }
        match queue::claim_next(&mut db) {
            Ok(Some(item)) => {
                let job = builder::PayoutJob { item_id: item.item_id.clone(), address: item.address.clone(), amount: item.amount, tick: tick.clone() };
                // 1) load hot-wallet UTXOs and their inscriptions from Zord, 2) select_fee_inputs,
                // 3) tx1 inscribe_transfer → mark_inscribed, 4) wait for tx1, select_token_input,
                // 5) tx2 send_inscription → mark_sent. Any error → mark_error.
                let _ = (&job, &builder);
                let _ = queue::mark_error(&mut db, &item.item_id, "builder not implemented", item.attempts, 5);
            }
            Ok(None) => thread::sleep(poll),
            Err(e) => {
                eprintln!("queue error: {e}");
                thread::sleep(poll);
            }
        }
    }
}

#[cfg(not(feature = "pg"))]
fn main() {
    eprintln!("built without the `pg` feature; nothing to do");
}
