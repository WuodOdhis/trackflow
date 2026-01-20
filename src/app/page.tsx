import WalletConnectButton from "@/components/WalletConnectButton";
import CreateContractForm from "@/components/CreateContractForm";
import ContractDashboard from "@/components/ContractDashboard";
import MilestoneVerification from "@/components/MilestoneVerification";
import MetaMaskDiagnostics from "@/components/MetaMaskDiagnostics";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">TrackFlow</h1>
          <p className="text-xl text-gray-600">Decentralized Logistics Coordination</p>
          <p className="text-sm text-gray-500 mt-1">
            Create contracts, track shipments, verify milestones with QR codes
          </p>
        </div>

        <div className="mb-8">
          <WalletConnectButton />
        </div>

        <div className="mb-8">
          <MetaMaskDiagnostics />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <CreateContractForm />
          </div>

          <div>
            <ContractDashboard />
          </div>
        </div>

        <div className="mt-12">
          <MilestoneVerification />
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Built with Next.js, Hardhat, and OpenZeppelin • Deployed on Hardhat Localhost</p>
        </div>
      </div>
    </main>
  );
}
