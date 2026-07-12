"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Which vehicles are in the shop?",
  "Are there any drivers with compliance issues?",
  "What trips are currently active?",
];

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSubmit = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch response");
      }

      if (!res.body) throw new Error("No body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        
        // Parse SSE
        const lines = chunkValue.split("\n").filter(line => line.trim() !== "");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.replace("data: ", "");
            if (data === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content = assistantMessage;
                  return newMsgs;
                });
              }
            } catch (e) {
              // Ignore partial parses
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white z-50 transition-all hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Panel */}
      <Card 
        className={`fixed bottom-6 right-6 w-96 h-[600px] max-h-[80vh] flex flex-col shadow-2xl z-50 border-indigo-100 dark:border-indigo-900/50 overflow-hidden ${
          !isOpen ? "hidden" : "flex"
        }`}
      >
          <CardHeader className="bg-indigo-600 dark:bg-indigo-900 text-white flex flex-row items-center justify-between py-4 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <CardTitle className="text-lg">Fleet Copilot</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 -mr-2"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 mt-12">
                  <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-full">
                    <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Ask about your fleet</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-[250px]">
                      I have real-time access to vehicle statuses, driver compliance, and active trips.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full px-4">
                    {SUGGESTIONS.map((s, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="p-3 text-xs justify-center cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                        onClick={() => handleSubmit(s)}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 max-w-[85%] ${
                        m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        m.role === "user" ? "bg-indigo-600 text-white" : "bg-white border text-indigo-600 dark:bg-slate-800 dark:border-slate-700"
                      }`}>
                        {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                        m.role === "user" 
                          ? "bg-indigo-600 text-white rounded-tr-sm" 
                          : "bg-white border dark:bg-slate-900 dark:border-slate-800 rounded-tl-sm shadow-sm leading-relaxed"
                      }`}>
                        {/* Simple bold parsing for vehicle tags */}
                        <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 max-w-[80%] mr-auto items-center text-muted-foreground p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white dark:bg-slate-950 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(input);
                }}
                className="flex gap-2 relative"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="pr-12 rounded-full border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus-visible:ring-indigo-500"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1 top-1 h-8 w-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
    </>
  );
}
