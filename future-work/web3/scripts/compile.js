/**
 * rubrik. — Contract Compilation Helper
 * Compiles RubricSkillCredential.sol using solc and updates RubricSkillCredential.json
 */

const fs = require('fs');
const path = require('path');

function compile() {
  let solc;
  try {
    solc = require('solc');
  } catch (err) {
    console.error('Error: "solc" package not installed. Run: npm install solc');
    process.exit(1);
  }

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

  console.log('Compiling RubricSkillCredential.sol...');
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const hasError = output.errors.some(e => e.severity === 'error');
    output.errors.forEach(e => console.log(e.formattedMessage));
    if (hasError) process.exit(1);
  }

  const contractData = output.contracts['RubricSkillCredential.sol']['RubricSkillCredential'];
  const artifactPath = path.join(__dirname, '..', 'contracts', 'RubricSkillCredential.json');
  const artifact = {
    contractName: 'RubricSkillCredential',
    abi: contractData.abi,
    bytecode: '0x' + contractData.evm.bytecode.object
  };

  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(`Successfully compiled and saved artifact to ${artifactPath}`);
}

if (require.main === module) {
  compile();
}

module.exports = { compile };
