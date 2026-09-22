//! ZIP 317 proportional fee (blueprint §3.5). Mirrors packages/zcash/src/fees.ts.

pub const MARGINAL_FEE_ZATS: u64 = 5_000;
pub const GRACE_ACTIONS: u64 = 2;
pub const P2PKH_STANDARD_INPUT_SIZE: u64 = 150;
pub const P2PKH_STANDARD_OUTPUT_SIZE: u64 = 34;

fn div_ceil(a: u64, b: u64) -> u64 {
    a.div_ceil(b)
}

/// logical_actions = max(ceil(tx_in_total_size / 150), ceil(tx_out_total_size / 34))
pub fn logical_actions(tx_in_total_size: u64, tx_out_total_size: u64) -> u64 {
    div_ceil(tx_in_total_size, P2PKH_STANDARD_INPUT_SIZE).max(div_ceil(tx_out_total_size, P2PKH_STANDARD_OUTPUT_SIZE))
}

/// fee = 5000 · max(2, logical_actions). Never hard-code a fee: inscription payloads grow tx size.
pub fn zip317_fee(tx_in_total_size: u64, tx_out_total_size: u64) -> u64 {
    MARGINAL_FEE_ZATS * GRACE_ACTIONS.max(logical_actions(tx_in_total_size, tx_out_total_size))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grace_minimum() {
        assert_eq!(zip317_fee(148, 34), 10_000);
    }

    #[test]
    fn grows_with_payload() {
        assert_eq!(zip317_fee(150, 34 + 120), 25_000);
        assert_eq!(zip317_fee(450, 34), 15_000);
    }
}
