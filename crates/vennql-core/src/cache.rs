use std::hash::Hasher;
use twox_hash::XxHash64;

pub fn compute_cache_tag(procedure_id: u16, payload: &[u8]) -> u64 {
    let mut hasher = XxHash64::with_seed(0x56454E4E);
    hasher.write_u16(procedure_id);
    hasher.write(payload);
    hasher.finish()
}

pub fn format_cache_tag(procedure_id: u16, hash: u64) -> String {
    format!("vq_{:04x}_{:016x}", procedure_id, hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deterministic_cache_tag() {
        let payload1 = b"{\"org_id\":\"org_123\",\"filter\":\"active\"}";
        let payload2 = b"{\"org_id\":\"org_123\",\"filter\":\"active\"}";
        let payload3 = b"{\"org_id\":\"org_123\",\"filter\":\"inactive\"}";

        let hash1 = compute_cache_tag(100, payload1);
        let hash2 = compute_cache_tag(100, payload2);
        let hash3 = compute_cache_tag(100, payload3);

        assert_eq!(hash1, hash2, "Identical queries must produce identical cache tags");
        assert_ne!(hash1, hash3, "Different queries must produce different cache tags");

        let tag_str = format_cache_tag(100, hash1);
        assert!(tag_str.starts_with("vq_0064_"));
        assert_eq!(tag_str.len(), 3 + 4 + 1 + 16);
    }
}
