"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractDetails, acceptContract, getStatusText, ContractStatus } from "../lib/contracts";
import QRCode from "qrcode";

interface ContractDetails {
  shipper: string;
  carrier: string;
  recipient: string;
  payment: bigint;
  status: number;
  totalMilestones: bigint;
  completedMilestones: bigint;
}

interface Contract {
  id: number;
  details: ContractDetails;
}

export default function ContractDashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const contractList: Contract[] = [];

      // Load recent contracts (last 10)
      for (let i = 0; i < 10; i++) {
        try {
          const details = await getContractDetails(i);
          if (details.shipper !== "0x0000000000000000000000000000000000000000") {
            contractList.push({ id: i, details });
          }
        } catch (err) {
          // Contract doesn't exist, continue
        }
      }

      setContracts(contractList);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (contractId: number) => {
    try {
      setAccepting(contractId);
      await acceptContract(contractId);
      await loadContracts(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAccepting(null);
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case ContractStatus.CREATED: return "bg-blue-100 text-blue-800";
      case ContractStatus.ACTIVE: return "bg-yellow-100 text-yellow-800";
      case ContractStatus.COMPLETED: return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading contracts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Contract Dashboard</h2>
        <button
          onClick={loadContracts}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No contracts found. Create your first contract above.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {contracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onAccept={handleAccept}
              accepting={accepting}
              statusColor={getStatusColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContractCard({
  contract,
  onAccept,
  accepting,
  statusColor
}: {
  contract: Contract;
  onAccept: (id: number) => void;
  accepting: number | null;
  statusColor: (status: number) => string;
}) {
  const [qrCode, setQrCode] = useState<string>("");
  const [showQR, setShowQR] = useState(false);

  const generateQR = async () => {
    if (showQR) {
      setShowQR(false);
      return;
    }

    try {
      const qrData = `Contract ID: ${contract.id}\nCarrier: ${contract.details.carrier}`;
      const qr = await QRCode.toDataURL(qrData);
      setQrCode(qr);
      setShowQR(true);
    } catch (err) {
      console.error("Failed to generate QR code", err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Contract #{contract.id}
          </h3>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${statusColor(contract.details.status)}`}>
            {getStatusText(contract.details.status)}
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Payment</p>
          <p className="text-lg font-semibold text-green-600">
            {ethers.formatEther(contract.details.payment)} ETH
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Shipper</p>
          <p className="font-mono text-xs break-all">{contract.details.shipper}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Carrier</p>
          <p className="font-mono text-xs break-all">{contract.details.carrier}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Recipient</p>
          <p className="font-mono text-xs break-all">{contract.details.recipient}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-600">Progress</p>
          <p className="text-sm font-medium">
            {contract.details.completedMilestones.toString()} / {contract.details.totalMilestones.toString()} milestones
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className="bg-indigo-600 h-2 rounded-full"
              style={{
                width: `${contract.details.totalMilestones > 0
                  ? (Number(contract.details.completedMilestones) / Number(contract.details.totalMilestones)) * 100
                  : 0}%`
              }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {contract.details.status === ContractStatus.CREATED && (
          <button
            onClick={() => onAccept(contract.id)}
            disabled={accepting === contract.id}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {accepting === contract.id ? "Accepting..." : "Accept Contract"}
          </button>
        )}

        <button
          onClick={generateQR}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showQR ? "Hide QR" : "Show QR"}
        </button>
      </div>

      {showQR && qrCode && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Contract QR Code:</p>
          <img src={qrCode} alt="Contract QR Code" className="mx-auto" />
        </div>
      )}
    </div>
  );
}
