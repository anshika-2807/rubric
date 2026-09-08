# Web3 credential work — parked, not wired

Nothing in this directory is imported by the running application. It is kept
because the contract and deploy scripts are real work worth resuming, not because
V1 uses them.

## Why it was removed from the V1 flow

`docs/v1-scope.md` lists on-chain credentials as out of scope. Two specific
problems also had to be removed rather than merely disabled:

1. **`verifyCredential()` returned `isValid: true` for any credential id** when
   Web3 was unconfigured — which was the default state, since no contract was
   deployed. It returned a hardcoded `skill: 'Problem Framing', level: 'L2'`
   alongside it. This was reachable from a public "Employer Verification" tab. A
   verification endpoint that confirms input it never verified is the most
   damaging thing a trust product can ship.

2. **`issueCredential()` fabricated a transaction hash** with
   `crypto.randomBytes(32)` and returned a real-looking
   `sepolia.etherscan.io/tx/<hash>` link for a transaction that never happened.

Both were labelled internally as simulation mode. Labels in a JSON field do not
survive into a screenshot, a demo, or a verifier's memory.

## What was kept

`hashEvidence` moved to `engine/evidence.js`, reimplemented on `node:crypto` with
no dependency. It produces a stable digest over the evidence that decided a
verdict, which makes later silent edits to a stored report detectable. It does
not claim to be immutability or third-party proof, and the UI says so.

## To resume

```
cd future-work/web3
npm install ethers solc          # no longer in engine/package.json
node scripts/compile.js
node scripts/deploy.js
```

`web3.js` still expects the old `CONFIG` shape (`sepoliaRpcUrl`,
`issuerPrivateKey`, `contractAddress`, `explorerUrl`, `isWeb3Configured`), all of
which were removed from `engine/config.js`. It will need those re-added under a
separate namespace before it runs.

If this is picked up again, the non-negotiable change: an unconfigured or failed
verification must return "cannot verify", never "valid".
