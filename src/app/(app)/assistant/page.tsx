"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useSubscription, ModelType, TIER_RANK } from "@/hooks/use-subscription";
import { Paperclip, Send, Plus, MessagesSquare, ChevronDown, Check, Sparkles, Zap, BrainCircuit, Eye, EyeOff, MessageSquare, MoreHorizontal, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatMode = "Normal" | "Understand" | "Quick Answer";

type ModelDefinition = {
  displayName: string;
  realProvider: string;
};

const MODELS: ModelDefinition[] = [
  { displayName: "Polaris 1", realProvider: "Llama 3.3 70B (Groq)" },
  { displayName: "Bastion 3.5 Flash", realProvider: "Gemini 2.5 Flash-Lite" },
  { displayName: "Bastion 3.5 Pro", realProvider: "Gemini 3.5 Flash" },
  { displayName: "Apollo V4 Flash", realProvider: "DeepSeek V4 Flash" },
  { displayName: "Apollo V4 Pro", realProvider: "DeepSeek V4 Pro" },
  { displayName: "Atlas 4.5 Flash", realProvider: "Claude Haiku" },
  { displayName: "Atlas 5 Pro", realProvider: "Claude Sonnet" },
];

type Message = {
  role: "user" | "assistant";
  content: string;
  revealAnswer?: boolean; // for Understand mode
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

export default function AssistantPage() {
  const { tier, canAfford, deductCredits, isLoaded: subLoaded } = useSubscription();
  const tierRank = TIER_RANK[tier] ?? 0;

  const availableModels = useMemo(() => {
    return MODELS.map(m => {
      let isLocked = false;
      if (m.displayName === "Bastion 3.5 Pro" && tierRank < TIER_RANK.Core) isLocked = true;
      if (m.displayName === "Apollo V4 Pro" && tierRank < TIER_RANK.Pro) isLocked = true;
      if (m.displayName === "Atlas 4.5 Flash" && tierRank < TIER_RANK.Premium) isLocked = true;
      if (m.displayName === "Atlas 5 Pro" && tierRank < TIER_RANK.Maximum) isLocked = true;
      return { ...m, isLocked };
    });
  }, [tierRank]);

  const [chatMode, setChatMode] = useState<ChatMode>("Normal");
  const [activeModel, setActiveModel] = useState<ModelDefinition>(MODELS[0]);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats, chatsLoaded] = usePersistentState<ChatSession[]>("assistant_chats", []);
  const [activeChatId, setActiveChatId, activeIdLoaded] = usePersistentState<string | null>("assistant_activeId", null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editChatTitle, setEditChatTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ensure active model is always valid for tier
  useEffect(() => {
    if (subLoaded && !availableModels.find(m => m.displayName === activeModel.displayName)) {
      setActiveModel(availableModels[0]);
    }
  }, [subLoaded, availableModels, activeModel]);

  // Sync messages from local storage on load
  useEffect(() => {
    if (chatsLoaded && activeIdLoaded && activeChatId && messages.length === 0) {
      const active = chats.find((c) => c.id === activeChatId);
      if (active) {
        setMessages(active.messages);
      }
    }
  }, [chatsLoaded, activeIdLoaded, activeChatId]); // Only runs effectively on first load since messages will then be > 0

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  const loadChat = (id: string) => {
    if (editingChatId) return; // Prevent loading if clicking the parent during edit mode (though input handles its own clicks)
    const chat = chats.find(c => c.id === id);
    if (chat) {
      setActiveChatId(id);
      setMessages(chat.messages);
    }
  };

  const handleSaveTitle = (id: string) => {
    if (editChatTitle.trim()) {
      setChats(prev => prev.map(c => c.id === id ? { ...c, title: editChatTitle.trim() } : c));
    }
    setEditingChatId(null);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !subLoaded) return;

    const userMessage: Message = { role: "user", content: inputText.trim() };
    
    // Pre-call check
    const totalWordCount = messages.reduce((acc, m) => acc + m.content.split(/\s+/).length, 0) + userMessage.content.split(/\s+/).length;
    if (!canAfford(totalWordCount, activeModel.displayName as ModelType)) {
      setMessages([...messages, userMessage, { role: "assistant", content: "⚠️ You do not have enough daily credits to send this message. Please wait until tomorrow or upgrade your plan." }]);
      setInputText("");
      return;
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setIsLoading(true);

    let currentId = activeChatId;
    if (!currentId) {
      currentId = Date.now().toString();
      setActiveChatId(currentId);
      setChats(prev => [{ id: currentId!, title: "Generating title...", messages: newMessages, updatedAt: Date.now() }, ...prev]);
      
      // Async title generation
      fetch("/api/generate-chat-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userMessage.content }),
      })
      .then(r => r.json())
      .then(d => {
        if (d.title) {
          setChats(prev => prev.map(c => c.id === currentId ? { ...c, title: d.title } : c));
        }
      })
      .catch(() => {});
    } else {
      if (messages.length === 0) {
        // Chat was created from "New Chat" button, so generate a real title for the first message
        setChats(prev => prev.map(c => c.id === currentId ? { ...c, title: "Generating title...", messages: newMessages, updatedAt: Date.now() } : c));
        fetch("/api/generate-chat-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: userMessage.content }),
        })
        .then(r => r.json())
        .then(d => {
          if (d.title) {
            setChats(prev => prev.map(c => c.id === currentId ? { ...c, title: d.title } : c));
          }
        })
        .catch(() => {});
      } else {
        setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: newMessages, updatedAt: Date.now() } : c));
      }
    }

    // Build system prompt based on mode — kept minimal
    const identity = "Your name is Perenne. If the user greets you or asks who you are, respond: \"Hi, I'm Perenne — your AI study assistant. I can help you build flashcards, generate quizzes, answer questions, or grade and give feedback on your writing. What do you need help with today?\"";
    let systemPrompt = "";
    if (chatMode === "Quick Answer") {
      systemPrompt = identity + "\nBe brief. Key facts only.";
    } else if (chatMode === "Understand") {
      systemPrompt = identity + "\nExplain step-by-step. At the very end, on its own line, write the direct answer prefixed with 'ANSWER: '.";
    } else {
      systemPrompt = identity;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          systemPrompt,
          model: activeModel.displayName,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        if (data.usage) {
          deductCredits(data.usage.inputTokens, data.usage.outputTokens, activeModel.displayName as ModelType, "chat");
        }
        
        const assistantMessage: Message = {
          role: "assistant",
          content: data.text,
          revealAnswer: chatMode === "Understand" ? false : undefined,
        };
        const finalMessages = [...newMessages, assistantMessage];
        setMessages(finalMessages);
        setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: finalMessages, updatedAt: Date.now() } : c));
      } else {
        const finalMessages = [...newMessages, { role: "assistant" as const, content: "Sorry, an error occurred: " + (data.message || "Unknown error") }];
        setMessages(finalMessages);
        setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: finalMessages, updatedAt: Date.now() } : c));
      }
    } catch (e: any) {
      const finalMessages = [...newMessages, { role: "assistant" as const, content: "Failed to reach the server. Please check your connection." }];
      setMessages(finalMessages);
      setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: finalMessages, updatedAt: Date.now() } : c));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRevealAnswer = (index: number) => {
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, revealAnswer: !m.revealAnswer } : m));
  };

  // Split understand mode messages into explanation + answer
  const renderMessageContent = (msg: Message, index: number) => {
    if (msg.role === "user") {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
    }

    // In Understand mode, split out the ANSWER: line
    if (msg.revealAnswer !== undefined) {
      const parts = msg.content.split(/\nANSWER:\s*/i);
      const explanation = parts[0];
      const answer = parts.length > 1 ? parts[1].trim() : null;

      return (
        <div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{explanation}</p>
          {answer && (
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => toggleRevealAnswer(index)}
                className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors mb-2"
              >
                {msg.revealAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {msg.revealAnswer ? "Hide Answer" : "Reveal Answer"}
              </button>
              {msg.revealAnswer && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-1">
                  <p className="text-sm font-medium text-foreground leading-relaxed">{answer}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
  };

  return (
    <div className="flex gap-3 h-[calc(100vh-4rem)]">
      {/* Assistant sidebar: Recent chats */}
      <div className="w-72 shrink-0 flex flex-col gap-3 pr-1 hidden md:flex">
          <Button onClick={handleNewChat} className="w-full gap-2 justify-start shadow-none border border-border bg-card hover:bg-muted text-sm font-normal tracking-normal" variant="outline">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
          
          <div className="flex-1 flex flex-col overflow-hidden rounded-xl bg-card border border-border shadow-sm">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="font-semibold text-[13px] text-foreground flex items-center gap-2">
                <MessagesSquare className="w-4 h-4 text-muted-foreground" />
                Recent Chats
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col">
              {chats.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <p className="text-sm font-medium text-foreground mb-1">No recent chats</p>
                  <p className="text-xs text-muted-foreground">Your history will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col p-2 space-y-1">
                  {chats.map((c) => (
                    <div key={c.id} className="relative group/chat">
                      {editingChatId === c.id ? (
                        <div className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-primary" />
                          <input
                            type="text"
                            value={editChatTitle}
                            onChange={(e) => setEditChatTitle(e.target.value)}
                            onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveTitle(c.id);
                            if (e.key === "Escape") setEditingChatId(null);
                          }}
                          onBlur={() => handleSaveTitle(c.id)}
                          autoFocus
                          className="flex-1 bg-transparent border-none focus:outline-none text-xs text-primary font-medium"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => loadChat(c.id)}
                        className={cn(
                          "flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg transition-colors group",
                          activeChatId === c.id ? "bg-primary/10 text-primary font-medium pr-8" : "text-muted-foreground hover:bg-muted hover:text-foreground pr-8"
                        )}
                      >
                        <MessageSquare className={cn("w-3.5 h-3.5 shrink-0", activeChatId === c.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        <span className="text-xs truncate leading-relaxed flex-1">{c.title}</span>
                      </button>
                    )}
                    
                    {editingChatId !== c.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(c.id);
                          setEditChatTitle(c.title);
                        }}
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-all",
                          activeChatId === c.id ? "opacity-100" : "opacity-0 group-hover/chat:opacity-100"
                        )}
                        title="Rename chat"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Top Right Controls (Model Selector) */}
        <div className="absolute top-0 right-0 z-10 flex items-center gap-3">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card shadow-sm hover:bg-muted/50 transition-colors text-xs font-semibold text-foreground group"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {activeModel.displayName}
              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isModelSelectorOpen && "rotate-180")} />
            </button>

            {isModelSelectorOpen && (
              <div className="absolute top-full right-0 mt-2 w-60 rounded-xl border border-border bg-card shadow-lg overflow-visible animate-in fade-in slide-in-from-top-2">
                <div className="p-2 border-b border-border bg-muted/30">
                  <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground px-2">Select Model</p>
                </div>
                <div className="p-1.5 flex flex-col gap-0.5">
                  {availableModels.map((model) => (
                    <div key={model.displayName} className="relative">
                      <button
                        disabled={model.isLocked}
                        onClick={() => {
                          if (!model.isLocked) {
                            setActiveModel(model);
                            setIsModelSelectorOpen(false);
                          }
                        }}
                        onMouseEnter={() => setHoveredModel(model.displayName)}
                        onMouseLeave={() => setHoveredModel(null)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                          model.isLocked && "opacity-50 cursor-not-allowed",
                          activeModel.displayName === model.displayName
                            ? "bg-primary/5 text-primary font-medium"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{model.displayName}</span>
                          {model.isLocked && <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                        </div>
                        {activeModel.displayName === model.displayName && <Check className="w-4 h-4 shrink-0" />}
                      </button>

                      {/* Tooltip */}
                      {hoveredModel === model.displayName && (
                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-medium shadow-lg pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                          Powered by {model.realProvider}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-foreground rotate-45" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center pb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-3 tracking-tight">How can I help you study?</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Ask a question, upload a photo of your homework, or paste your revision notes to get started.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pt-12 pb-4 px-2">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-5 py-3.5",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border rounded-bl-md shadow-sm"
                  )}>
                    {renderMessageContent(msg, i)}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="pt-4 mt-auto pb-4 max-w-3xl w-full mx-auto">
          
          {/* Modes Selector */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setChatMode("Normal")}
              className={cn(
                "px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5",
                chatMode === "Normal" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <MessagesSquare className="w-3.5 h-3.5" />
              Normal
            </button>
            <button
              onClick={() => setChatMode("Understand")}
              className={cn(
                "px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5",
                chatMode === "Understand" ? "bg-emerald-600 text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              Understand
            </button>
            <button
              onClick={() => setChatMode("Quick Answer")}
              className={cn(
                "px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5",
                chatMode === "Quick Answer" ? "bg-amber-500 text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              Quick Answer
            </button>
          </div>

          <div className="relative rounded-2xl border border-border bg-card shadow-sm focus-within:shadow-md focus-within:border-primary/50 transition-all duration-300">
            <textarea
              className="w-full max-h-32 min-h-[60px] resize-none bg-transparent px-5 py-4 text-sm placeholder:text-muted-foreground focus:outline-none"
              placeholder={
                chatMode === "Understand"
                  ? "Ask a question you want to deeply understand..."
                  : chatMode === "Quick Answer"
                    ? "What do you need a quick answer for?"
                    : "Ask anything or paste an image..."
              }
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:bg-muted transition-colors rounded-lg">
                <Paperclip className="w-4 h-4" />
                <span className="text-xs font-medium">Attach</span>
              </Button>
              <Button
                size="icon"
                className="w-8 h-8 rounded-lg bg-foreground text-background shadow-sm hover:opacity-90 disabled:opacity-30"
                disabled={!inputText.trim() || isLoading}
                onClick={handleSend}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-4 font-medium uppercase tracking-wider">
            AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
}
