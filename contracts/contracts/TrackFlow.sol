// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrackFlow
 * @dev Decentralized logistics coordination with QR-verified milestones
 */
contract TrackFlow is ReentrancyGuard {
    // MVP status model: minimal and explicit transitions
    // CREATED -> ACTIVE -> COMPLETED
    enum Status {
        CREATED,   // Shipper created, funds escrowed
        ACTIVE,    // Carrier accepted, milestones can be verified
        COMPLETED  // All milestones verified, full payment released
    }

    // QR-verified milestone
    struct Milestone {
        bytes32 qrHash;        // Hash of QR code content
        string location;       // Physical location name
        address verifier;      // Who can verify this milestone
        bool completed;        // Whether it's been verified
    }

    // Main logistics contract
    struct LogisticsContract {
        address shipper;       // Who's shipping (pays)
        address carrier;       // Who's carrying (gets paid)
        address recipient;     // Who receives the package
        uint256 payment;       // Total payment amount (escrowed)
        uint256 releasedAmount; // Total amount already released
        Status status;         // Current contract status
        Milestone[] milestones; // Array of required milestones
        uint256 completedMilestones; // Count of verified milestones
    }

    // Contract storage
    mapping(uint256 => LogisticsContract) public contracts;
    uint256 public nextContractId;

    // Events
    event ContractCreated(
        uint256 indexed contractId,
        address indexed shipper,
        address carrier,
        address recipient,
        uint256 payment
    );

    event ContractAccepted(uint256 indexed contractId, address indexed carrier);
    
    event MilestoneVerified(
        uint256 indexed contractId,
        uint256 milestoneIndex,
        string location,
        address verifier
    );

    event PaymentReleased(
        uint256 indexed contractId,
        address indexed carrier,
        uint256 amount,
        uint256 milestoneIndex
    );

    /**
     * @dev Create a new logistics contract
     * MVP assumptions:
     * - Shipper deposits full payment upfront
     * - One verifier per milestone (independent verifier)
     * - No oracle / GPS / offchain proofs in MVP
     */
    function createContract(
        address carrier,
        address recipient,
        string[] calldata locations,
        address[] calldata verifiers
    ) external payable returns (uint256) {
        require(msg.value > 0, "Payment required");
        require(carrier != address(0), "Invalid carrier");
        require(recipient != address(0), "Invalid recipient");
        require(locations.length > 0, "No milestones");
        require(locations.length == verifiers.length, "Mismatched arrays");

        uint256 contractId = nextContractId++;
        LogisticsContract storage c = contracts[contractId];
        
        c.shipper = msg.sender;
        c.carrier = carrier;
        c.recipient = recipient;
        c.payment = msg.value;
        c.releasedAmount = 0;
        c.status = Status.CREATED;

        // Create milestones (pickup → transit → delivery)
        for (uint256 i = 0; i < locations.length; i++) {
            bytes32 qrHash = keccak256(
                abi.encodePacked(contractId, locations[i], verifiers[i])
            );
            
            c.milestones.push(Milestone({
                qrHash: qrHash,
                location: locations[i],
                verifier: verifiers[i],
                completed: false
            }));
        }

        emit ContractCreated(
            contractId,
            msg.sender,
            carrier,
            recipient,
            msg.value
        );

        return contractId;
    }

    /**
     * @dev Carrier accepts the contract to begin milestone verification
     * Explicit transition: CREATED -> ACTIVE
     */
    function acceptContract(uint256 contractId) external {
        LogisticsContract storage c = contracts[contractId];
        
        require(c.carrier == msg.sender, "Not the carrier");
        require(c.status == Status.CREATED, "Invalid status");

        c.status = Status.ACTIVE;
        emit ContractAccepted(contractId, msg.sender);
    }

    /**
     * @dev Verify a milestone using QR code
     * Requirements:
     * - Only the designated verifier can verify
     * - Milestones must be verified in order (prevents replay/skip)
     * - QR data must hash to stored milestone hash
     */
    function verifyMilestone(
        uint256 contractId,
        uint256 milestoneIndex,
        bytes calldata qrData
    ) external nonReentrant {
        LogisticsContract storage c = contracts[contractId];
        require(c.status == Status.ACTIVE, "Invalid status");
        require(milestoneIndex < c.milestones.length, "Invalid milestone");
        require(milestoneIndex == c.completedMilestones, "Out of order");

        Milestone storage milestone = c.milestones[milestoneIndex];
        require(!milestone.completed, "Already verified");
        require(milestone.verifier == msg.sender, "Not authorized");
        
        // Verify QR hash matches
        require(
            keccak256(qrData) == milestone.qrHash,
            "Invalid QR code"
        );

        milestone.completed = true;
        c.completedMilestones++;

        // Release payment per milestone (escrowed funds released exactly once)
        uint256 total = c.milestones.length;
        uint256 perMilestone = c.payment / total;
        uint256 amount;

        if (milestoneIndex == total - 1) {
            // Last milestone: release all remaining funds (handles remainder)
            amount = c.payment - c.releasedAmount;
            c.status = Status.COMPLETED;
        } else {
            amount = perMilestone;
        }

        c.releasedAmount += amount;
        (bool sent, ) = c.carrier.call{value: amount}("");
        require(sent, "Failed to send payment");
        emit PaymentReleased(contractId, c.carrier, amount, milestoneIndex);

        emit MilestoneVerified(
            contractId,
            milestoneIndex,
            milestone.location,
            msg.sender
        );
    }

    /**
     * @dev Get contract details
     * @param contractId The contract to query
     */
    function getContract(uint256 contractId) external view returns (
        address shipper,
        address carrier,
        address recipient,
        uint256 payment,
        Status status,
        uint256 totalMilestones,
        uint256 completedMilestones
    ) {
        LogisticsContract storage c = contracts[contractId];
        return (
            c.shipper,
            c.carrier,
            c.recipient,
            c.payment,
            c.status,
            c.milestones.length,
            c.completedMilestones
        );
    }

    /**
     * @dev Get milestone details
     * @param contractId The contract ID
     * @param milestoneIndex Which milestone to query
     */
    function getMilestone(uint256 contractId, uint256 milestoneIndex) external view returns (
        string memory location,
        address verifier,
        bool completed
    ) {
        LogisticsContract storage c = contracts[contractId];
        require(milestoneIndex < c.milestones.length, "Invalid milestone");
        
        Milestone storage m = c.milestones[milestoneIndex];
        return (m.location, m.verifier, m.completed);
    }
}
