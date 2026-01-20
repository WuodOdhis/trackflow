"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const REQUIRED_NETWORK_ID = "0x7A69"; // localhost network ID (31337 in decimal)
const REQUIRED_CHAIN_DEC = 31337;
const REQUIRED_NETWORK_NAME = "Localhost";

// Prefer MetaMask when multiple providers are injected
const getInjectedProvider = () => {
  if (typeof window === 'undefined') return null as any;
  const eth: any = (window as any).ethereum;
  if (!eth) return null as any;
  return Array.isArray(eth.providers)
    ? (eth.providers.find((p: any) => p && p.isMetaMask) || eth.providers[0])
    : eth;
};

export default function MetaMaskDiagnostics() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [account, setAccount] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
    
    // Only attach listeners if supported to avoid addListener errors
    if (window.ethereum && typeof window.ethereum.on === 'function') {
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        if (window.ethereum && typeof window.ethereum.removeListener === 'function') {
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }

    return undefined;
  }, []);

  const handleChainChanged = (chainId: string) => {
    setChainId(chainId);
    checkConnection(); // Re-check connection when chain changes
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setStatus('disconnected');
      setAccount(null);
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
      checkConnection();
    }
  };

  const checkNetwork = async () => {
    try {
      const eth = getInjectedProvider();
      if (!eth || !eth.request) throw new Error('Wallet provider not available');
      const chainId = await eth.request({ method: 'eth_chainId' });
      setChainId(chainId);
      
      if (parseInt(chainId, 16) !== REQUIRED_CHAIN_DEC) {
        setNetworkError(`Please switch to ${REQUIRED_NETWORK_NAME} network`);
        return false;
      }
      
      setNetworkError(null);
      return true;
    } catch (error) {
      console.error('Error checking network:', error);
      setNetworkError('Failed to check network');
      return false;
    }
  };

  const switchNetwork = async () => {
    try {
      const eth = getInjectedProvider();
      if (!eth || !eth.request) throw new Error('Wallet provider not available');
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: REQUIRED_NETWORK_ID }],
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          const eth = getInjectedProvider();
          if (!eth || !eth.request) throw new Error('Wallet provider not available');
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: REQUIRED_NETWORK_ID,
                chainName: REQUIRED_NETWORK_NAME,
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Error adding network:', addError);
          setNetworkError('Failed to add network to MetaMask');
          return false;
        }
      } else if (error.code === -32002) {
        setNetworkError('Network switch request already pending in MetaMask. Open MetaMask to continue.');
        return false;
      }
      console.error('Error switching network:', error);
      setNetworkError('Failed to switch network. Please open MetaMask and switch to Localhost (31337) manually.');
      return false;
    }
  };

  const checkConnection = async () => {
    const eth = getInjectedProvider();
    if (!eth || !eth.request) {
      setStatus('disconnected');
      setNetworkError('MetaMask not installed');
      return;
    }

    try {
      const accounts = await eth.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const networkOk = await checkNetwork();
        setStatus(networkOk ? 'connected' : 'disconnected');
      } else {
        setStatus('disconnected');
        setAccount(null);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setStatus('disconnected');
      setNetworkError('Failed to check wallet connection');
    }
  };

  const connect = async () => {
    const eth = getInjectedProvider();
    if (!eth || !eth.request) {
      setNetworkError('MetaMask not found. Please install MetaMask.');
      return;
    }

    setStatus('connecting');
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts', params: [] });
      setAccount(accounts[0]);
      
      // Check and switch network if needed
      const networkOk = await checkNetwork();
      if (!networkOk) {
        const switched = await switchNetwork();
        if (!switched) {
          setStatus('disconnected');
          return;
        }
      }
      
      setStatus('connected');
    } catch (error) {
      console.error('Error connecting:', error);
      setStatus('disconnected');
      setNetworkError((error as any)?.message || 'Failed to connect to MetaMask');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Wallet Status</h3>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500' :
            status === 'connecting' ? 'bg-yellow-500' :
            'bg-red-500'
          }`}></div>
          <span className="text-sm font-medium">
            {status === 'connected' ? 'Connected' :
             status === 'connecting' ? 'Connecting...' :
             'Disconnected'}
          </span>
        </div>

        {account && (
          <div className="text-sm text-gray-600">
            Account: <span className="font-mono">{account}</span>
          </div>
        )}

        {chainId && (
          <div className="text-sm text-gray-600">
            Network ID: <span className="font-mono">{chainId}</span>
            {parseInt(chainId, 16) !== REQUIRED_CHAIN_DEC && (
              <span className="text-yellow-600 ml-2">(Wrong network)</span>
            )}
          </div>
        )}

        {networkError && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            ⚠️ {networkError}
            {chainId !== REQUIRED_NETWORK_ID && (
              <button
                onClick={switchNetwork}
                className="ml-2 text-blue-600 hover:text-blue-800 underline"
              >
                Switch Network
              </button>
            )}
          </div>
        )}

        {status !== 'connected' && (
          <button
            onClick={connect}
            disabled={status === 'connecting'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}

        {status === 'connected' && !networkError && (
          <div className="text-sm text-green-700">
            ✅ Ready to use TrackFlow!
          </div>
        )}
      </div>
    </div>
  );
}
