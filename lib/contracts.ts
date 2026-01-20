"use client";

import { ethers } from "ethers";
import TrackFlowABI from "./TrackFlow.json";

// Contract address from deployment
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Localhost network
const LOCALHOST_RPC = "http://127.0.0.1:8545";

export const getProvider = () => {
  if (typeof window !== "undefined") {
    const eth: any = (window as any).ethereum;
    if (eth) {
      // Prefer MetaMask if multiple providers are injected
      const injected = Array.isArray(eth.providers)
        ? (eth.providers.find((p: any) => p && p.isMetaMask) || eth.providers[0])
        : eth;

      return new ethers.BrowserProvider(injected);
    }
  }
  return new ethers.JsonRpcProvider(LOCALHOST_RPC);
};

export const getSigner = async () => {
  const provider = getProvider();
  if (provider instanceof ethers.BrowserProvider) {
    return await provider.getSigner();
  }
  throw new Error("No browser wallet available");
};

export const getContract = (signer?: ethers.Signer) => {
  const provider = getProvider();
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    TrackFlowABI,
    signer || provider
  );
};

// Simple contract interaction functions
export const createContract = async (
  carrier: string,
  recipient: string,
  locations: string[],
  verifiers: string[],
  payment: string
) => {
  try {
    console.log("Creating contract with params:", { carrier, recipient, locations, verifiers, payment });
    
    const signer = await getSigner();
    console.log("Got signer:", await signer.getAddress());
    
    const contract = getContract(signer);
    console.log("Contract instance created");
    
    const paymentWei = ethers.parseEther(payment);
    console.log("Payment in Wei:", paymentWei.toString());

    const tx = await contract.createContract(
      carrier,
      recipient,
      locations,
      verifiers,
      { value: paymentWei }
    );
    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Get the contract ID from the event logs
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "ContractCreated";
      } catch (e) {
        return false;
      }
    });

    if (event) {
      const parsed = contract.interface.parseLog(event);
      const contractId = parsed?.args[0];
      console.log("Contract created with ID:", contractId);
      return Number(contractId);
    }

    console.log("Contract created successfully, but couldn't find ID");
    return 0;
  } catch (error) {
    console.error("Error in createContract:", error);
    throw error;
  }
};

export const acceptContract = async (contractId: number) => {
  const signer = await getSigner();
  const contract = getContract(signer);
  const tx = await contract.acceptContract(contractId);
  await tx.wait();
};

export const verifyMilestone = async (
  contractId: number,
  milestoneIndex: number,
  qrData: string
): Promise<ethers.ContractTransactionResponse> => {
  const signer = await getSigner();
  const contract = getContract(signer);
  // Convert hex string to bytes (solidityPacked returns hex string like "0x...")
  const qrDataBytes = ethers.getBytes(qrData);
  return await contract.verifyMilestone(contractId, milestoneIndex, qrDataBytes);
};

export const getContractDetails = async (contractId: number) => {
  const contract = getContract();
  return await contract.getContract(contractId);
};

export const getMilestoneDetails = async (contractId: number, milestoneIndex: number) => {
  const contract = getContract();
  return await contract.getMilestone(contractId, milestoneIndex);
};

// Generate QR data for a milestone (matches contract's abi.encodePacked)
// Contract stores: keccak256(abi.encodePacked(contractId, location, verifier))
// We send the raw packed data, contract will hash it and compare
export const generateMilestoneQRData = (
  contractId: number,
  location: string,
  verifier: string
): string => {
  // Use AbiCoder to match Solidity's abi.encodePacked exactly
  // solidityPacked should match abi.encodePacked for these types
  return ethers.solidityPacked(
    ["uint256", "string", "address"],
    [BigInt(contractId), location, verifier]
  );
};

// Contract status enum
export enum ContractStatus {
  CREATED = 0,
  ACTIVE = 1,
  COMPLETED = 2
}

export const getStatusText = (status: number) => {
  switch (status) {
    case ContractStatus.CREATED: return "Created";
    case ContractStatus.ACTIVE: return "Active";
    case ContractStatus.COMPLETED: return "Completed";
    default: return "Unknown";
  }
};
