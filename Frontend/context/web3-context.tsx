"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ethers } from "ethers"
import CertificationManagerABI from "@/abis/CertificationManager.json"
import SmartRewardsNFTABI from "@/abis/SmartRewardsNFT.json"
import RewardTokenABI from "@/abis/RewardToken.json"

// Contract addresses - these would come from environment variables in production
const CONTRACT_ADDRESSES = {
  certificationManager: process.env.NEXT_PUBLIC_CERTIFICATION_MANAGER_ADDRESS || "",
  smartRewardsNFT: process.env.NEXT_PUBLIC_SMART_REWARDS_NFT_ADDRESS || "",
  rewardToken: process.env.NEXT_PUBLIC_REWARD_TOKEN_ADDRESS || "",
}

interface Web3ContextType {
  account: string | null
  isOwner: boolean
  isConnected: boolean
  isConnecting: boolean
  isLoading: boolean
  error: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  checkOwner: () => void
  certificationManager: ethers.Contract | null
  smartRewardsNFT: ethers.Contract | null
  rewardToken: ethers.Contract | null
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [certificationManager, setCertificationManager] = useState<ethers.Contract | null>(null)
  const [smartRewardsNFT, setSmartRewardsNFT] = useState<ethers.Contract | null>(null)
  const [rewardToken, setRewardToken] = useState<ethers.Contract | null>(null)

  // Initialize provider from window.ethereum
  useEffect(() => {
    const init = async () => {
      try {
        if (typeof window !== "undefined" && window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum)
          setProvider(provider)
        }
      } catch (error) {
        console.error("Error initializing provider:", error)
        setError("Failed to initialize provider")
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  // Handle account changes
  useEffect(() => {
    if (!provider) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        disconnectWallet()
      } else if (accounts[0] !== account) {
        setAccount(accounts[0])
        initializeContracts(accounts[0])
      }
    }

    const handleChainChanged = () => {
      window.location.reload()
    }

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [provider, account])

  // Initialize contracts when account changes
  const initializeContracts = async (address: string) => {
    if (!provider) return

    try {
      setIsLoading(true)
      const signer = await provider.getSigner()
      setSigner(signer)

      // Initialize contracts
      const certManager = new ethers.Contract(CONTRACT_ADDRESSES.certificationManager, CertificationManagerABI, signer)
      setCertificationManager(certManager)

      const nftContract = new ethers.Contract(CONTRACT_ADDRESSES.smartRewardsNFT, SmartRewardsNFTABI, signer)
      setSmartRewardsNFT(nftContract)

      const tokenContract = new ethers.Contract(CONTRACT_ADDRESSES.rewardToken, RewardTokenABI, signer)
      setRewardToken(tokenContract)

      // Check if the connected account is the owner
      const owner = await certManager.owner()
      setIsOwner(owner.toLowerCase() === address.toLowerCase())

      // Update isConnected state
      setIsConnected(true)
    } catch (error) {
      console.error("Error initializing contracts:", error)
      setError("Failed to initialize contracts")
    } finally {
      setIsLoading(false)
    }
  }

  const connectWallet = async () => {
    if (!provider) {
      setError("No Ethereum provider found. Please install MetaMask.")
      return
    }

    try {
      setIsConnecting(true)
      setError(null)

      // Request account access
      const accounts = await provider.send("eth_requestAccounts", [])

      if (accounts.length === 0) {
        throw new Error("No accounts found")
      }

      setAccount(accounts[0])
      await initializeContracts(accounts[0])
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      setError(error.message || "Failed to connect wallet")
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
    setSigner(null)
    setCertificationManager(null)
    setSmartRewardsNFT(null)
    setRewardToken(null)
    setIsOwner(false)
    setIsConnected(false)
  }

  // Check if the user is the contract owner
  const checkOwner = () => {
    return isOwner
  }

  return (
    <Web3Context.Provider
      value={{
        account,
        isOwner,
        isConnected,
        isConnecting,
        isLoading,
        error,
        connectWallet,
        disconnectWallet,
        checkOwner,
        certificationManager,
        smartRewardsNFT,
        rewardToken,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  const context = useContext(Web3Context)
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider")
  }
  return context
}
