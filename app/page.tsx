import WalletConnectButton from "@/components/WalletConnectButton";
export default function Page() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">TrackFlow (MVP)</h1>
        <p className="mt-2 text-gray-600">Connect your wallet to get started on Arbitrum Sepolia.</p>
        <div className="mt-6">
          <WalletConnectButton />
        </div>
      </div>
    </main>
  );
}

