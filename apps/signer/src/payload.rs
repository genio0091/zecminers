//! ZRC-20 transfer payload (blueprint §3.1). Minified JSON, integer strings, fixed key order.

pub const OP_RETURN_STANDARD_LIMIT: usize = 80;

#[derive(Debug, PartialEq, Eq)]
pub enum PayloadError {
    BadTick,
    BadAmount,
}

fn valid_tick(tick: &str) -> bool {
    !tick.is_empty() && tick.len() <= 16 && tick.chars().all(|c| c.is_ascii_alphanumeric())
}

pub fn zrc20_transfer(tick: &str, amount: u64) -> Result<String, PayloadError> {
    if !valid_tick(tick) {
        return Err(PayloadError::BadTick);
    }
    if amount == 0 {
        return Err(PayloadError::BadAmount);
    }
    Ok(format!(r#"{{"p":"zrc-20","op":"transfer","tick":"{tick}","amt":"{amount}"}}"#))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_the_typescript_builder() {
        assert_eq!(
            zrc20_transfer("ZGEMS", 84_120).unwrap(),
            r#"{"p":"zrc-20","op":"transfer","tick":"ZGEMS","amt":"84120"}"#
        );
    }

    #[test]
    fn rejects_bad_input() {
        assert_eq!(zrc20_transfer("ZG EMS", 1), Err(PayloadError::BadTick));
        assert_eq!(zrc20_transfer("ZGEMS", 0), Err(PayloadError::BadAmount));
    }
}
