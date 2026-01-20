"use client";

import { useState } from "react";
import { createContract } from "../lib/contracts";

interface Milestone {
  location: string;
  verifier: string;
}

export default function CreateContractForm() {
  const [carrier, setCarrier] = useState("");
  const [recipient, setRecipient] = useState("");
  const [payment, setPayment] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([
    { location: "", verifier: "" }
  ]);
  const [loading, setLoading] = useState(false);
  const [contractId, setContractId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const addMilestone = () => {
    setMilestones([...milestones, { location: "", verifier: "" }]);
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate inputs
      if (!carrier || !recipient || !payment) {
        throw new Error("Please fill in all required fields");
      }

      const locations = milestones.map(m => m.location);
      const verifiers = milestones.map(m => m.verifier);

      if (locations.some(l => !l) || verifiers.some(v => !v)) {
        throw new Error("Please fill in all milestone details");
      }

      const id = await createContract(
        carrier as `0x${string}`,
        recipient as `0x${string}`,
        locations,
        verifiers as `0x${string}`[],
        payment
      );

      setContractId(id);
    } catch (err: any) {
      setError(err.message || "Failed to create contract");
    } finally {
      setLoading(false);
    }
  };

  if (contractId !== null) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-green-800 font-semibold mb-2">Contract Created Successfully!</h3>
        <p className="text-green-700">Contract ID: <span className="font-mono">{contractId}</span></p>
        <p className="text-green-600 text-sm mt-2">
          Share this ID with the carrier to accept the contract.
        </p>
        <button
          onClick={() => {
            setContractId(null);
            setCarrier("");
            setRecipient("");
            setPayment("");
            setMilestones([{ location: "", verifier: "" }]);
          }}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Create Another Contract
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Logistics Contract</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Carrier Address *
            </label>
            <input
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address *
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Amount (ETH) *
          </label>
          <input
            type="number"
            step="0.001"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            placeholder="0.1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Milestones</h3>
            <button
              type="button"
              onClick={addMilestone}
              className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
            >
              + Add Milestone
            </button>
          </div>

          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-800">Milestone {index + 1}</h4>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={milestone.location}
                      onChange={(e) => updateMilestone(index, "location", e.target.value)}
                      placeholder="e.g., Warehouse A, Port, Delivery Point"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Verifier Address *
                    </label>
                    <input
                      type="text"
                      value={milestone.verifier}
                      onChange={(e) => updateMilestone(index, "verifier", e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? "Creating Contract..." : "Create Contract"}
        </button>
      </form>
    </div>
  );
}
