"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/context/web3-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function Home() {
  const { account, connectWallet, isConnecting, error } = useWeb3()
  const router = useRouter()

  useEffect(() => {
    if (account) {
      router.push("/dashboard")
    }
  }, [account, router])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-green-700 dark:text-green-400">Smart Agri dApp</CardTitle>
          <CardDescription>Connect your wallet to access the platform</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <img src="/placeholder.svg?height=120&width=120" alt="Smart Agri Logo" className="h-32 w-32 mb-6" />
        </CardContent>
        <CardFooter>
          <Button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Wallet"
            )}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

