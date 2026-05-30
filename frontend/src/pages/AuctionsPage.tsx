import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gavel, MapPin } from 'lucide-react'
import { auctionsApi } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { AuctionTimer } from '@/components/shared/AuctionTimer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatTZS } from '@/utils/cn'

function AuctionCard({
  auction,
  isProvider,
  onBid,
  onSelectWinner,
  showSelectWinner,
}: {
  auction: { id: string; status: string; ends_at: string; lowest_bid?: number | null; bid_count?: number; pickup_address?: string | null; destination_address?: string | null }
  isProvider: boolean
  onBid?: (id: string) => void
  onSelectWinner?: (auctionId: string, bidId: string) => void
  showSelectWinner?: boolean
}) {
  const { data: bids = [] } = useQuery({
    queryKey: ['auction-bids', auction.id],
    queryFn: () => auctionsApi.bids(auction.id).then((r) => r.data),
    enabled: showSelectWinner,
  })

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 shrink-0 text-amber" />
            <Badge variant="secondary">{auction.status}</Badge>
          </div>
          {auction.status === 'open' && <AuctionTimer endsAt={auction.ends_at} />}
        </div>
        {(auction.pickup_address || auction.destination_address) && (
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex items-center gap-2 text-charcoal/70">
              <MapPin className="h-3.5 w-3.5 text-amber" />
              <span className="truncate">{auction.pickup_address}</span>
            </div>
            <div className="flex items-center gap-2 text-charcoal/70">
              <MapPin className="h-3.5 w-3.5 text-forest" />
              <span className="truncate">{auction.destination_address}</span>
            </div>
          </div>
        )}
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
        {isProvider && auction.status === 'open' && onBid && (
          <Button className="mt-4 w-full" variant="outline" onClick={() => onBid(auction.id)}>
            Place Bid
          </Button>
        )}
        {showSelectWinner && bids.length > 0 && onSelectWinner && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-charcoal/50">Select winning bid</p>
            {bids.map((bid) => (
              <Button
                key={bid.id}
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => onSelectWinner(auction.id, bid.id)}
              >
                <span>{formatTZS(bid.amount)}</span>
                <span className="text-xs text-charcoal/50">Select</span>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AuctionsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [bidAmount, setBidAmount] = useState('')
  const [selectedAuction, setSelectedAuction] = useState<string | null>(null)
  const isProvider = user?.role === 'provider'
  const isAdmin = user?.role === 'admin'
  const canBid = isProvider || isAdmin
  const canManageAuctions = user?.role === 'customer' || isAdmin

  const { data: browseAuctions = [] } = useQuery({
    queryKey: ['auctions', 'browse'],
    queryFn: () => auctionsApi.list().then((r) => r.data),
    enabled: canBid,
  })

  const { data: myAuctions = [] } = useQuery({
    queryKey: ['auctions', 'mine'],
    queryFn: () => auctionsApi.list({ mine: true }).then((r) => r.data),
    enabled: canManageAuctions,
  })

  const placeBid = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => auctionsApi.bid(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] })
      setSelectedAuction(null)
      setBidAmount('')
    },
  })

  const selectWinner = useMutation({
    mutationFn: ({ auctionId, bidId }: { auctionId: string; bidId: string }) =>
      auctionsApi.selectWinner(auctionId, bidId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auctions'] }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Auctions</h1>
        <p className="text-charcoal/60">Bid on open freight listings or manage your auctions</p>
      </div>

      <Tabs defaultValue={canBid ? 'browse' : 'mine'}>
        <TabsList className="flex-wrap">
          {canBid && <TabsTrigger value="browse">Browse Auctions</TabsTrigger>}
          {canManageAuctions && <TabsTrigger value="mine">My Auctions</TabsTrigger>}
        </TabsList>

        {canBid && (
          <TabsContent value="browse" className="grid gap-4 sm:grid-cols-2">
            {browseAuctions.length === 0 ? (
              <p className="text-sm text-charcoal/50">No open auctions right now.</p>
            ) : (
              browseAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  isProvider
                  onBid={setSelectedAuction}
                />
              ))
            )}
          </TabsContent>
        )}

        {canManageAuctions && (
          <TabsContent value="mine" className="grid gap-4 sm:grid-cols-2">
            {myAuctions.length === 0 ? (
              <p className="text-sm text-charcoal/50">Create an auction from a shipment quote to see it here.</p>
            ) : (
              myAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  isProvider={false}
                  showSelectWinner={auction.status === 'open'}
                  onSelectWinner={(auctionId, bidId) => selectWinner.mutate({ auctionId, bidId })}
                />
              ))
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!selectedAuction} onOpenChange={(o) => !o && setSelectedAuction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Place Your Bid</DialogTitle></DialogHeader>
          <Input
            type="number"
            placeholder="Amount in TZS"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
          />
          <Button
            onClick={() => placeBid.mutate({ id: selectedAuction!, amount: parseFloat(bidAmount) })}
            disabled={!bidAmount || placeBid.isPending}
          >
            Submit Bid
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
