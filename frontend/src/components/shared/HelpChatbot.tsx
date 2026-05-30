import { useMemo, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'

interface Message {
  from: 'bot' | 'user'
  text: string
}

const FAQ: Array<{ keys: string[]; answer: string; path?: string }> = [
  {
    keys: ['create', 'book', 'shipment', 'new cargo'],
    answer: 'Customers create a shipment under New Shipment, get quotes, then book a provider or start an auction.',
    path: '/shipments/create',
  },
  {
    keys: ['track', 'tracking', 'where', 'map'],
    answer: 'Use Track Cargo with your tracking code, or open a shipment detail page for the live map.',
    path: '/track',
  },
  {
    keys: ['marketplace', 'provider', 'transport'],
    answer: 'Marketplace lists approved transport companies (providers). Each provider has vehicles and drivers who deliver your cargo.',
    path: '/marketplace',
  },
  {
    keys: ['driver', 'accept', 'delivery'],
    answer: 'Drivers log in, open Deliveries, and accept the first available job from their provider. Only one active delivery at a time.',
    path: '/shipments',
  },
  {
    keys: ['pay', 'payment', 'mpesa', 'mobile money'],
    answer: 'After booking, customers pay from Payments or the Pay Now button on shipment details.',
    path: '/payments',
  },
  {
    keys: ['auction', 'bid'],
    answer: 'Customers post shipments to auction; providers bid; customer picks the lowest bid as winner.',
    path: '/auctions',
  },
  {
    keys: ['shared', 'cargo', 'space'],
    answer: 'Shared Cargo lets customers buy spare tonnage on a provider route. Providers publish listings from Shared Cargo.',
    path: '/shared-cargo',
  },
  {
    keys: ['fleet', 'vehicle', 'add driver'],
    answer: 'Providers manage vehicles and add drivers under My Fleet. Drivers must register on CargoLink first.',
    path: '/fleet',
  },
  {
    keys: ['admin', 'manage', 'users'],
    answer: 'Admins manage users, providers, and shipments under the Admin Dashboard links.',
    path: '/admin/users',
  },
  {
    keys: ['profile', 'language', 'swahili', 'french'],
    answer: 'Open Profile from the top bar to change language (English, Kiswahili, Français) and view account details.',
    path: '/profile',
  },
  {
    keys: ['help', 'support', 'contact', 'ussd'],
    answer: 'For live support call +255 800 CARGO or dial the USSD code shown in your SMS notifications.',
  },
]

function findAnswer(input: string, role: string | undefined) {
  const q = input.toLowerCase()
  for (const item of FAQ) {
    if (item.keys.some((k) => q.includes(k))) {
      let answer = item.answer
      if (role === 'provider' && q.includes('driver')) {
        answer += ' You assign drivers from My Fleet after they register.'
      }
      return { answer, path: item.path }
    }
  }
  if (q.includes('hello') || q.includes('hi') || q.includes('habari')) {
    return {
      answer: `Hello! I'm CargoLink Assistant. Ask about shipments, tracking, payments, auctions, drivers, or say "marketplace" / "track". Your role: ${role ?? 'guest'}.`,
    }
  }
  return {
    answer:
      'Try asking: "How do I track?", "What is a provider?", "How do drivers accept jobs?", or "How do I pay?"',
  }
}

export function HelpChatbot() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      from: 'bot',
      text: 'Hi! I can help you navigate CargoLink — tracking, bookings, drivers, payments, and more. What do you need?',
    },
  ])

  const quickActions = useMemo(() => {
    if (user?.role === 'provider') {
      return ['Fleet & drivers', 'Track shipment', 'Available jobs']
    }
    if (user?.role === 'driver') {
      return ['Accept delivery', 'Track cargo', 'Start trip help']
    }
    if (user?.role === 'admin') {
      return ['Admin users', 'Assign shipment', 'Track cargo']
    }
    return ['Create shipment', 'Track cargo', 'Pay booking']
  }, [user?.role])

  const send = (text: string) => {
    if (!text.trim()) return
    setMessages((m) => [...m, { from: 'user', text: text.trim() }])
    const { answer, path } = findAnswer(text, user?.role)
    setMessages((m) => [...m, { from: 'bot', text: answer }])
    setInput('')
    if (path) {
      setTimeout(() => navigate(path), 600)
    }
  }

  return (
    <div className="notranslate">
      <Button
        type="button"
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open help chat"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[420px] w-[min(100vw-2rem,360px)] flex-col overflow-hidden rounded-xl border border-forest/10 bg-white shadow-xl">
          <div className="border-b border-forest/10 bg-forest px-4 py-3 text-sm font-semibold text-white">
            CargoLink Assistant
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[90%] rounded-lg px-3 py-2 text-sm',
                  msg.from === 'bot' ? 'bg-canvas text-charcoal' : 'ml-auto bg-amber/15 text-charcoal'
                )}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 border-t border-forest/10 p-2">
            {quickActions.map((label) => (
              <button
                key={label}
                type="button"
                className="rounded-full bg-forest/5 px-2 py-1 text-[10px] font-medium text-charcoal/70 hover:bg-forest/10"
                onClick={() => send(label)}
              >
                {label}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-forest/10 p-3"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="h-9"
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
