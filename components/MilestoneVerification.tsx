"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { 
  getContractDetails, 
  getMilestoneDetails, 
  verifyMilestone, 
  generateMilestoneQRData,
  getProvider,
  acceptContract
} from "../lib/contracts";
import QRCode from "qrcode";
import QRScanner from "./QRScanner";

interface Milestone {
  location: string;
  verifier: string;
  completed: boolean;
}

export default function MilestoneVerification() {
  const [contractId, setContractId] = useState("");
  const [contractDetails, setContractDetails] = useState<any>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<number | null>(null);
  const [qrCodes, setQrCodes] = useState<{ [key: number]: string }>({});
  const [error, setError] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanningMilestone, setScanningMilestone] = useState<number | null>(null);
  const [manualQRData, setManualQRData] = useState<{ [key: number]: string }>({});

  // Try to fetch connected account on mount and when contract changes
  useEffect(() => {
    const init = async () => {
      try {
        const provider = getProvider();
        if (provider instanceof ethers.BrowserProvider) {
          const signer = await provider.getSigner();
          const addr = await signer.getAddress();
          setAccount(addr);
        }
      } catch {}
    };
    init();
  }, [contractDetails]); // Re-run when contract details change

  // Also update account when user switches in MetaMask
  useEffect(() => {
    const updateAccount = async () => {
      try {
        const provider = getProvider();
        if (provider instanceof ethers.BrowserProvider) {
          const signer = await provider.getSigner();
          const addr = await signer.getAddress();
          setAccount(addr);
        }
      } catch {}
    };

    // Poll for account changes every 2 seconds
    const interval = setInterval(updateAccount, 2000);
    return () => clearInterval(interval);
  }, []);

  const validateContractId = (id: string): boolean => {
    const parsedId = parseInt(id);
    if (isNaN(parsedId) || parsedId < 0) {
      setError("Invalid contract ID. Please enter a valid positive number.");
      return false;
    }
    return true;
  };

  const loadContract = async () => {
    if (!contractId) {
      setError("Please enter a contract ID");
      return;
    }

    if (!validateContractId(contractId)) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMilestones([]);
      setContractDetails(null);

      // First check if we're connected to the right network
      const provider = getProvider();
      if (provider instanceof ethers.BrowserProvider) {
        const network = await provider.getNetwork();
        if (network.chainId !== BigInt(31337)) { // 31337 is the chainId for localhost
          setError("Please connect to the Localhost network to view contracts");
          return;
        }
      }

      const details = await getContractDetails(parseInt(contractId));
      
      // Validate contract exists and has valid data
      if (!details || !details.carrier || details.carrier === "0x0000000000000000000000000000000000000000") {
        setError("Contract not found or invalid");
        return;
      }

      // Convert BigInt values to regular numbers/strings for React state
      const processedDetails = {
        shipper: details.shipper,
        carrier: details.carrier,
        recipient: details.recipient,
        payment: details.payment, // Keep as BigInt for ethers.formatEther
        status: Number(details.status), // Convert to regular number
        totalMilestones: Number(details.totalMilestones),
        completedMilestones: Number(details.completedMilestones)
      };

      setContractDetails(processedDetails);

      // Capture current connected account (if browser wallet)
      if (provider instanceof ethers.BrowserProvider) {
        try {
          const signer = await provider.getSigner();
          const addr = await signer.getAddress();
          setAccount(addr);
        } catch {}
      }

      const milestoneList: Milestone[] = [];
      const totalMilestones = Number(details.totalMilestones);

      if (totalMilestones === 0) {
        setError("Contract has no milestones");
        return;
      }

      for (let i = 0; i < totalMilestones; i++) {
        try {
          const milestone = await getMilestoneDetails(parseInt(contractId), i);
          if (!milestone || !milestone.location || !milestone.verifier) {
            throw new Error(`Invalid milestone data at index ${i}`);
          }
          milestoneList.push({
            location: milestone.location,
            verifier: milestone.verifier,
            completed: milestone.completed
          });
        } catch (milestoneErr: any) {
          console.error(`Error loading milestone ${i}:`, milestoneErr);
          setError(`Failed to load milestone ${i + 1}: ${milestoneErr.message || "Unknown error"}`);
          return;
        }
      }
      setMilestones(milestoneList);
    } catch (err: any) {
      console.error("Contract loading error:", err);
      if (err.code === "CALL_EXCEPTION") {
        setError("Contract not found or you don't have permission to view it");
      } else if (err.code === "NETWORK_ERROR") {
        setError("Network error. Please check your connection and try again");
      } else {
        setError(err.message || "Failed to load contract");
      }
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (milestoneIndex: number) => {
    try {
      const milestone = milestones[milestoneIndex];
      const qrData = generateMilestoneQRData(
        parseInt(contractId),
        milestone.location,
        milestone.verifier
      );

      const qrCodeUrl = await QRCode.toDataURL(qrData);
      setQrCodes(prev => ({ ...prev, [milestoneIndex]: qrCodeUrl }));
    } catch (err) {
      console.error("Failed to generate QR code", err);
    }
  };

  const startQRScan = (milestoneIndex: number) => {
    setScanningMilestone(milestoneIndex);
    setScannerOpen(true);
    setError("");
  };

  const handleQRScan = async (scannedData: string) => {
    if (scanningMilestone === null) return;

    try {
      setVerifying(scanningMilestone);
      setError("");

      // Validate the scanned QR data format
      if (!scannedData || scannedData.length < 10) {
        throw new Error("Invalid QR code format");
      }

      // Generate expected QR data for comparison
      const milestone = milestones[scanningMilestone];
      const expectedQRData = generateMilestoneQRData(
        parseInt(contractId),
        milestone.location,
        milestone.verifier
      );

      // Verify the scanned data matches what we expect
      if (scannedData !== expectedQRData) {
        throw new Error("QR code does not match this milestone. Please scan the correct QR code for this location and verifier.");
      }

      console.log("Verifying milestone with scanned QR:", {
        contractId: parseInt(contractId),
        milestoneIndex: scanningMilestone,
        location: milestone.location,
        verifier: milestone.verifier,
        scannedDataLength: scannedData.length
      });

      // Submit verification with scanned data
      const tx = await verifyMilestone(parseInt(contractId), scanningMilestone, scannedData);
      
      // Wait for the transaction to be mined
      try {
        if (tx && typeof tx.wait === 'function') {
          const receipt = await tx.wait();
          if (receipt) {
            console.log("Milestone verification confirmed in block:", receipt.blockNumber);
          } else {
            console.log("Milestone verification confirmed, but receipt not available");
          }
        } else {
          throw new Error("Invalid transaction response");
        }
      } catch (txError: any) {
        console.error("Transaction failed:", txError);
        if (txError.code === "ACTION_REJECTED") {
          setError("Transaction was rejected by user");
        } else if (txError.code === "INSUFFICIENT_FUNDS") {
          setError("Insufficient funds to complete the transaction");
        } else {
          setError("Transaction failed: " + (txError.message || "Unknown error"));
        }
        return;
      }

      // Refresh contract data
      await loadContract();
    } catch (err: any) {
      console.error("QR verification error:", err);
      
      // Try to extract revert reason from error
      let errorMessage = err.message || "Failed to verify milestone";
      
      // Check for "Invalid status" error specifically
      if (err.reason === "Invalid status" || err.message?.includes("Invalid status")) {
        errorMessage = "Contract status is invalid. The contract must be ACTIVE before verifying milestones. Please accept the contract first (switch to carrier account and click 'Accept Contract').";
      } else if (err.reason) {
        errorMessage = err.reason;
      } else if (err.data?.message) {
        errorMessage = err.data.message;
      } else if (err.code === "CALL_EXCEPTION") {
        // Try to get more details about the revert
        if (err.error?.message || err.reason) {
          errorMessage = err.error?.message || err.reason;
          if (errorMessage.includes("Invalid status")) {
            errorMessage = "Contract status is invalid. The contract must be ACTIVE before verifying milestones. Please accept the contract first.";
          }
        } else if (err.data) {
          errorMessage = "Contract error or invalid state. Check: 1) Contract is ACTIVE (not CREATED), 2) You're the correct verifier, 3) QR data is valid";
        } else {
          errorMessage = "Contract error or invalid state. Please ensure: contract is ACTIVE (not CREATED), you're using the correct verifier account, and the milestone hasn't been verified already.";
        }
      } else if (err.code === "NETWORK_ERROR") {
        errorMessage = "Network error. Please check your connection and try again";
      } else if (err.code === "UNPREDICTABLE_GAS_LIMIT") {
        errorMessage = "Failed to estimate gas. The transaction might fail. Check contract status and your account permissions.";
      }
      
      setError(errorMessage);
    } finally {
      setVerifying(null);
      setScanningMilestone(null);
    }
  };

  const handleQRError = (error: string) => {
    setError(error);
    setScannerOpen(false);
    setScanningMilestone(null);
  };

  // Manual QR flow: paste QR string (e.g. scanned on phone) and verify
  const handleManualQRChange = (index: number, value: string) => {
    setManualQRData(prev => ({ ...prev, [index]: value }));
  };

  const verifyWithManualQR = async (index: number) => {
    const data = manualQRData[index];
    if (!data) {
      setError("Paste QR data for this milestone first.");
      return;
    }

    // Reuse the same flow as camera scan
    setScanningMilestone(index);
    await handleQRScan(data);
  };

  const closeQRScanner = () => {
    setScannerOpen(false);
    setScanningMilestone(null);
  };

  const verifyMilestoneWithQR = async (milestoneIndex: number) => {
    if (!contractId || !validateContractId(contractId)) {
      return;
    }

    if (milestoneIndex < 0 || milestoneIndex >= milestones.length) {
      setError("Invalid milestone index");
      return;
    }

    if (!contractDetails) {
      setError("Please load the contract first");
      return;
    }

    // CRITICAL: Contract must be ACTIVE to verify milestones
    if (contractDetails.status === 0) {
      setError("Contract must be ACTIVE before verifying milestones. Please accept the contract first.");
      return;
    }

    if (contractDetails.status === 2) {
      setError("Contract is already COMPLETED. All milestones are complete.");
      return;
    }

    // Enforce in-order verification to match contract rules
    if (milestoneIndex !== Number(contractDetails.completedMilestones)) {
      setError(`Milestones must be verified in order. Next required milestone: ${Number(contractDetails.completedMilestones) + 1}`);
      return;
    }

    const milestone = milestones[milestoneIndex];
    if (milestone.completed) {
      setError("This milestone is already verified");
      return;
    }

    try {
      setVerifying(milestoneIndex);
      setError("");

      // Check if we're connected to the right network
      const provider = getProvider();
      if (provider instanceof ethers.BrowserProvider) {
        const network = await provider.getNetwork();
        if (network.chainId !== BigInt(31337)) {
          setError("Please connect to the Localhost network to verify milestones");
          return;
        }

        // Check if we have the right permissions (we should be the verifier)
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();
        if (signerAddress.toLowerCase() !== milestone.verifier.toLowerCase()) {
          setError(`You are not authorized to verify this milestone. Connect with verifier account: ${milestone.verifier}`);
          return;
        }
      }

      // This should not be called directly anymore - use scanAndVerifyMilestone instead
      setError("Please use 'Scan QR Code' button to verify milestones");
      return;
    } catch (err: any) {
      console.error("Milestone verification error:", err);
      
      // Try to extract revert reason from error
      let errorMessage = err.message || "Failed to verify milestone";
      
      // Check for "Invalid status" error specifically
      if (err.reason === "Invalid status" || err.message?.includes("Invalid status")) {
        errorMessage = "Contract status is invalid. The contract must be ACTIVE before verifying milestones. Please accept the contract first (switch to carrier account and click 'Accept Contract').";
      } else if (err.reason) {
        errorMessage = err.reason;
      } else if (err.data?.message) {
        errorMessage = err.data.message;
      } else if (err.code === "CALL_EXCEPTION") {
        // Try to get more details about the revert
        if (err.error?.message || err.reason) {
          errorMessage = err.error?.message || err.reason;
          if (errorMessage.includes("Invalid status")) {
            errorMessage = "Contract status is invalid. The contract must be ACTIVE before verifying milestones. Please accept the contract first.";
          }
        } else if (err.data) {
          errorMessage = "Contract error or invalid state. Check: 1) Contract is ACTIVE (not CREATED), 2) You're the correct verifier, 3) QR data is valid";
        } else {
          errorMessage = "Contract error or invalid state. Please ensure: contract is ACTIVE (not CREATED), you're using the correct verifier account, and the milestone hasn't been verified already.";
        }
      } else if (err.code === "NETWORK_ERROR") {
        errorMessage = "Network error. Please check your connection and try again";
      } else if (err.code === "UNPREDICTABLE_GAS_LIMIT") {
        errorMessage = "Failed to estimate gas. The transaction might fail. Check contract status and your account permissions.";
      }
      
      setError(errorMessage);
    } finally {
      setVerifying(null);
    }
  };

  const onAcceptContract = async () => {
    if (!contractId || !validateContractId(contractId)) return;
    try {
      setAccepting(true);
      setError("");

      const provider = getProvider();
      if (!(provider instanceof ethers.BrowserProvider)) {
        setError("A browser wallet is required to accept the contract");
        return;
      }

      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(31337)) {
        setError("Please connect to the Localhost network to accept the contract");
        return;
      }

      const signer = await provider.getSigner();
      const signerAddress = (await signer.getAddress()).toLowerCase();
      if (!contractDetails || signerAddress !== String(contractDetails.carrier).toLowerCase()) {
        setError("Only the carrier can accept this contract. Switch to the carrier account.");
        return;
      }

      await acceptContract(parseInt(contractId));
      await loadContract();
    } catch (err: any) {
      if (err?.code === "ACTION_REJECTED") {
        setError("Transaction was rejected by user");
      } else {
        setError(err?.message || "Failed to accept contract");
      }
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Milestone Verification</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contract ID
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            placeholder="Enter contract ID"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={loadContract}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Contract"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {contractDetails && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Contract Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Status</p>
              <p className="font-medium">{
                contractDetails.status === 0 ? "Created" :
                contractDetails.status === 1 ? "Active" :
                contractDetails.status === 2 ? "Completed" :
                `Unknown (${contractDetails.status})`
              }</p>
            </div>
            <div>
              <p className="text-gray-600">Payment</p>
              <p className="font-medium">{contractDetails.payment ? ethers.formatEther(contractDetails.payment) : '0'} ETH</p>
            </div>
            <div>
              <p className="text-gray-600">Progress</p>
              <p className="font-medium">{contractDetails.completedMilestones?.toString() || '0'} / {contractDetails.totalMilestones?.toString() || '0'}</p>
            </div>
            <div>
              <p className="text-gray-600">Carrier</p>
              <p className="font-mono text-xs break-all">{contractDetails.carrier || 'Not set'}</p>
            </div>
          </div>

          {contractDetails.status === 0 && (
            <div className="mt-4 p-4 rounded border-2 border-yellow-300 bg-yellow-50">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">!</span>
                  <p className="text-sm font-semibold text-yellow-900">
                    Contract Status: CREATED - Must be accepted before verification
                  </p>
                </div>
                <p className="text-sm text-yellow-800">
                  The carrier must accept this contract before any milestones can be verified.
                  {(!account || String(account).toLowerCase() !== String(contractDetails.carrier).toLowerCase()) && (
                    <span className="block mt-1 font-medium">
                      Switch to carrier account: <span className="font-mono text-xs">{contractDetails.carrier}</span>
                    </span>
                  )}
                </p>
                

                <div className="flex items-center gap-3">
                  <button
                    onClick={onAcceptContract}
                    disabled={accepting}
                    className="bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 shadow-md"
                  >
                    {accepting ? "Accepting..." : "Accept Contract"}
                  </button>
                  {account && String(account).toLowerCase() === String(contractDetails.carrier).toLowerCase() && (
                    <span className="text-xs text-green-700 font-medium">You are the carrier - you can accept</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {milestones.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Milestones</h3>

          {milestones.map((milestone, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-800">
                    Milestone {index + 1}: {milestone.location}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Verifier: <span className="font-mono">{milestone.verifier}</span>
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  milestone.completed
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {milestone.completed ? "Completed" : "Pending"}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => generateQRCode(index)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Generate QR
                </button>

                {!milestone.completed && contractDetails.status === 1 && (
                  <button
                    onClick={() => startQRScan(index)}
                    disabled={verifying === index || scannerOpen}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {verifying === index ? "Verifying..." : "Scan QR Code"}
                  </button>
                )}

                {!milestone.completed && contractDetails.status === 0 && (
                  <span className="text-xs text-gray-500 self-center px-2">
                    Accept contract first to verify
                  </span>
                )}

                {!milestone.completed && contractDetails.status === 2 && (
                  <span className="text-xs text-gray-500 self-center px-2">
                    Contract completed
                  </span>
                )}
              </div>

              {/* Manual QR input (e.g. QR scanned on phone) */}
              {!milestone.completed && contractDetails.status === 1 && (
                <div className="mt-3 space-y-1">
                  <label className="block text-xs font-medium text-gray-600">
                    Or paste QR data
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualQRData[index] || ""}
                      onChange={(e) => handleManualQRChange(index, e.target.value)}
                      placeholder="Paste QR string scanned on your phone"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => verifyWithManualQR(index)}
                      disabled={verifying === index}
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {verifying === index ? "Verifying..." : "Verify with QR Data"}
                    </button>
                  </div>
                </div>
              )}

              {qrCodes[index] && (
                <div className="mt-3 p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600 mb-2">QR Code:</p>
                  <img src={qrCodes[index]} alt={`Milestone ${index + 1} QR`} className="mx-auto max-w-32" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!contractDetails && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p>Enter a contract ID above to view milestones and verify progress.</p>
        </div>
      )}

      <QRScanner
        isOpen={scannerOpen}
        onScan={handleQRScan}
        onError={handleQRError}
        onClose={closeQRScanner}
      />
    </div>
  );
}
