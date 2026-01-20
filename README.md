# TrackFlow - Decentralized Logistics Coordination Platform

[![Ethereum](https://img.shields.io/badge/Ethereum-Compatible-blue.svg)](https://ethereum.org/)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-black.svg)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.4+-black.svg)](https://nextjs.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.26+-yellow.svg)](https://hardhat.org/)

TrackFlow is a decentralized logistics coordination platform that brings transparency, security, and automation to supply chain management using blockchain technology.

## Overview

TrackFlow enables secure, transparent, and automated logistics coordination through smart contracts, QR code verification, and decentralized payments. The platform eliminates intermediaries while providing:

- **Trustless Contract Creation**: Multi-party logistics agreements with automated enforcement
- **QR-Verified Milestones**: Physical milestone verification using cryptographic QR codes
- **Automated Payments**: Smart contract escrow with conditional payment releases
- **Real-time Tracking**: Live contract status and progress monitoring
- **Decentralized Security**: Immutable records with cryptographic verification

## Key Features

### Core Functionality
- Smart contract-based logistics with multi-milestone tracking
- QR code generation and camera-based scanning for milestone verification
- Automated payment releases based on milestone completion
- Real-time contract status monitoring
- Multi-party coordination (shippers, carriers, verifiers)

### Technical Features
- Reentrancy protection using OpenZeppelin's ReentrancyGuard
- Role-based access control for contract interactions
- Responsive mobile-first UI with Tailwind CSS
- Seamless Web3 integration with MetaMask
- Complete Hardhat development environment
- TypeScript support throughout the stack

### Security Features
- Immutable blockchain records for all contract actions
- Cryptographic QR code verification using keccak256 hashing
- Escrow protection with funds released only when conditions are met
- Direct peer-to-peer transactions without intermediaries

## Tech Stack

### Frontend
- **Framework**: Next.js 15.4+ (App Router)
- **UI**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4
- **Web3**: Ethers.js v6
- **QR Codes**: QRCode.js for generation, @zxing/library for scanning

### Blockchain
- **Language**: Solidity ^0.8.20
- **Framework**: Hardhat 2.26+
- **Security**: OpenZeppelin Contracts v5.4+
- **Networks**: Localhost (testing), Arbitrum Sepolia (testnet), Arbitrum One (production)

## Installation & Setup

### Prerequisites
- Node.js 18+ (preferably 20+)
- MetaMask browser extension
- Git

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/WuodOdhis/trackflow.git
cd trackflow

# Install root dependencies
npm install

# Install contract dependencies
cd contracts
npm install
cd ..
```

### 2. Start Local Blockchain

```bash
# Terminal 1: Start Hardhat node
cd contracts
npx hardhat node
```

### 3. Deploy Contract

```bash
# Terminal 2: Deploy to localhost
cd contracts
npx hardhat run deploy.ts --network localhost
```

### 4. Copy Contract ABI

```bash
# Terminal 3: Copy ABI to frontend
node -e "const fs=require('fs'); const path=require('path'); const artifact=require('./contracts/artifacts/contracts/TrackFlow.sol/TrackFlow.json'); fs.writeFileSync('./lib/TrackFlow.json', JSON.stringify(artifact.abi, null, 2));"
```

### 5. Start Frontend

```bash
# Terminal 3: Start Next.js development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Connect Wallet
- Click "Connect MetaMask"
- Approve the connection in MetaMask
- Ensure you're on "Hardhat Localhost" network (Chain ID: 31337)

### 2. Create Contract
- Fill in carrier address (the wallet that will transport the goods)
- Set payment amount in ETH
- Add milestones with:
  - Location name
  - Verifier address (wallet authorized to confirm this milestone)
- Click "Create Contract" and confirm the transaction

### 3. Accept Contract (Carrier)
- Switch to the carrier wallet in MetaMask
- Enter the contract ID
- Click "Accept Contract" to transition from CREATED to ACTIVE status

### 4. Verify Milestones
- Generate QR code for the milestone
- Switch to the verifier wallet
- Scan the QR code using your phone camera (or paste QR data manually)
- Confirm the transaction to verify the milestone
- Payment is released proportionally after each milestone

## Contract Workflow

### Status Transitions

1. **CREATED**: Contract initialized with escrowed payment
2. **ACTIVE**: Carrier accepted, ready for milestone verification
3. **COMPLETED**: All milestones verified, full payment released

### Payment Release

- Payment is divided equally among all milestones
- Each verified milestone releases its proportional share to the carrier
- The final milestone releases any remaining balance
- All payments are automatic upon milestone verification

## Project Structure

```
trackflow/
├── components/                    # React Components
│   ├── WalletConnectButton.tsx    # MetaMask wallet connection
│   ├── CreateContractForm.tsx     # Contract creation interface
│   ├── ContractDashboard.tsx      # Contract list and overview
│   ├── MilestoneVerification.tsx  # QR generation and verification
│   ├── QRScanner.tsx              # Camera-based QR scanning
│   └── MetaMaskDiagnostics.tsx    # Network and wallet diagnostics
├── contracts/                     # Smart Contract Development
│   ├── contracts/
│   │   └── TrackFlow.sol          # Main logistics smart contract
│   ├── deploy.ts                  # Deployment script
│   ├── hardhat.config.ts          # Hardhat configuration
│   └── package.json               # Contract dependencies
├── lib/                           # Utility Libraries
│   ├── contracts.ts               # Web3 integration functions
│   └── TrackFlow.json             # Contract ABI
├── src/app/                       # Next.js Application
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Main application page
├── package.json                   # Frontend dependencies
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This documentation
```

## Smart Contract API

### Core Functions

#### createContract
```solidity
function createContract(
    address carrier,
    address recipient,
    string[] calldata locations,
    address[] calldata verifiers
) external payable returns (uint256 contractId)
```
Creates a new logistics contract with escrowed payment.

#### acceptContract
```solidity
function acceptContract(uint256 contractId) external
```
Carrier accepts the contract, transitioning status from CREATED to ACTIVE.

#### verifyMilestone
```solidity
function verifyMilestone(
    uint256 contractId,
    uint256 milestoneIndex,
    bytes calldata qrData
) external
```
Verifies a milestone using QR code data. Automatically releases proportional payment.

### View Functions

#### getContract
```solidity
function getContract(uint256 contractId) external view returns (
    address shipper,
    address carrier,
    address recipient,
    uint256 payment,
    Status status,
    uint256 totalMilestones,
    uint256 completedMilestones
)
```

#### getMilestone
```solidity
function getMilestone(uint256 contractId, uint256 milestoneIndex)
external view returns (string memory location, address verifier, bool completed)
```

## Deployment to Arbitrum Sepolia

### 1. Update Hardhat Config

Add Arbitrum Sepolia network to `contracts/hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};

export default config;
```

### 2. Set Private Key

```bash
# Create .env file in contracts directory
echo "PRIVATE_KEY=your_private_key_without_0x" > contracts/.env
```

### 3. Deploy to Arbitrum Sepolia

```bash
cd contracts
npx hardhat run deploy.ts --network arbitrumSepolia
```

### 4. Update Frontend

Update `lib/contracts.ts` with the new contract address and RPC URL:

```typescript
export const CONTRACT_ADDRESS = "your_deployed_contract_address";
const ARB_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
```

## Testing

### Integration Test

Run the automated integration test:

```bash
node test-integration.js
```

This test will:
1. Create a contract with 3 milestones and 0.1 ETH payment
2. Accept the contract as the carrier
3. Verify all milestones sequentially
4. Confirm payment release to carrier

### Manual Testing

1. **Test Contract Creation**
   - Connect with shipper wallet
   - Create contract with test data
   - Verify contract appears in dashboard

2. **Test Contract Acceptance**
   - Switch to carrier wallet
   - Load contract by ID
   - Accept the contract

3. **Test Milestone Verification**
   - Generate QR code for milestone
   - Switch to verifier wallet
   - Scan/paste QR data
   - Verify milestone and check payment release

## Security

- **ReentrancyGuard**: All payment functions protected against reentrancy attacks
- **Access Control**: Strict role-based permissions for contract operations
- **Payment Security**: Funds held in escrow until verified conditions are met
- **Cryptographic Verification**: QR codes use keccak256 hashing with contract-specific data
- **Immutable Audit Trail**: All actions permanently recorded on blockchain

## Troubleshooting

**"MetaMask can't connect to localhost"**
- Ensure Hardhat node is running on port 8545
- Check MetaMask network configuration
- Hard refresh the page (Ctrl+Shift+R)

**"Contract deployment failed"**
- Verify Hardhat node is running
- Check account has sufficient ETH
- Ensure correct network configuration

**"Wrong network" warning**
- Click the network switcher in MetaMask
- Select "Hardhat Localhost" or add it manually:
  - RPC URL: http://127.0.0.1:8545
  - Chain ID: 31337
  - Currency: ETH

**"Invalid status" error**
- Ensure contract has been accepted before verifying milestones
- Check you're connected with the correct wallet (carrier to accept, verifier to verify)

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with clear commit messages
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Support

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community support

---

Built with cutting-edge Web3 technologies for transparent and secure logistics coordination.
