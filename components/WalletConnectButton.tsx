"use client";

import { useEffect, useState } from "react";

declare global {
	interface Window {
		ethereum?: any;
	}
}

const REQUIRED_CHAIN_ID = "0x7A69"; // 31337 in decimal (Hardhat's chain ID)
const REQUIRED_CHAIN_DEC = 31337;
const LOCALHOST_NETWORK = {
	chainId: REQUIRED_CHAIN_ID,
	chainName: "Localhost",
	nativeCurrency: {
		name: "ETH",
		symbol: "ETH",
		decimals: 18
	},
	rpcUrls: ["http://127.0.0.1:8545"],
};

export default function WalletConnectButton() {
	const [account, setAccount] = useState<string | null>(null);
	const [connected, setConnected] = useState(false);
	const [connecting, setConnecting] = useState(false);
	const [networkError, setNetworkError] = useState<string | null>(null);

	// Check network and connection on page load and set up polling
	useEffect(() => {
		let mounted = true;
		let pollInterval: NodeJS.Timeout | null = null;

		const pollForChanges = async () => {
			if (!mounted || !window.ethereum) return;

			try {
				// Check for account changes
				const accounts = await window.ethereum.request({ method: 'eth_accounts' });
				if (accounts[0] !== account) {
					if (accounts.length === 0) {
						setAccount(null);
						setConnected(false);
						setNetworkError("Please connect to MetaMask");
					} else {
						setAccount(accounts[0]);
						checkNetwork();
					}
				}

				// Check for chain changes
				const chainId = await window.ethereum.request({ method: 'eth_chainId' });
				if (parseInt(chainId, 16) !== REQUIRED_CHAIN_DEC) {
					setNetworkError(`Please switch to Localhost network`);
					setConnected(false);
				}
			} catch (error) {
				console.warn('Error polling for changes:', error);
			}
		};

		// Initial check
		checkConnection();

		// Set up polling every 1 second
		pollInterval = setInterval(pollForChanges, 1000);

		return () => {
			mounted = false;
			if (pollInterval) {
				clearInterval(pollInterval);
			}
		};
	}, [account]); // Add account as dependency since we use it in the polling function

	const handleChainChanged = () => {
		// Reload the page when chain changes
		window.location.reload();
	};

	const handleAccountsChanged = (accounts: string[]) => {
		if (accounts.length === 0) {
			setAccount(null);
			setConnected(false);
			setNetworkError("Please connect to MetaMask");
		} else if (accounts[0] !== account) {
			setAccount(accounts[0]);
			checkNetwork();
		}
	};

	const checkNetwork = async () => {
		if (!window.ethereum) return false;

		try {
			const chainId = await window.ethereum.request({ method: 'eth_chainId' });
			if (parseInt(chainId, 16) !== REQUIRED_CHAIN_DEC) {
				setNetworkError(`Please switch to Localhost network`);
				return false;
			}
			setNetworkError(null);
			return true;
		} catch (error) {
			console.error("Error checking network:", error);
			setNetworkError("Failed to check network");
			return false;
		}
	};

	const switchNetwork = async () => {
		if (!window.ethereum) return false;

		try {
			await window.ethereum.request({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: REQUIRED_CHAIN_ID }],
			});
			return true;
		} catch (error: any) {
			if (error.code === 4902) {
				try {
					await window.ethereum.request({
						method: 'wallet_addEthereumChain',
						params: [LOCALHOST_NETWORK],
					});
					return true;
				} catch (addError) {
					console.error("Error adding network:", addError);
					setNetworkError("Failed to add network to MetaMask");
					return false;
				}
			}
			console.error("Error switching network:", error);
			setNetworkError("Failed to switch network");
			return false;
		}
	};

	const checkConnection = async () => {
		if (!window.ethereum) {
			setNetworkError("MetaMask not installed");
			return;
		}

		try {
			const accounts = await window.ethereum.request({ method: "eth_accounts" });
			if (accounts.length > 0) {
				setAccount(accounts[0]);
				const networkOk = await checkNetwork();
				setConnected(networkOk);
			} else {
				setConnected(false);
				setNetworkError("Please connect to MetaMask");
			}
		} catch (error) {
			console.error("Error checking connection:", error);
			setNetworkError("Failed to check wallet connection");
			setConnected(false);
		}
	};

	const connect = async () => {
		if (typeof window === 'undefined') return;

		if (!window.ethereum) {
			setNetworkError("MetaMask not installed. Please install MetaMask.");
			return;
		}

		setConnecting(true);
		try {
			// First check if we can access ethereum object properly
			if (!window.ethereum.request) {
				throw new Error("MetaMask ethereum object is not properly initialized");
			}

			// Request account access
			let accounts;
			try {
				accounts = await window.ethereum.request({ 
					method: "eth_requestAccounts",
					params: [] // Explicitly set empty params
				});
			} catch (requestError: any) {
				if (requestError.code === 4001) {
					throw new Error("Please accept the MetaMask connection request");
				}
				throw requestError;
			}

			if (!accounts || accounts.length === 0) {
				throw new Error("No accounts returned from MetaMask");
			}

			setAccount(accounts[0]);
			
			// Check and switch network if needed
			const networkOk = await checkNetwork();
			if (!networkOk) {
				const switched = await switchNetwork();
				if (!switched) {
					setConnected(false);
					throw new Error("Please switch to the correct network");
				}
			}
			
			setConnected(true);
			setNetworkError(null);
		} catch (error: any) {
			console.error("Connection failed:", error);
			setNetworkError(error.message || "Failed to connect to MetaMask. Please try again.");
			setConnected(false);
		} finally {
			setConnecting(false);
		}
	};

	const disconnect = () => {
		setAccount(null);
		setConnected(false);
		setNetworkError("Disconnected from MetaMask");
	};

	return (
		<div className="space-y-3">
			{networkError && (
				<div className="text-sm text-red-600 bg-red-50 p-2 rounded">
					⚠️ {networkError}
					{networkError.includes("network") && (
						<button
							onClick={switchNetwork}
							className="ml-2 text-blue-600 hover:text-blue-800 underline"
						>
							Switch Network
						</button>
					)}
				</div>
			)}

			{!connected ? (
				<button
					onClick={connect}
					disabled={connecting}
					className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
				>
					{connecting ? (
						<>
							<svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Connecting...
						</>
					) : (
						<>Connect MetaMask</>
					)}
				</button>
			) : (
				<div className="space-y-2">
					<div className="text-sm text-gray-700">
						Connected: <span className="font-mono text-xs">{account}</span>
					</div>
					<button
						onClick={disconnect}
						className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600 text-sm"
					>
						Disconnect
					</button>
				</div>
			)}
		</div>
	);
}