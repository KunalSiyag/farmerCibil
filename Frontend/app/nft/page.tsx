"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWeb3 } from "@/context/web3-context"
import { Loader2, AlertCircle, Award } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export default function SmartRewardsPage() {
  const { account, isConnected, isOwner, smartRewardsNFT, certificationManager } = useWeb3()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tier, setTier] = useState<number | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [hasNFT, setHasNFT] = useState(false)
  const [farmerAddress, setFarmerAddress] = useState("")
  const [farmerScore, setFarmerScore] = useState<number | null>(null)
  const [farmerTier, setFarmerTier] = useState<number | null>(null)
  const [isDowngrading, setIsDowngrading] = useState(false)
  const [isFetchingFarmer, setIsFetchingFarmer] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Address validation
  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  // Fetch user data (connected account)
  useEffect(() => {
    if (isConnected && account && smartRewardsNFT && certificationManager) {
      fetchUserData()
    }
  }, [isConnected, account, smartRewardsNFT, certificationManager])

  // Fetch farmer data when address changes (admin only)
  useEffect(() => {
    if (!isOwner || !smartRewardsNFT || !certificationManager || !isValidAddress(farmerAddress)) {
      setFarmerScore(null)
      setFarmerTier(null)
      return
    }
    fetchFarmerData()
  }, [farmerAddress, isOwner, smartRewardsNFT, certificationManager])

  const fetchUserData = async () => {
    if (!smartRewardsNFT || !certificationManager || !account) return
    try {
      setLoading(true)
      setError(null)

      // Fetch score (0-1000 scale)
      const userScore = await certificationManager.getScore(account)
      const currentScore = Number(userScore)
      setScore(currentScore)
      console.log("User Score:", currentScore)

      // Check NFT balance
      const balance = await smartRewardsNFT.balanceOf(account)
      const ownsNFT = Number(balance) > 0
      setHasNFT(ownsNFT)
      console.log("User NFT Balance:", balance)

      if (ownsNFT) {
        const tokenTier = await smartRewardsNFT.farmerTier(account)
        const currentTier = Number(tokenTier)
        setTier(currentTier)
        console.log("User NFT Tier:", currentTier)
      } else {
        setTier(null)
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch user data")
      console.error("Fetch user error:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFarmerData = async () => {
    try {
      setIsFetchingFarmer(true)
      setError(null)

      // Fetch farmer score
      const score = await certificationManager.getScore(farmerAddress)
      const currentScore = Number(score)
      setFarmerScore(currentScore)
      console.log("Farmer Score:", currentScore)

      // Fetch farmer tier
      const balance = await smartRewardsNFT.balanceOf(farmerAddress)
      if (Number(balance) > 0) {
        const tokenTier = await smartRewardsNFT.farmerTier(farmerAddress)
        const currentTier = Number(tokenTier)
        setFarmerTier(currentTier)
        console.log("Farmer Tier:", currentTier)
      } else {
        setFarmerTier(0)
        console.log("Farmer has no NFT")
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch farmer data")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch farmer score or tier",
      })
      console.error("Fetch farmer error:", err)
    } finally {
      setIsFetchingFarmer(false)
    }
  }

  const handleMintOrUpgradeNFT = async () => {
    if (!smartRewardsNFT || !account) return
    try {
      setLoading(true)
      setError(null)

      // Determine expected tier for tokenURI
      const expectedTier = score !== null ? determineTier(score) : 1
      const tokenURI = "https://tan-personal-dragonfly-581.mypinata.cloud/ipfs/bafybeiaunn2auvcvlknkjwhxzwrq5kfdfbse3hzxdfbgzhxjxjqkqnajwi"
      const tx = await smartRewardsNFT.mintOrUpgradeNFT(account, tokenURI)
      await tx.wait()
      toast({
        title: hasNFT ? "NFT Upgraded" : "NFT Minted",
        description: hasNFT
          ? "Successfully upgraded your Smart Rewards NFT"
          : "Successfully minted your Smart Rewards NFT",
      })
      await fetchUserData()
    } catch (err: any) {
      setError(err.message || "Failed to process NFT")
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message.includes("Insufficient FSS Score")
          ? "Your score is too low to mint or upgrade (minimum 700 required)"
          : err.message.includes("Farmer already has")
          ? "Your current NFT tier is equal or higher than your score allows"
          : "Failed to mint or upgrade NFT",
      })
      console.error("Mint/Upgrade error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDowngradeNFT = async () => {
    if (!smartRewardsNFT || !isOwner) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Only the contract owner can downgrade NFTs",
      })
      return
    }
    if (!isValidAddress(farmerAddress)) {
      setError("Invalid farmer address")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid Ethereum address",
      })
      return
    }
    if (farmerTier === null || farmerScore === null) {
      setError("Farmer data not loaded")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please wait for farmer data to load",
      })
      return
    }
    if (farmerTier === 0) {
      setError("Farmer has no NFT")
      toast({
        variant: "destructive",
        title: "Error",
        description: "This farmer does not own an NFT to downgrade",
      })
      return
    }
    try {
      setIsDowngrading(true)
      setError(null)
      const tx = await smartRewardsNFT.downgradeNFT(farmerAddress)
      await tx.wait()
      const newTier = determineTier(farmerScore)
      toast({
        title: "NFT Downgraded",
        description: `Successfully downgraded NFT for ${farmerAddress} to ${getTierName(newTier) || "no tier"}`,
      })
      // Refresh farmer data
      await fetchFarmerData()
      // Refresh user data if downgrading own account
      if (farmerAddress.toLowerCase() === account.toLowerCase()) {
        await fetchUserData()
      }
    } catch (err: any) {
      console.error("Downgrade error:", err)
      let errorMessage = "Failed to downgrade NFT"
      if (err.message.includes("Only owner")) {
        errorMessage = "Only the contract owner can downgrade NFTs"
      } else if (err.message.includes("Farmer is already at the correct tier")) {
        errorMessage = "The farmer's NFT is already at the correct tier"
      } else if (err.code === -32603) {
        errorMessage = "Transaction failed. Check gas settings or network status."
      }
      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      })
    } finally {
      setIsDowngrading(false)
    }
  }

  const determineTier = (score: number) => {
    if (score >= 850) return 3 // Platinum
    if (score >= 750) return 2 // Gold
    if (score >= 700) return 1 // Silver
    return 0 // None
  }

  const getTokenURI = (tier: number) => {
    switch (tier) {
      case 1: return "https://tan-personal-dragonfly-581.mypinata.cloud/ipfs/bafybeiaunn2auvcvlknkjwhxzwrq5kfdfbse3hzxdfbgzhxjxjqkqnajwi"
      case 2: return "https://tan-personal-dragonfly-581.mypinata.cloud/ipfs/bafybeibysmy5mjufoi72fnmbt6gclxautk2fctkpqvrgl3h6krth3c53la"
      case 3: return "https://tan-personal-dragonfly-581.mypinata.cloud/ipfs/bafybeicknlztylw6edt7cceaancyojvmak7ouc6mepigzkonro2hjhjjny"
      default: return "https://tan-personal-dragonfly-581.mypinata.cloud/ipfs/bafybeiaunn2auvcvlknkjwhxzwrq5kfdfbse3hzxdfbgzhxjxjqkqnajwi"
    }
  }

  const getTierName = (tier: number) => {
    switch (tier) {
      case 1: return "Silver"
      case 2: return "Gold"
      case 3: return "Platinum"
      default: return "None"
    }
  }

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return "bg-gray-400"
      case 2: return "bg-yellow-500"
      case 3: return "bg-blue-400"
      default: return "bg-gray-300"
    }
  }

  const getNextTierRequirement = (currentTier: number) => {
    switch (currentTier) {
      case 0: return 700 // For minting
      case 1: return 750 // Silver to Gold
      case 2: return 850 // Gold to Platinum
      case 3: return null // Platinum is max
      default: return 700
    }
  }

  const isScoreBelowTier = (score: number, tier: number) => {
    if (tier === 1 && score < 700) return true
    if (tier === 2 && score < 750) return true
    if (tier === 3 && score < 850) return true
    return false
  }

  const isUpgradeEligible = () => {
    if (!hasNFT || tier === null || score === null) return false
    if (tier >= 3) return false
    const nextTierReq = getNextTierRequirement(tier)
    return nextTierReq !== null && score >= nextTierReq
  }

  const canDowngrade = () => {
    if (!isValidAddress(farmerAddress) || farmerScore === null || farmerTier === null) return false
    if (farmerTier === 0) return false
    const newTier = determineTier(farmerScore)
    return farmerTier > newTier
  }

  const isOptimalTier = () => {
    if (farmerScore === null || farmerTier === null) return false
    const newTier = determineTier(farmerScore)
    return farmerTier <= newTier
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Smart Rewards NFT</CardTitle>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              Back
            </Button>
          </div>
          <CardDescription>
            {isOwner
              ? "Manage farmer NFTs (mint, upgrade, or downgrade)"
              : "Mint and upgrade your sustainability NFT"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isConnected ? (
            <div className="text-center p-6">
              <p className="mb-4">Please connect your wallet on the login page first</p>
              <Button onClick={() => (window.location.href = "/login")} className="bg-green-600 hover:bg-green-700">
                Go to Login
              </Button>
            </div>
          ) : loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Non-Admin: Show User Score */}
              {!isOwner && score !== null && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium">Your Sustainability Score</p>
                    <p className="text-sm font-medium">{score}/1000</p>
                  </div>
                  <Progress value={score / 10} className="h-2" />
                </div>
              )}

              {/* Admin: Farmer Address Downgrade Section */}
              {isOwner && (
                <div className="space-y-2">
                  <Label htmlFor="farmerAddress">Farmer Address (for Downgrade)</Label>
                  <Input
                    id="farmerAddress"
                    placeholder="0x..."
                    value={farmerAddress}
                    onChange={(e) => setFarmerAddress(e.target.value)}
                  />
                  {isFetchingFarmer ? (
                    <div className="text-center">
                      <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                      Fetching farmer data...
                    </div>
                  ) : farmerScore !== null && farmerTier !== null ? (
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <p>Farmer Sustainability Score</p>
                        <p>{Math.round(farmerScore / 10)}/100</p>
                      </div>
                      <Progress value={farmerScore / 10} className="h-2" />
                      <p>Current Tier: {getTierName(farmerTier)}</p>
                      {isOptimalTier() && <p>Already at optimal NFT tier</p>}
                    </div>
                  ) : farmerAddress && !isValidAddress(farmerAddress) ? (
                    <p className="text-sm text-red-600">Invalid address</p>
                  ) : null}
                </div>
              )}

              {/* All Users: NFT Status and Actions */}
              {hasNFT && tier !== null ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center p-6 bg-green-50 dark:bg-green-900 rounded-lg">
                    <div className={`p-4 rounded-full ${getTierColor(tier)} mb-4`}>
                      <Award className="h-12 w-12 text-white" />
                    </div>
                    <Badge className="mb-2">{getTierName(tier)} Tier</Badge>
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                      Your Smart Rewards NFT reflects your commitment to sustainable farming practices
                    </p>
                  </div>

                  {!isOwner && score !== null && isScoreBelowTier(score, tier) && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Score Too Low</AlertTitle>
                      <AlertDescription>
                        Your score of {score} is below the {getTierName(tier)} tier requirement.
                        Please contact the admin to downgrade your NFT.
                      </AlertDescription>
                    </Alert>
                  )}

                  {tier < 3 && (
                    <div className="space-y-4">
                      {!isOwner && (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium">Progress to Next Tier</p>
                            <p className="text-sm font-medium">
                              {score}/{getNextTierRequirement(tier)}
                            </p>
                          </div>
                          <Progress
                            value={
                              score && getNextTierRequirement(tier)
                                ? (score / getNextTierRequirement(tier)!) * 100
                                : 0
                            }
                            className="h-2"
                          />
                        </div>
                      )}

                      <Button
                        onClick={handleMintOrUpgradeNFT}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={loading || !isUpgradeEligible()}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Upgrading...
                          </>
                        ) : (
                          "Upgrade NFT"
                        )}
                      </Button>
                    </div>
                  )}

                  {isOwner && (
                    <Button
                      onClick={handleDowngradeNFT}
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={isDowngrading || !canDowngrade()}
                    >
                      {isDowngrading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Downgrading...
                        </>
                      ) : (
                        "Downgrade NFT"
                      )}
                    </Button>
                  )}
                </div>
              ) : score !== null && score >= 700 ? (
                <div className="space-y-4">
                  <div className="p-6 bg-green-50 dark:bg-green-900 rounded-lg text-center">
                    <p className="mb-2 font-medium">You're eligible to mint your Smart Rewards NFT!</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your score of {score} qualifies you to start your sustainability journey
                    </p>
                  </div>

                  <Button
                    onClick={handleMintOrUpgradeNFT}
                    className  ="w-full bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Minting...
                      </>
                    ) : (
                      "Mint NFT"
                    )}
                  </Button>

                  {isOwner && (
                    <Button
                      onClick={handleDowngradeNFT}
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={isDowngrading || !canDowngrade()}
                    >
                      {isDowngrading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Downgrading...
                        </>
                      ) : (
                        "Downgrade NFT"
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* <div className="p-6 bg-green-50 dark:bg-green-900 rounded-lg text-center">
                    <p className="mb-2 font-medium">You're not yet eligible to mint an NFT</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Reach a score of 700 to mint your first Smart Rewards NFT
                    </p>
                  </div> */}

                  {isOwner && (
                    <Button
                      onClick={handleDowngradeNFT}
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={isDowngrading || !canDowngrade()}
                    >
                      {isDowngrading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Downgrading...
                        </>
                      ) : (
                        "Downgrade NFT"
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your actions influence your NFT tier – keep farming smart and sustainably!
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}