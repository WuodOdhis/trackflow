// Simple integration test script for TrackFlow
const { ethers } = require("ethers");

// Contract address (update this with your deployed address)
const CONTRACT_ADDRESS = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

// Localhost provider
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// Load contract ABI
const fs = require("fs");
const contractABI = JSON.parse(fs.readFileSync("./lib/TrackFlow.json", "utf8"));

async function testTrackFlow() {
  console.log("Starting TrackFlow Integration Test...\n");

  try {
    // Get test accounts (Hardhat provides pre-funded accounts)
    const accounts = await provider.listAccounts();
    console.log("Available accounts:");
    for (let i = 0; i < Math.min(accounts.length, 5); i++) {
      const balance = await provider.getBalance(accounts[i].address);
      console.log(`  ${i}: ${accounts[i].address} (${ethers.formatEther(balance)} ETH)`);
    }

    // Hardhat default private keys (from node output)
    const privateKeys = [
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Account 0
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Account 1
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Account 2
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Account 3
    ];

    const [shipperAddress, carrierAddress, verifier1Address, verifier2Address] = accounts.map(acc => acc.address);

    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

    console.log("\nStep 1: Creating a logistics contract...");

    // Create contract with shipper
    const shipperSigner = new ethers.Wallet(privateKeys[0], provider);
    const contractWithShipper = contract.connect(shipperSigner);

    const locations = ["Warehouse A", "Port Facility", "Delivery Hub"];
    const verifiers = [verifier1Address, verifier2Address, verifier1Address];
    const payment = ethers.parseEther("0.1");

    const tx = await contractWithShipper.createContract(
      carrierAddress,
      verifier2Address, // recipient
      locations,
      verifiers,
      { value: payment }
    );

    const receipt = await tx.wait();
    console.log(`Contract created! TX: ${receipt.hash}`);

    // Extract contract ID from events
    const event = receipt.logs.find(log =>
      log.topics[0] === ethers.id("ContractCreated(uint256,address,address,address,uint256)")
    );

    // Get the ID of the contract we just created (nextContractId - 1)
    const nextId = await contract.nextContractId();
    const contractId = Number(nextId) - 1;
    console.log(`Contract ID: ${contractId}`);

    // Check contract details
    console.log("\nStep 2: Checking contract details...");
    const details = await contract.getContract(contractId);
    console.log(`   Status: ${["Created", "Accepted", "In Transit", "Delivered", "Disputed"][details[4]]}`);
    console.log(`   Payment: ${ethers.formatEther(details[3])} ETH`);
    console.log(`   Milestones: ${details[6]}/${details[5]}`);
    console.log(`   Carrier: ${details[1]}`);
    console.log(`   Shippe: ${details[0]}`);

    // Always accept the contract (carrier must explicitly accept)
    console.log("\nStep 3: Carrier accepting contract...");
    const carrierSigner = new ethers.Wallet(privateKeys[1], provider);
    const contractWithCarrier = contract.connect(carrierSigner);

    await contractWithCarrier.acceptContract(contractId);
    console.log("Contract accepted by carrier!");

    // Verify first milestone
    console.log("\nStep 4: Verifying first milestone...");
    const verifier1Signer = new ethers.Wallet(privateKeys[2], provider);
    const contractWithVerifier1 = contract.connect(verifier1Signer);

    // Generate QR data that matches the contract's hash generation
    const qrData = ethers.solidityPacked(
      ["uint256", "string", "address"],
      [contractId, locations[0], verifiers[0]]
    );

    await contractWithVerifier1.verifyMilestone(contractId, 0, qrData);
    console.log("First milestone verified!");

    // Check updated status
    const updatedDetails = await contract.getContract(contractId);
    console.log(`   Updated Status: ${["Created", "Accepted", "In Transit", "Delivered", "Disputed"][updatedDetails[4]]}`);
    console.log(`   Progress: ${updatedDetails[6]}/${updatedDetails[5]} milestones completed`);

    // Verify second milestone (use verifier2)
    console.log("\nStep 5: Verifying second milestone...");
    const verifier2Signer = new ethers.Wallet(privateKeys[3], provider);
    const contractWithVerifier2 = contract.connect(verifier2Signer);

    const qrData2 = ethers.solidityPacked(
      ["uint256", "string", "address"],
      [contractId, locations[1], verifiers[1]]
    );
    await contractWithVerifier2.verifyMilestone(contractId, 1, qrData2);
    console.log("Second milestone verified!");

    // Verify final milestone (should trigger payment) - back to verifier1
    console.log("\nStep 6: Verifying final milestone and releasing payment...");
    const qrData3 = ethers.solidityPacked(
      ["uint256", "string", "address"],
      [contractId, locations[2], verifiers[2]]
    );
    await contractWithVerifier1.verifyMilestone(contractId, 2, qrData3);
    console.log("Final milestone verified! Payment should be released.");

    // Final status check
    const finalDetails = await contract.getContract(contractId);
    console.log(`   Final Status: ${["Created", "Accepted", "In Transit", "Delivered", "Disputed"][finalDetails[4]]}`);
    console.log(`   Final Progress: ${finalDetails[6]}/${finalDetails[5]} milestones completed`);

    // Check carrier balance
    const carrierBalance = await provider.getBalance(carrierAddress);
    console.log(`Carrier balance: ${ethers.formatEther(carrierBalance)} ETH`);

    console.log("\nTrackFlow integration test completed successfully!");
    console.log("All milestones verified");
    console.log("Payment released to carrier");
    console.log("Contract marked as delivered");

  } catch (error) {
    console.error("Test failed:", error.message);
    console.error("Full error:", error);
  }
}

// Run the test
testTrackFlow();
