// Tamper-evidence digest.
//
// A stable hash over the evidence that decided a verdict — anchor scores, their
// quoted spans, universal fails, the computed metrics. Stored alongside the
// attempt so a later silent edit to the stored report is detectable: recompute
// the digest and compare.
//
// What this is NOT, and what the UI must never imply:
//   * not a blockchain anchor
//   * not immutability — the row and the digest live in the same database, so a
//     party with write access could rewrite both
//   * not proof of anything to a third party
//
// It is an integrity check against accidental or careless mutation, which is
// worth having and is honest about its scope. The earlier version of this module
// also issued on-chain credentials and exposed a verification endpoint that
// returned isValid:true for any id whenever Web3 was unconfigured — which was its
// default state. That is removed; see future-work/web3/.

const crypto = require('crypto');

/**
 * Deterministic digest of an evidence payload.
 *
 * Keys are sorted recursively before serialising, so a payload that differs only
 * in property order hashes identically and the digest stays reproducible across
 * Node versions and store adapters.
 */
function hashEvidence(payload) {
  const canonical = typeof payload === 'string' ? payload : stableStringify(payload);
  return 'sha256:' + crypto.createHash('sha256').update(canonical).digest('hex');
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort()
    .map(k => JSON.stringify(k) + ':' + stableStringify(value[k]))
    .join(',') + '}';
}

/** Recompute and compare — used to check a stored report has not been altered. */
function verifyEvidenceHash(payload, expected) {
  return hashEvidence(payload) === expected;
}

module.exports = { hashEvidence, verifyEvidenceHash };
