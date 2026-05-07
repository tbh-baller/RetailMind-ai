import { useState } from "react";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";

interface Msg { role: "user" | "ai"; text: string; cards?: { title: string; sub: string }[] }

const suggestions = [
  "What should I reorder today?",
  "Which items are expiring?",
  "Best supplier for milk?",
];

function generateReply(q: string, products: any[]): Msg {
  const lower = q.toLowerCase();
  if (lower.includes("reorder")) {
    const low = products.filter(p => p.stock < p.reorderLevel).slice(0, 3);
    return {
      role: "ai",
      text: "Top reorder priorities right now:",
      cards: low.map(p => ({ title: p.name, sub: `Stock ${p.stock} / reorder at ${p.reorderLevel} · suggest ${p.reorderLevel * 2} units` })),
    };
  }
  if (lower.includes("expir")) {
    const exp = products.filter(p => p.status === "expiring").slice(0, 3);
    return {
      role: "ai",
      text: "These items need attention — sell older stock first (FIFO):",
      cards: exp.map(p => ({ title: p.name, sub: `${p.stock} units · expires soon` })),
    };
  }
  if (lower.includes("milk") || lower.includes("supplier")) {
    return {
      role: "ai",
      text: "For milk, Amul Direct is the best overall — cheapest at ₹58 with 95 score.",
      cards: [
        { title: "Amul Direct (Local)", sub: "₹58 · 1 day · score 95" },
        { title: "Local Dairy", sub: "₹60 · 1 day · score 90" },
        { title: "Blinkit B2B", sub: "₹62 · 5 hrs · score 87" },
      ],
    };
  }
  return { role: "ai", text: "I can help with reorders, expiries, and supplier picks. Try one of the suggestions above." };
}

export function ChatPanel({ onClose }: { onClose?: () => void }) {
  const products = useAppSelector(s => s.inventory.items);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi Ravi 👋 I'm RetailMind. Ask me about reorders, expiring stock, or suppliers." },
  ]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { role: "user", text };
    const aiMsg = generateReply(text, products);
    setMessages(m => [...m, userMsg, aiMsg]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-none">RetailMind AI</div>
            <div className="text-[10px] text-muted-foreground mt-1">Online · demo responses</div>
          </div>
        </div>
        {onClose && <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            )}>
              <p>{m.text}</p>
              {m.cards && (
                <div className="mt-2 space-y-1.5">
                  {m.cards.map((c, j) => (
                    <div key={j} className="bg-background/40 border border-border rounded-lg px-3 py-2">
                      <div className="text-xs font-semibold text-foreground">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map(s => (
            <button key={s} onClick={() => send(s)} className="text-[11px] px-2.5 py-1 rounded-full bg-secondary hover:bg-primary/15 hover:text-primary border border-border transition-colors">
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask RetailMind…" className="bg-secondary/60 h-9" />
          <Button type="submit" size="icon" className="h-9 w-9"><Send className="w-4 h-4" /></Button>
        </form>
      </div>
    </div>
  );
}

export function ChatbotFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground glow-accent shadow-lg flex items-center justify-center hover:scale-105 transition-transform animate-pulse-glow"
          aria-label="Open AI assistant"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] h-[560px] rounded-2xl border border-border shadow-2xl overflow-hidden animate-fade-in">
          <ChatPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
