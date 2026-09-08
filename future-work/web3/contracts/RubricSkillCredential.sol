// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RubricSkillCredential
 * @notice Non-transferable (soulbound) on-chain credential registry for Rubric assessment outcomes.
 * @dev Assessment transcript, candidate answers, and private evaluation data are kept OFF-CHAIN.
 *      Only the cryptographic evidence hash (keccak256), skill identifier, level, recipient address,
 *      and issuance timestamp are recorded on-chain.
 */
contract RubricSkillCredential {
    struct Credential {
        uint256 credentialId;
        address recipient;
        string skill;
        string level;
        uint256 timestamp;
        bytes32 evidenceHash;
    }

    // Authorized Rubric assessment issuer / backend wallet
    address public owner;
    address public issuer;

    uint256 private _nextCredentialId = 1;

    // credentialId => Credential
    mapping(uint256 => Credential) private _credentials;

    // recipient address => list of credential IDs
    mapping(address => uint256[]) private _recipientCredentials;

    event CredentialIssued(
        uint256 indexed credentialId,
        address indexed recipient,
        string skill,
        string level,
        uint256 timestamp,
        bytes32 evidenceHash
    );

    event IssuerUpdated(address indexed oldIssuer, address indexed newIssuer);

    modifier onlyIssuer() {
        require(msg.sender == issuer || msg.sender == owner, "Rubric: caller is not authorized issuer");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Rubric: caller is not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        issuer = msg.sender;
    }

    /**
     * @notice Issue a non-transferable skill credential to a candidate's wallet.
     * @param recipient The candidate's wallet address.
     * @param skill The assessed skill / competency (e.g. "Problem Framing").
     * @param level The verified proficiency level (e.g. "L2").
     * @param evidenceHash Cryptographic keccak256 hash of the off-chain assessment evidence.
     * @return credentialId The unique ID of the issued credential.
     */
    function issueCredential(
        address recipient,
        string calldata skill,
        string calldata level,
        bytes32 evidenceHash
    ) external onlyIssuer returns (uint256) {
        require(recipient != address(0), "Rubric: invalid recipient address");
        require(bytes(skill).length > 0, "Rubric: skill cannot be empty");
        require(bytes(level).length > 0, "Rubric: level cannot be empty");
        require(evidenceHash != bytes32(0), "Rubric: evidence hash required");

        uint256 credentialId = _nextCredentialId++;

        _credentials[credentialId] = Credential({
            credentialId: credentialId,
            recipient: recipient,
            skill: skill,
            level: level,
            timestamp: block.timestamp,
            evidenceHash: evidenceHash
        });

        _recipientCredentials[recipient].push(credentialId);

        emit CredentialIssued(
            credentialId,
            recipient,
            skill,
            level,
            block.timestamp,
            evidenceHash
        );

        return credentialId;
    }

    /**
     * @notice Fetch credential by its unique ID.
     * @param credentialId The credential ID to look up.
     */
    function getCredential(uint256 credentialId)
        external
        view
        returns (
            uint256 id,
            address recipient,
            string memory skill,
            string memory level,
            uint256 timestamp,
            bytes32 evidenceHash
        )
    {
        Credential storage cred = _credentials[credentialId];
        require(cred.credentialId != 0, "Rubric: credential not found");
        return (
            cred.credentialId,
            cred.recipient,
            cred.skill,
            cred.level,
            cred.timestamp,
            cred.evidenceHash
        );
    }

    /**
     * @notice Get all credential IDs issued to a given recipient wallet.
     * @param recipient The wallet address of the recipient.
     */
    function getCredentialsByRecipient(address recipient)
        external
        view
        returns (uint256[] memory)
    {
        return _recipientCredentials[recipient];
    }

    /**
     * @notice Verify whether a credential ID is valid and active.
     * @param credentialId The credential ID to verify.
     */
    function verifyCredential(uint256 credentialId)
        external
        view
        returns (
            bool isValid,
            address recipient,
            string memory skill,
            string memory level,
            uint256 timestamp,
            bytes32 evidenceHash
        )
    {
        Credential storage cred = _credentials[credentialId];
        if (cred.credentialId == 0) {
            return (false, address(0), "", "", 0, bytes32(0));
        }
        return (
            true,
            cred.recipient,
            cred.skill,
            cred.level,
            cred.timestamp,
            cred.evidenceHash
        );
    }

    /**
     * @notice Update authorized backend issuer address.
     * @param newIssuer Address of the new authorized backend issuer.
     */
    function setIssuer(address newIssuer) external onlyOwner {
        require(newIssuer != address(0), "Rubric: invalid issuer");
        address oldIssuer = issuer;
        issuer = newIssuer;
        emit IssuerUpdated(oldIssuer, newIssuer);
    }
}
