//! Transaction building (blueprint §10.3). This is deliberately *not* implemented here.
//!
//! Before anything signs real payouts, the M0 checks in blueprint §3.3 must be done against the
//! zatoshilabs/zord source (carrier encoding and byte limits, transfer semantics, NU7 support),
//! the builder must be written on the official `librustzcash` crates (v5 transactions, ZIP 317
//! fees, nExpiryHeight tracking block time), and the payout path must pass an external security
//! review. Until then the only builder is one that refuses — so the binary is safe by construction.

use crate::utxo::Utxo;

#[derive(Debug)]
pub struct PayoutJob {
    pub item_id: String,
    pub address: String,
    pub amount: u64,
    pub tick: String,
}

#[derive(Debug)]
pub struct Broadcast {
    pub txid: String,
    pub height_hint: Option<u32>,
}

#[derive(Debug)]
pub enum BuildError {
    NotImplemented(&'static str),
    Unsafe(String),
}

impl std::fmt::Display for BuildError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BuildError::NotImplemented(why) => write!(f, "not implemented: {why}"),
            BuildError::Unsafe(why) => write!(f, "refused as unsafe: {why}"),
        }
    }
}

/// tx1 inscribes the transfer at the hot wallet; tx2 sends the carrying coin to the player.
pub trait TxBuilder {
    fn inscribe_transfer(&self, job: &PayoutJob, fee_inputs: &[Utxo]) -> Result<(Broadcast, String), BuildError>;
    fn send_inscription(&self, job: &PayoutJob, token_input: &Utxo, fee_inputs: &[Utxo]) -> Result<Broadcast, BuildError>;
}

pub struct RefusingBuilder;

impl TxBuilder for RefusingBuilder {
    fn inscribe_transfer(&self, _job: &PayoutJob, _fee_inputs: &[Utxo]) -> Result<(Broadcast, String), BuildError> {
        Err(BuildError::NotImplemented("ZRC-20 transfer inscription — verify carrier at M0, build with librustzcash, external review"))
    }
    fn send_inscription(&self, _job: &PayoutJob, _token_input: &Utxo, _fee_inputs: &[Utxo]) -> Result<Broadcast, BuildError> {
        Err(BuildError::NotImplemented("inscription UTXO send — build with librustzcash, external review"))
    }
}
