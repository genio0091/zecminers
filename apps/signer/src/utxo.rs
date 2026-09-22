//! UTXO safety (blueprint §10.4) — the most critical part of the signer.
//!
//! * Every coin is checked against the indexer before use. `inscriptions == None` means
//!   "unknown" and the coin is never spent.
//! * Fee coins (clean ZEC) and token-carrying coins are kept strictly apart.
//! * When in doubt, don't send: a wrong coin burns tokens permanently.

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Utxo {
    pub outpoint: String,
    pub value_zats: u64,
    /// Inscription ids carried by this coin according to Zord. `None` = not checked / unknown.
    pub inscriptions: Option<Vec<String>>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum SelectError {
    InsufficientCleanFunds { needed: u64, available: u64 },
    InscriptionNotFound(String),
    CoinCarriesOtherInscriptions(String),
}

impl Utxo {
    pub fn is_clean(&self) -> bool {
        matches!(&self.inscriptions, Some(v) if v.is_empty())
    }
}

/// Picks clean coins (largest first) to cover `target_zats`. Never touches a coin that carries,
/// or might carry, an inscription.
pub fn select_fee_inputs(utxos: &[Utxo], target_zats: u64) -> Result<Vec<Utxo>, SelectError> {
    let mut clean: Vec<&Utxo> = utxos.iter().filter(|u| u.is_clean()).collect();
    clean.sort_by_key(|u| std::cmp::Reverse(u.value_zats));
    let available: u64 = clean.iter().map(|u| u.value_zats).sum();
    let mut picked = Vec::new();
    let mut sum = 0u64;
    for u in clean {
        if sum >= target_zats {
            break;
        }
        sum += u.value_zats;
        picked.push(u.clone());
    }
    if sum < target_zats {
        return Err(SelectError::InsufficientCleanFunds { needed: target_zats, available });
    }
    Ok(picked)
}

/// The coin carrying exactly the transfer inscription `inscription_id`, and nothing else.
pub fn select_token_input(utxos: &[Utxo], inscription_id: &str) -> Result<Utxo, SelectError> {
    let coin = utxos
        .iter()
        .find(|u| u.inscriptions.as_ref().is_some_and(|v| v.iter().any(|i| i == inscription_id)))
        .ok_or_else(|| SelectError::InscriptionNotFound(inscription_id.to_string()))?;
    let carried = coin.inscriptions.as_ref().map(|v| v.len()).unwrap_or(0);
    if carried != 1 {
        return Err(SelectError::CoinCarriesOtherInscriptions(coin.outpoint.clone()));
    }
    Ok(coin.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn u(op: &str, v: u64, ins: Option<Vec<&str>>) -> Utxo {
        Utxo { outpoint: op.into(), value_zats: v, inscriptions: ins.map(|x| x.into_iter().map(String::from).collect()) }
    }

    #[test]
    fn fee_selection_skips_token_and_unknown_coins() {
        let coins = vec![u("a:0", 50_000, Some(vec!["pass-1"])), u("b:0", 20_000, None), u("c:0", 15_000, Some(vec![])), u("d:0", 5_000, Some(vec![]))];
        let picked = select_fee_inputs(&coins, 18_000).unwrap();
        assert_eq!(picked.iter().map(|p| p.outpoint.as_str()).collect::<Vec<_>>(), vec!["c:0", "d:0"]);
        assert_eq!(select_fee_inputs(&coins, 30_000), Err(SelectError::InsufficientCleanFunds { needed: 30_000, available: 20_000 }));
    }

    #[test]
    fn token_selection_requires_a_single_matching_inscription() {
        let coins = vec![u("x:0", 546, Some(vec!["t-1"])), u("y:0", 546, Some(vec!["t-2", "pass-9"]))];
        assert_eq!(select_token_input(&coins, "t-1").unwrap().outpoint, "x:0");
        assert!(matches!(select_token_input(&coins, "t-2"), Err(SelectError::CoinCarriesOtherInscriptions(_))));
        assert!(matches!(select_token_input(&coins, "t-3"), Err(SelectError::InscriptionNotFound(_))));
    }
}
