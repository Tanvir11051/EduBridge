import { useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatMessage = { id: number; role: "user" | "assistant"; text: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const nextId = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "assistant",
      text: "AI Assistant coming soon. This feature will be powered by the Gemini API.",
    },
  ]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { id: nextId.current++, role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      // TODO Phase 2: this endpoint will proxy to the Gemini-powered chatbot API.
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { reply?: string };
      setMessages((m) => [
        ...m,
        { id: nextId.current++, role: "assistant", text: data.reply ?? "The AI assistant will be available soon." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: nextId.current++, role: "assistant", text: "The AI assistant will be available soon." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-96 w-[min(22rem,calc(100vw-2rem))] flex-col rounded-xl border border-border bg-card shadow-md">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">EduBridge Assistant</p>
              <p className="text-xs text-muted-foreground">Phase 2 preview</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close chat">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {m.text}
              </div>
            ))}
          </div>
          <form
            className="flex items-center gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about tutors, bookings…"
              aria-label="Message"
            />
            <Button type="submit" size="icon" disabled={sending} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        className="fixed bottom-6 right-4 z-50 h-14 w-14 rounded-full shadow-md"
        aria-label="Open AI assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </>
  );
}
