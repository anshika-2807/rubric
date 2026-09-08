/**
 * rubrik. — Sepolia Deployment Script (ethers v6)
 * 
 * Deploys RubricSkillCredential.sol to Ethereum Sepolia testnet.
 * 
 * Usage:
 *   node scripts/deploy.js
 * 
 * Environment variables required (in engine/.env):
 *   SEPOLIA_RPC_URL=https://rpc.sepolia.org (or Alchemy/Infura endpoint)
 *   ISSUER_PRIVATE_KEY=0x... (Private key of deployer/authorized issuer)
 */

const fs = require('fs');
const path = require('path');
const { CONFIG } = require('../config');

async function main() {
  console.log('----------------------------------------------------');
  console.log(' Rubric Web3 — Sepolia Contract Deployment');
  console.log('----------------------------------------------------\n');

  let ethers;
  try {
    ethers = require('ethers');
  } catch (err) {
    console.error('Error: "ethers" package is not installed. Please run:');
    console.error('  npm install ethers@^6.13.0');
    process.exit(1);
  }

  const rpcUrl = CONFIG.sepoliaRpcUrl || 'https://rpc.sepolia.org';
  const privateKey = CONFIG.issuerPrivateKey;

  if (!privateKey || privateKey.includes('your_sepolia_issuer_private_key_here')) {
    console.error('Error: ISSUER_PRIVATE_KEY is missing or unconfigured.');
    console.error('Please configure ISSUER_PRIVATE_KEY in engine/.env or set the environment variable.');
    console.error('Example: ISSUER_PRIVATE_KEY=0xabc123...\n');
    process.exit(1);
  }

  // Load contract ABI and Bytecode
  const artifactPath = path.join(__dirname, '..', 'contracts', 'RubricSkillCredential.json');
  if (!fs.existsSync(artifactPath)) {
    console.error(`Error: Artifact not found at ${artifactPath}`);
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  if (!artifact.bytecode || artifact.bytecode === '0x') {
    // Check if solc is available to compile directly
    try {
      const solc = require('solc');
      const solPath = path.join(__dirname, '..', 'contracts', 'RubricSkillCredential.sol');
      const source = fs.readFileSync(solPath, 'utf8');

      const input = {
        language: 'Solidity',
        sources: { 'RubricSkillCredential.sol': { content: source } },
        settings: {
          optimizer: { enabled: true, runs: 200 },
          outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
        }
      };

      console.log('Compiling RubricSkillCredential.sol via solc...');
      const output = JSON.parse(solc.compile(JSON.stringify(input)));
      const contractData = output.contracts['RubricSkillCredential.sol']['RubricSkillCredential'];
      artifact.abi = contractData.abi;
      artifact.bytecode = '0x' + contractData.evm.bytecode.object;
      fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
      console.log('Compilation successful. Artifact updated.');
    } catch (e) {
      console.error('Bytecode not present in artifact and solc compilation failed:', e.message);
      console.error('Ensure solc is installed (`npm install solc`) or bytecode is populated in RubricSkillCredential.json.');
      process.exit(1);
    }
  }

  console.log(`Connecting to Sepolia RPC: ${rpcUrl}`);
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deployer / Issuer Address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.warn('\nWarning: Deployer wallet balance is 0 ETH on Sepolia.');
    console.warn('Get testnet ETH from a Sepolia faucet (e.g. sepoliafaucet.com or alchemy.com/faucets/ethereum-sepolia) before deploying.');
  }

  console.log('\nDeploying RubricSkillCredential...');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();

  console.log(`Transaction Hash: ${contract.deploymentTransaction().hash}`);
  console.log('Waiting for deployment confirmation...');
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log('\n====================================================');
  console.log(` RubricSkillCredential Deployed Successfully!`);
  console.log(` Contract Address: ${deployedAddress}`);
  console.log(` Sepolia Explorer: ${CONFIG.explorerUrl}/address/${deployedAddress}`);
  console.log('====================================================\n');
  console.log('Next step: Add this to your engine/.env:');
  console.log(`CREDENTIAL_CONTRACT_ADDRESS=${deployedAddress}\n`);

  // Auto-update or append to engine/.env if exists
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('CREDENTIAL_CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(/CREDENTIAL_CONTRACT_ADDRESS=.*/, `CREDENTIAL_CONTRACT_ADDRESS=${deployedAddress}`);
    } else {
      envContent += `\nCREDENTIAL_CONTRACT_ADDRESS=${deployedAddress}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log('Updated CREDENTIAL_CONTRACT_ADDRESS in engine/.env automatically.');
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Deployment failed:', err);
    process.exit(1);
  });
}

module.exports = { main };
