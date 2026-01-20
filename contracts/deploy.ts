import { ethers } from "hardhat";
import { writeFileSync } from "fs";

async function main() {
  // Get the contract factory
  const TrackFlow = await ethers.getContractFactory("TrackFlow");

  // Deploy the contract
  console.log("Deploying TrackFlow...");
  const trackFlow = await TrackFlow.deploy();
  await trackFlow.waitForDeployment();

  // Get the deployed address
  const address = await trackFlow.getAddress();
  console.log("TrackFlow deployed to:", address);

  // Persist deployment for frontend/local use
  const output = { name: "TrackFlow", address };
  writeFileSync("./deployments.localhost.json", JSON.stringify(output, null, 2));
}

// Run deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });