"use client"

import * as React from "react"
import { MessageCircle, Send, User, Bot, Sparkles, X } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
}

export function ChatButton() {
    const [open, setOpen] = React.useState(false);
    const [messages, setMessages] = React.useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hello! I'm your InfraLytics AI assistant. How can I help you with your mathematical models today?",
            timestamp: new Date(),
        }
    ])
    const [input, setInput] = React.useState("")
    const [isTyping, setIsTyping] = React.useState(false)
    const scrollRef = React.useRef<HTMLDivElement>(null)

    const handleSend = () => {
        if (!input.trim()) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsTyping(true)

        // Simulate AI response
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: `I've analyzed your request: "${input}". Based on the current Newton-Raphson convergence metrics, I recommend adjusting the step size to 0.05 for better stability.`,
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, aiResponse])
            setIsTyping(false)
        }, 1500)
    }

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    return (
        <div className="fixed bottom-8 right-8 z-[100]">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <button className={cn(
                        "w-16 h-16 bg-[#004E64] text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-[#003E4F] hover:scale-110 transition-all duration-300 group",
                        open ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
                    )}>
                        <MessageCircle className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-teal-400 rounded-full border-2 border-white flex items-center justify-center">
                            <Sparkles size={10} className="text-[#004E64] animate-pulse" />
                        </div>
                    </button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-[#E0E5E9] border-none shadow-2xl rounded-l-[3rem] overflow-hidden">
                    <SheetHeader className="p-8 bg-[#004E64] text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                <Bot className="w-7 h-7 text-teal-400" />
                            </div>
                            <div>
                                <SheetTitle className="text-white text-xl font-black uppercase tracking-tight">AI Assistant</SheetTitle>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-blue-100/50 uppercase tracking-widest">Neural Link Active</span>
                                </div>
                            </div>
                        </div>
                    </SheetHeader>

                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
                    >
                        {messages.map((message) => (
                            <div key={message.id} className={cn(
                                "flex gap-3 max-w-[85%]",
                                message.role === "user" ? "ml-auto flex-row-reverse" : ""
                            )}>
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                    message.role === "assistant" ? "bg-[#004E64] text-white" : "bg-white text-[#004E64] shadow-sm"
                                )}>
                                    {message.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
                                </div>
                                <div className={cn(
                                    "p-4 rounded-2xl text-sm font-medium leading-relaxed",
                                    message.role === "assistant"
                                        ? "bg-white text-[#004E64] shadow-sm rounded-tl-none border border-black/5"
                                        : "bg-[#004E64] text-white rounded-tr-none shadow-lg"
                                )}>
                                    {message.content}
                                    <div className={cn(
                                        "text-[8px] mt-2 font-bold uppercase tracking-widest opacity-30",
                                        message.role === "user" ? "text-right" : ""
                                    )}>
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex gap-3 max-w-[85%]">
                                <div className="w-8 h-8 rounded-lg bg-[#004E64] text-white flex items-center justify-center shrink-0">
                                    <Bot size={16} />
                                </div>
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-black/5 shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-[#004E64]/20 rounded-full animate-bounce" />
                                        <div className="w-1.5 h-1.5 bg-[#004E64]/20 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-1.5 h-1.5 bg-[#004E64]/20 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-white flex flex-col gap-4 border-t border-black/5">
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Ask intelligence core..."
                                className="flex-1 bg-[#E0E5E9]/50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-[#004E64] focus:ring-2 focus:ring-[#004E64]/10 outline-none transition-all"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="w-12 h-12 bg-[#004E64] text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-[#003E4F] transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        <p className="text-[9px] text-center font-bold text-[#004E64]/30 uppercase tracking-[0.2em]">
                            Powered by Infralytics Quantum Engine
                        </p>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
