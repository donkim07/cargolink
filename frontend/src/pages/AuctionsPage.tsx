import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gavel } from 'lucide-react'
import { auctionsApi } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { AuctionTimer } from '@/components/shared/AuctionTimer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatTZS } from '@/utils/cn'

export default function AuctionsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [bidAmount, setBidAmount] = useState('')
  const [selectedAuction, setSelectedAuction] = useState<string | null>(null)
  const isProvider = user?.role === 'provider'

  const { data: auctions = [] } = useQuery({
    queryKey: ['auctions'],
    queryFn: () => auctionsApi.list().then((r) => r.data),
  })

  const placeBid = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => auctionsApi.bid(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] })
      setSelectedAuction(null)
      setBidAmount('')
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Auctions</h1>
        <p className="text-charcoal/60">Bid on open freight listings</p>
      </div>

      <Tabs defaultValue={isProvider ? 'browse' : 'mine'}>
        <TabsList>
          {isProvider && <TabsTrigger value="browse">Browse Auctions</TabsTrigger>}
          <TabsTrigger value="mine">My Auctions</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="grid gap-4 sm:grid-cols-2">
          {auctions.map((auction) => (
            <Card key={auction.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-amber" />
                    <Badge variant="secondary">{auction.status}</Badge>
                  </div>
                  <AuctionTimer endsAt={auction.ends_at} />
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-charcoal/50">Lowest bid</span>
                    <span className="font-bold text-amber">
                      {auction.lowest_bid ? formatTZS(auction.lowest_bid) : 'No bids yet'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal/50">Bids</span>
                    <span>{auction.bid_count ?? 0}</span>
                  </div>
                </div>
                {isProvider && (
                  <Dialog open={selectedAuction === auction.id} onOpenChange={(o) => !o && setSelectedAuction(null)}>
                    <DialogTrigger asChild>
                      <Button className="mt-4 w-full" variant="outline" onClick={() => setSelectedAuction(auction.id)}>
                        Place Bid
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Place Your Bid</DialogTitle></DialogHeader>
                      <Input
                        type="number"
                        placeholder="Amount in TZS"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                      />
                      <Button
                        onClick={() => placeBid.mutate({ id: auction.id, amount: parseFloat(bidAmount) })}
                        disabled={!bidAmount || placeBid.isPending}
                      >
                        Submit Bid
                      </Button>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="mine">
          <p className="text-charcoal/50 text-sm">Your auction listings appear here after creating a shipment auction.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
