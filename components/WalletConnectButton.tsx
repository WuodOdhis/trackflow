"use client";

import { useEffect, useState } from "react";

declare global {
	interface Window {
		ethereum?: any;
	}
}

// Arbitrum Sepolia chain id in hex (421614 decimal)
const ARBITRUM_SEPOLIA_HEX = "0x66eee";

export default function WalletConnectButton() {
	const [account, setAccount] = useState<string | null>(null);
	const [chainId, setChainId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// On page load, try to read current account + network
	useEffect(() => {
		if (!window.ethereum) return;
		window.ethereum.request({ method: "eth_chainId" }).then(setChainId).catch(() => {});
		window.ethereum.request({ method: "eth_accounts" })
			.then((accs: string[]) => setAccount(accs[0] || null))
			.catch(() => {});
	}, []);

	// Ask MetaMask to connect (you’ll get a popup)
	const connect = async () => {
		try {
			if (!window.ethereum) {
				setError("MetaMask not found. Please install it.");
				return;
			}
			const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
			setAccount(accs[0]);
			const cid = await window.ethereum.request({ method: "eth_chainId" });
			setChainId(cid);
			setError(null);
		} catch (e: any) {
			setError(e?.message ?? "Failed to connect wallet.");
		}
	};

	// Switch to Arbitrum Sepolia (or add it if missing)
	const switchToArbitrumSepolia = async () => {
		try {
			await window.ethereum.request({
				method: "wallet_switchEthereumChain",
				params: [{ chainId: ARBITRUM_SEPOLIA_HEX }],
			});
			setError(null);
		} catch (switchError: any) {
			if (switchError?.code === 4902) {
				try {
					await window.ethereum.request({
						method: "wallet_addEthereumChain",
						params: [{
							chainId: ARBITRUM_SEPOLIA_HEX,
							chainName: "Arbitrum Sepolia",
							nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
							rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
							blockExplorerUrls: ["https://sepolia.arbiscan.io"],
						}],
					});
					setError(null);
				} catch (addErr: any) {
					setError(addErr?.message ?? "Failed to add Arbitrum Sepolia.");
				}
			} else {
				setError(switchError?.message ?? "Failed to switch chain.");
			}
		}
	};

	return (
		<div className="space-y-3">
			{!account ? (
				<button
					onClick={connect}
					className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
				>
					Connect MetaMask
				</button>
			) : (
				<div className="space-y-2">
					<div className="text-sm text-gray-700">
						Connected: <span className="font-mono">{account}</span>
					</div>
					{chainId?.toLowerCase() !== ARBITRUM_SEPOLIA_HEX && (
						<button
							onClick={switchToArbitrumSepolia}
							className="rounded bg-amber-500 px-3 py-1.5 text-white hover:bg-amber-600"
						>
							Switch to Arbitrum Sepolia
						</button>
					)}
				</div>
			)}
			{error && <div className="text-sm text-red-600">{error}</div>}
		</div>
	);
}