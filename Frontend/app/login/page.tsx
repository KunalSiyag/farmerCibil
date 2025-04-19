"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useWeb3 } from "@/context/web3-context"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const { connectWallet, account, isConnected, isOwner, checkOwner, certificationManager } = useWeb3()
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [newScore, setNewScore] = useState<string>("")
  const [farmerAddress, setFarmerAddress] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Address validation
  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  // Score validation (0-100)
  const isValidScore = (score: string) => {
    const num = Number(score)
    return score !== "" && !isNaN(num) && num >= 0 && num <= 100
  }

  // Check owner status
  useEffect(() => {
    if (isConnected) {
      checkOwner()
    }
  }, [isConnected, checkOwner])

  // Redirect to dashboard after connection
  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard")
    }
  }, [isConnected, router])

  const handleConnect = async () => {
    try {
      setLoading(true)
      setError(null)
      await connectWallet()
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet")
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to connect wallet",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGetScore = async () => {
    if (!certificationManager || !account) return

    try {
      setLoading(true)
      setError(null)
      const farmerScore = await certificationManager.getScore(account)

      if (farmerScore === 0) {
        throw new Error("No score found for this address")
      }
      console.log("Farmer Score:", farmerScore.toString())
      setScore(Number(farmerScore))
      toast({
        title: "Score Retrieved",
        description: `Your current sustainability score is ${farmerScore}`,
      })
    } catch (err: any) {
      setError(err.message || "Failed to get score")
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to retrieve your score",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateScore = async () => {
    if (!certificationManager || !isOwner || !farmerAddress || !newScore) return

    if (!isValidAddress(farmerAddress)) {
      setError("Invalid farmer address")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid Ethereum address",
      })
      return
    }

    if (!isValidScore(newScore)) {
      setError("Invalid score")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Score must be a number between 0 and 100",
      })
      return
    }

    try {
      setLoading(true)
      setError(null)
      const scaledScore = Number(newScore) * 10 // Scale to 0-1000
      const tx = await certificationManager.updateScore(farmerAddress, scaledScore)
      await tx.wait()
      toast({
        title: "Score Updated",
        description: `Successfully updated score for ${farmerAddress} to ${newScore}`,
      })
      setFarmerAddress("")
      setNewScore("")
    } catch (err: any) {
      console.error("Update score error:", err)
      let errorMessage = "Failed to update score"
      if (err.message.includes("Only owner")) {
        errorMessage = "Only the contract owner can update scores"
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
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Smart Agri Login</CardTitle>
          <CardDescription>Connect your wallet to access the platform</CardDescription>
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
            <Button onClick={handleConnect} className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect with MetaMask"
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900 rounded-md">
                <p className="text-sm font-medium">Connected Address:</p>
                <p className="text-xs font-mono break-all">{account}</p>
                {isOwner && (
                  <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                    You are the contract owner
                  </p>
                )}
              </div>

              {isOwner ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="farmerAddress">Farmer Address</Label>
                    <Input
                      id="farmerAddress"
                      placeholder="0x..."
                      value={farmerAddress}
                      onChange={(e) => setFarmerAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="score">New Score (0-100)</Label>
                    <Input
                      id="score"
                      type="number"
                      placeholder="0-100"
                      min="0"
                      max="100"
                      value={newScore}
                      onChange={(e) => setNewScore(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleUpdateScore}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={loading || !isValidAddress(farmerAddress) || !isValidScore(newScore)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Score"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    onClick={handleGetScore}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      "Get My Score"
                    )}
                  </Button>

                  {score !== null && (
                    <div className="p-4 bg-green-50 dark:bg-green-900 rounded-md text-center">
                      <p className="text-sm font-medium">Your Sustainability Score:</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{score}/100</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Polygon Amoy Testnet</p>
        </CardFooter>
      </Card>
    </div>
  )
}