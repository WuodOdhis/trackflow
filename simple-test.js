// Simple test to check if contract is working
const { ethers } = require("ethers");
const fs = require("fs");

// Contract details
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const LOCALHOST_RPC = "http://127.0.0.1:8545";

// Load contract ABI
const contractABI = JSON.parse(fs.readFileSync("./lib/TrackFlow.json", "utf8"));

async function simpleTest() {
  console.log("🔍 Simple Contract Test...\n");

  try {
    // Setup provider
    const provider = new ethers.JsonRpcProvider(LOCALHOST_RPC);
    console.log("✅ Connected to provider");

    // Check if contract exists
    const code = await provider.getCode(CONTRACT_ADDRESS);
    console.log(`📋 Contract code length: ${code.length}`);
    console.log(`📋 Contract deployed: ${code !== '0x'}`);

    if (code === '0x') {
      console.log("❌ Contract not found at address");
      return;
    }

    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
    console.log("✅ Contract instance created");

    // Try to get next contract ID
    const nextId = await contract.nextContractId();
    console.log(`📋 Next contract ID: ${nextId}`);
    console.log(`📋 Contract address: ${CONTRACT_ADDRESS}`);

    // Test contract creation with known accounts
    console.log("\n🧪 Testing contract creation...");

    // Use Hardhat accounts for testing
    const shipperPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const shipperSigner = new ethers.Wallet(shipperPrivateKey, provider);
    const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, contractABI, shipperSigner);

    const locations = ["Test Warehouse"];
    const verifiers = ["0x90F79bf6EB2c4f870365E785982E1f101E93b906"];
    const payment = ethers.parseEther("0.01");

    const tx = await contractWithSigner.createContract(
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // carrier
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // recipient
      locations,
      verifiers,
      { value: payment }
    );

    console.log("✅ Test transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Test contract created successfully!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());

    console.log("\n🎉 All tests passed! Contract is working correctly.");
    console.log("🚀 You can now use the web interface at http://localhost:3000");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Full error:", error);
  }
}

simpleTest();
