"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/context/web3-context"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function Dashboard() {
  const { account, isOwner, isLoading, disconnectWallet } = useWeb3()
  const router = useRouter()

  useEffect(() => {
    if (!account && !isLoading) {
      router.push("/")
    }
  }, [account, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Smart Agri</CardTitle>
            <CardDescription>Your sustainable farming platform</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-2">
              <strong>Connected Address:</strong>
            </p>
            <p className="text-sm font-mono bg-muted p-2 rounded-md overflow-hidden text-ellipsis">{account}</p>
            <div className="mt-4">
              <p>
                <strong>Account Type:</strong> {isOwner ? "Admin" : "Farmer"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your farming activities</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => router.push("/score")} className="w-full bg-green-600 hover:bg-green-700">
              {isOwner ? "Update Score" : "View Score"}
            </Button>
            <Button onClick={() => router.push("/rewards")} variant="outline" className="w-full">
              Manage Rewards
            </Button>
            <Button onClick={() => router.push("/nft")} variant="outline" className="w-full">
              Smart NFT Rewards
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

