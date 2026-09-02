// rubrik. assessment engine — Web3 Integration Module (ethers v6)
// Handles off-chain evidence hashing (keccak256), on-chain soulbound credential issuance,
// and smart contract verification on Ethereum Sepolia testnet.

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { CONFIG } = require('./config');

let ethers;
try {
  ethers = require('ethers');
} catch (e) {
  // If ethers is not yet installed in node_modules, fallback gracefully
  ethers = null;
}

// Load compiled contract ABI
let contractArtifact = null;
try {
  const artifactPath = path.join(__dirname, 'contracts', 'RubricSkillCredential.json');
  if (fs.existsSync(artifactPath)) {
    contractArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  }
} catch (e) {
  console.warn('[Web3] Could not load contract artifact:', e.message);
}

/**
 * Computes deterministic keccak256 hash of off-chain evidence.
 * Private evidence (transcript, full candidate replies, anchors) stays off-chain.
 * Only the cryptographic digest is committed on-chain.
 */
function hashEvidence(evidenceData) {
  const canonical = typeof evidenceData === 'string'
    ? evidenceData
    : JSON.stringify(evidenceData, Object.keys(evidenceData).sort());

  if (ethers && ethers.keccak256 && ethers.toUtf8Bytes) {
    return ethers.keccak256(ethers.toUtf8Bytes(canonical));
  }
  // Fallback to SHA256 hex padded to 32 bytes if ethers is unavailable
  const sha256 = crypto.createHash('sha256').update(canonical).digest('hex');
  return '0x' + sha256;
}

/**
 * Gets ethers provider for Ethereum Sepolia (or configured RPC).
 */
function getProvider() {
  if (!ethers) return null;
  return new ethers.JsonRpcProvider(CONFIG.sepoliaRpcUrl);
}

/**
 * Gets signer wallet for the authorized issuer backend.
 */
function getIssuerSigner() {
  if (!ethers || !CONFIG.issuerPrivateKey) return null;
  const provider = getProvider();
  return new ethers.Wallet(CONFIG.issuerPrivateKey, provider);
}

/**
 * Gets the RubricSkillCredential contract instance.
 */
function getContract(signerOrProvider) {
  if (!ethers || !CONFIG.contractAddress || !contractArtifact) return null;
  return new ethers.Contract(CONFIG.contractAddress, contractArtifact.abi, signerOrProvider);
}

/**
 * Issues a soulbound skill credential to a candidate's wallet address.
 * Called after an assessment produces a passing skill + level result.
 * 
 * @param {Object} params
 * @param {string} params.recipient Candidate's connected wallet address (0x...)
 * @param {string} params.skill Competency name (e.g. "Problem Framing")
 * @param {string} params.level Verified level (e.g. "L2")
 * @param {Object|string} params.evidence Private assessment evidence data
 */
async function issueCredential({ recipient, skill, level, evidence }) {
  if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    throw new Error('Invalid recipient wallet address. Please connect a valid Ethereum wallet.');
  }

  const evidenceHash = hashEvidence(evidence);

  if (!CONFIG.isWeb3Configured || !ethers) {
    // Graceful testnet simulation when credentials are not yet deployed in .env
    const simulatedId = Math.floor(1000 + Math.random() * 9000);
    const mockTxHash = '0x' + crypto.randomBytes(32).toString('hex');
    return {
      success: true,
      onChain: false,
      credentialId: simulatedId.toString(),
      recipient,
      skill,
      level,
      timestamp: Math.floor(Date.now() / 1000),
      evidenceHash,
      txHash: mockTxHash,
      explorerUrl: `${CONFIG.explorerUrl}/tx/${mockTxHash}`,
      note: 'SIMULATION MODE: Sepolia credentials not fully configured in engine/.env. Add ISSUER_PRIVATE_KEY and CREDENTIAL_CONTRACT_ADDRESS for live Sepolia on-chain broadcast.',
    };
  }

  const signer = getIssuerSigner();
  const contract = getContract(signer);
  if (!contract) {
    throw new Error('RubricSkillCredential contract could not be initialized.');
  }

  console.log(`[Web3] Submitting credential to Sepolia: recipient=${recipient}, skill=${skill}, level=${level}, hash=${evidenceHash}`);

  const tx = await contract.issueCredential(recipient, skill, level, evidenceHash);
  const receipt = await tx.wait(1);

  let credentialId = null;
  if (receipt.logs) {
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed && parsed.name === 'CredentialIssued') {
          credentialId = parsed.args.credentialId.toString();
          break;
        }
      } catch (err) {
        // Continue scanning logs
      }
    }
  }

  return {
    success: true,
    onChain: true,
    credentialId: credentialId || '1',
    recipient,
    skill,
    level,
    timestamp: Math.floor(Date.now() / 1000),
    evidenceHash,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: `${CONFIG.explorerUrl}/tx/${receipt.hash}`,
  };
}

/**
 * Verifies a credential on-chain by credentialId.
 * @param {string|number} credentialId
 */
async function verifyCredential(credentialId) {
  if (!credentialId) throw new Error('credentialId required');

  if (!CONFIG.isWeb3Configured || !ethers) {
    return {
      configured: false,
      isValid: true,
      id: credentialId.toString(),
      recipient: '0x0000000000000000000000000000000000000000',
      skill: 'Problem Framing',
      level: 'L2',
      timestamp: Math.floor(Date.now() / 1000),
      evidenceHash: '0x' + crypto.createHash('sha256').update('mock-evidence').digest('hex'),
      note: 'Web3 configuration not detected in .env. Showing verification format.',
    };
  }

  const provider = getProvider();
  const contract = getContract(provider);
  if (!contract) throw new Error('Contract not initialized');

  const res = await contract.verifyCredential(credentialId);
  const isValid = res[0] || res.isValid;

  if (!isValid) {
    return {
      configured: true,
      isValid: false,
      id: credentialId.toString(),
    };
  }

  return {
    configured: true,
    isValid: true,
    id: credentialId.toString(),
    recipient: res[1] || res.recipient,
    skill: res[2] || res.skill,
    level: res[3] || res.level,
    timestamp: Number(res[4] || res.timestamp),
    evidenceHash: res[5] || res.evidenceHash,
    explorerUrl: `${CONFIG.explorerUrl}/address/${CONFIG.contractAddress}`,
  };
}

/**
 * Look up credentials issued to a candidate wallet address.
 * @param {string} recipientAddress
 */
async function getRecipientCredentials(recipientAddress) {
  if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
    throw new Error('Invalid Ethereum wallet address');
  }

  if (!CONFIG.isWeb3Configured || !ethers) {
    return [];
  }

  const provider = getProvider();
  const contract = getContract(provider);
  if (!contract) return [];

  const credentialIds = await contract.getCredentialsByRecipient(recipientAddress);
  const results = [];

  for (const id of credentialIds) {
    try {
      const cred = await contract.getCredential(id);
      results.push({
        id: cred.id.toString(),
        recipient: cred.recipient,
        skill: cred.skill,
        level: cred.level,
        timestamp: Number(cred.timestamp),
        evidenceHash: cred.evidenceHash,
      });
    } catch (err) {
      console.warn(`[Web3] Could not read credential ${id}:`, err.message);
    }
  }

  return results;
}

module.exports = {
  hashEvidence,
  issueCredential,
  verifyCredential,
  getRecipientCredentials,
  getProvider,
};
