"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useSubscription, ModelType, TIER_RANK } from "@/hooks/use-subscription";
import { Paperclip, Send, Plus, MessagesSquare, ChevronDown, Check, Sparkles, Zap, BrainCircuit, Eye, EyeOff, MessageSquare, MoreHorizontal, Lock, PanelLeft, Trash2, Globe } from "lucide-react";
import { useUpgradeModal } from "@/components/upgrade-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { insertHistoryAction, deleteHistoryAction, fetchUserHistoryAction, upsertChatAction } from "@/actions/supabase";
import { useUser } from "@clerk/nextjs";

type ChatMode = "Standard" | "Strict Syllabus" | "Quick Answer";

type ModelDefinition = {
  displayName: string;
  realProvider: string;
};

const MODELS: ModelDefinition[] = [
  { displayName: "Mistral Small", realProvider: "Mistral Small (Mistral)" },
  { displayName: "Mistral Large", realProvider: "Mistral Large (Mistral)" },
  { displayName: "GPT OSS", realProvider: "GPT OSS 120B (Groq)" },
  { displayName: "Gemini 3.5 Flash-Lite", realProvider: "Gemini 3.5 Flash-Lite" },
  { displayName: "Gemini 3.6 Flash", realProvider: "Gemini 2.5 Flash-Lite" },
  { displayName: "Gemini 3.5 Pro", realProvider: "Gemini 3.6 Flash" },
  { displayName: "Deepseek-V4-Flash", realProvider: "DeepSeek V4 Flash" },
  { displayName: "Deepseek-V4-Pro", realProvider: "DeepSeek V4 Pro" },
  { displayName: "Claude 4.5 Haiku", realProvider: "Claude 3.5 Haiku" },
  { displayName: "Claude 3.5 Sonnet", realProvider: "Claude 3.5 Sonnet" },
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
  const { user, isLoaded: userLoaded } = useUser();
  const { tier, canAfford, deductCredits, isLoaded: subLoaded , assistant } = useSubscription();
  const { openUpgradeModal } = useUpgradeModal();
  const { curriculumLevel, setCurriculumLevel, curriculumSubject, setCurriculumSubject } = useCurriculum();
  const tierRank = TIER_RANK[tier] ?? 0;

  const availableModels = useMemo(() => {
    return MODELS.map(m => {
      let isLocked = false;
      const name = m.displayName;
      if (name === "Mistral Large" && tierRank < TIER_RANK.Core) isLocked = true;
      if (name === "GPT OSS" && tierRank < TIER_RANK.Core) isLocked = true;
      if (name.includes("Gemini") && tierRank < TIER_RANK.Pro) isLocked = true;
      if (name.includes("Deepseek") && tierRank < TIER_RANK.Premium) isLocked = true;
      if (name.includes("Claude") && tierRank < TIER_RANK.Maximum) isLocked = true;

      return { ...m, isLocked };
    });
  }, [tierRank]);

  const [chatMode, setChatMode] = useState<ChatMode>("Standard");
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const [isCurriculumSelectorOpen, setIsCurriculumSelectorOpen] = useState(false);
  const currDropdownRef = useRef<HTMLDivElement>(null);
  const [isSubjectSelectorOpen, setIsSubjectSelectorOpen] = useState(false);
  const subjectDropdownRef = useRef<HTMLDivElement>(null);
  const [activeModel, setActiveModel] = useState<ModelDefinition>(MODELS[0]);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = usePersistentState<boolean>("assistant_sidebar_open", true);
  const [useWebFallback, setUseWebFallback] = usePersistentState<boolean>("assistant_use_web_fallback", false);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [extraTopicDetails, setExtraTopicDetails] = useState("");
  const [inputText, setInputText] = usePersistentState<string>("assistant_input_text", "");
  const [messages, setMessages] = useState<Message[]>([]);
  // Use plain useState for chats — source of truth is Supabase chat_history, not user_state.
  // usePersistentState was causing a race: key changed from "assistant_chats_undefined" to
  // "assistant_chats_user_xxx" after Clerk resolved, wiping the in-memory list.
  const [chats, setChats] = useState<ChatSession[]>([]);
  const chatsRef = useRef<ChatSession[]>(chats);
  useEffect(() => { chatsRef.current = chats; }, [chats]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [activeChatId, setActiveChatId] = usePersistentState<string | null>("assistant_active_chat_id", null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editChatTitle, setEditChatTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasPendingChatSave = useRef(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingChatSave.current) {
        e.preventDefault();
        e.returnValue = "Your chat is currently saving. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const saveChatToSupabase = async (chatId: string, title: string, msgs: Message[]) => {
    if (!user) return;
    hasPendingChatSave.current = true;
    try {
      await upsertChatAction({
        id: chatId,
        user_id: user.id,
        title: title,
        messages: msgs,
        updated_at: new Date().toISOString()
      });
      window.localStorage.setItem(`assistant_chats_updated_${user.id}`, Date.now().toString());
    } catch (e) {
      console.error("Failed to save chat to supabase", e);
    } finally {
      hasPendingChatSave.current = false;
    }
  };

  // Ensure active model is always valid for tier
  useEffect(() => {
    if (subLoaded && !availableModels.find(m => m.displayName === activeModel.displayName)) {
      setActiveModel(availableModels[0]);
    }
  }, [subLoaded, availableModels, activeModel]);

  // Load chats from Supabase. We extract this into a function so it can be called on mount AND on cross-tab sync.
  const loadChatsFromCloud = () => {
    let isMounted = true;
    fetchUserHistoryAction("chat_history", "id, title, messages, updated_at", 50)
      .then((data: any) => {
        if (!isMounted) return;
        const loadedChats: ChatSession[] = (data || []).map((d: any) => ({
          id: d.id,
          title: d.title,
          messages: d.messages,
          updatedAt: new Date(d.updated_at).getTime()
        })).sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
        setChats(loadedChats);
        setChatsLoaded(true);
      })
      .catch((e) => {
        console.error("Failed to load chats", e);
        setChatsLoaded(true); // Don't block UI on error
      });
    return () => { isMounted = false; };
  };

  useEffect(() => {
    if (!userLoaded) return;
    if (!user) {
      setChatsLoaded(true);
      return;
    }
    const cleanup = loadChatsFromCloud();
    return cleanup;
  }, [user?.id, userLoaded]);

  // Sync across tabs by listening to storage events and refetching cloud data
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `assistant_chats_updated_${user?.id}`) {
        loadChatsFromCloud();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user?.id]);

  // Sync messages into the UI when activeChatId changes (e.g. from cloud hydration on a new device)
  useEffect(() => {
    if (activeChatId && chats.length > 0 && messages.length === 0) {
      const chat = chats.find(c => c.id === activeChatId);
      if (chat && chat.messages.length > 0) {
        setMessages(chat.messages);
      }
    }
  }, [activeChatId, chats, messages.length]);

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
      const newTitle = editChatTitle.trim();
      setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
      const chatToSave = chats.find(c => c.id === id);
      if (chatToSave) {
        saveChatToSupabase(id, newTitle, chatToSave.messages);
      }
    }
    setEditingChatId(null);
  };

  const handleDeleteChat = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
      setMessages([]);
    }
    if (user) {
      try {
        await deleteHistoryAction("chat_history", id);
        window.localStorage.setItem(`assistant_chats_updated_${user.id}`, Date.now().toString());
      } catch (e) {
        console.error("Failed to delete chat", e);
      }
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeSelectorOpen(false);
      }
      if (currDropdownRef.current && !currDropdownRef.current.contains(event.target as Node)) {
        setIsCurriculumSelectorOpen(false);
      }
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target as Node)) {
        setIsSubjectSelectorOpen(false);
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
      openUpgradeModal("You do not have enough daily credits to use this model. Please wait until tomorrow or upgrade your plan.");
      setInputText("");
      return;
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setIsLoading(true);

    let currentId = activeChatId;
    if (!currentId) {
      currentId = crypto.randomUUID();
      setActiveChatId(currentId);
      
      const newChatSession: ChatSession = { id: currentId, title: "Generating title...", messages: newMessages, updatedAt: Date.now() };
      setChats(prev => [newChatSession, ...prev]);
      saveChatToSupabase(currentId, "Generating title...", newMessages);
      
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
          const currentChat = chatsRef.current.find(c => c.id === currentId);
          const latestMessages = currentChat ? currentChat.messages : newMessages;
          saveChatToSupabase(currentId!, d.title, latestMessages);
        }
      })
      .catch(() => {});
    } else {
      if (messages.length === 0) {
        // Chat was created from "New Chat" button, so generate a real title for the first message
        setChats(prev => {
          return prev.map(c => c.id === currentId ? { ...c, title: "Generating title...", messages: newMessages, updatedAt: Date.now() } : c);
        });
        saveChatToSupabase(currentId, "Generating title...", newMessages);
        
        fetch("/api/generate-chat-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: userMessage.content }),
        })
        .then(r => r.json())
        .then(d => {
          if (d.title) {
            setChats(prev => prev.map(c => c.id === currentId ? { ...c, title: d.title } : c));
          const currentChat = chatsRef.current.find(c => c.id === currentId);
          const latestMessages = currentChat ? currentChat.messages : newMessages;
          saveChatToSupabase(currentId!, d.title, latestMessages);
          }
        })
        .catch(() => {});
      } else {
        let activeTitle = "New Chat";
        setChats(prev => {
          return prev.map(c => {
            if (c.id === currentId) {
              activeTitle = c.title;
              return { ...c, messages: newMessages, updatedAt: Date.now() };
            }
            return c;
          });
        });
        saveChatToSupabase(currentId, activeTitle, newMessages);
      }
    }

    // Build system prompt based on mode
    const GREETING_RESPONSE = "Hi, I'm Perenne — your AI study assistant, built specifically around the AQA specification so everything I help you with actually maps to what you'll be tested on. I can generate flashcards from your notes or a topic, build you a quiz or run a full exam simulator with AQA-style questions, grade your essays with feedback tied to real AQA assessment objectives like AO1 and AO2, and answer questions or walk through topics with you directly. I also track your weak areas automatically based on your quiz and essay history, so you always know what's worth revising next, and I've got extra tools like mind maps, a math solver, presentations, and debate practice depending on how you like to study. Everything's tied to your account too, so you can start something on one device and pick it back up wherever you are. What do you need help with today?";
    const identity = `You are Perenne, an AI study assistant built specifically for UK students around the AQA specification. You answer every question the user asks fully and accurately. ONLY if the user directly greets you or asks who you are or what you can do, respond with exactly: "${GREETING_RESPONSE}" — do NOT use this response for any other type of question.`;
    let systemPrompt = "";
    if (chatMode === "Quick Answer") {
      systemPrompt = identity + "\nBe brief. Key facts only.";
    } else if (chatMode === "Strict Syllabus") {
      systemPrompt = identity + "\nExplain step-by-step using only strict syllabus knowledge. At the very end, on its own line, write the direct answer prefixed with 'ANSWER: '.";
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
          curriculumLevel,
          curriculumSubject,
          chatMode,
          useWebFallback,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        if (data.usage) {
          deductCredits(
            data.usage.inputTokens ?? data.usage.promptTokens ?? 0, 
            data.usage.outputTokens ?? data.usage.completionTokens ?? 0, 
            activeModel.displayName as ModelType, 
            "chat"
          );
        }
        // Deduct Mistral embedding cost when RAG is triggered
        if (chatMode === "Standard" || chatMode === "Strict Syllabus") {
          deductCredits(150, 0, "Mistral Embed", "chat");
        }
        if (data.tavilyUsed) {
          deductCredits(100, 100, "Tavily Search", "chat");
        }
        
        const assistantMessage: Message = {
          role: "assistant",
          content: data.text,
          revealAnswer: (chatMode as string) === "Understand" ? false : undefined,
        };
        const finalMessages = [...newMessages, assistantMessage];
        setMessages(finalMessages);
        
        setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: finalMessages, updatedAt: Date.now() } : c));
      const currentChat = chatsRef.current.find(c => c.id === currentId);
      const activeTitle = currentChat ? currentChat.title : "New Chat";
      saveChatToSupabase(currentId!, activeTitle, finalMessages);
      } else {
        const finalMessages = [...newMessages, { role: "assistant" as const, content: "Sorry, an error occurred: " + (data.message || "Unknown error") }];
        setMessages(finalMessages);
        setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: finalMessages, updatedAt: Date.now() } : c));
      const currentChat = chatsRef.current.find(c => c.id === currentId);
      const activeTitle = currentChat ? currentChat.title : "New Chat";
      saveChatToSupabase(currentId!, activeTitle, finalMessages);
      }
    } catch (e: any) {
      const finalMessages = [...newMessages, { role: "assistant" as const, content: "Failed to reach the server. Please check your connection." }];
      setMessages(finalMessages);
      setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: finalMessages, updatedAt: Date.now() } : c));
      const currentChat = chatsRef.current.find(c => c.id === currentId);
      const activeTitle = currentChat ? currentChat.title : "New Chat";
      saveChatToSupabase(currentId!, activeTitle, finalMessages);
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
      {isSidebarOpen ? (
        <div className="w-72 shrink-0 flex flex-col gap-3 pr-1 hidden md:flex">
          <div className="flex items-center gap-2">
            <Button onClick={handleNewChat} className="flex-1 gap-2 justify-start shadow-none border border-border bg-card hover:bg-muted text-sm font-normal tracking-normal" variant="outline">
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="flex shrink-0 items-center justify-center w-9 h-9 rounded-lg border border-border bg-card shadow-sm hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              title="Close Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden rounded-xl bg-card border border-border shadow-sm">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="font-semibold text-[13px] text-foreground flex items-center gap-2">
                <MessagesSquare className="w-4 h-4 text-muted-foreground" />
                Recent Chats
              </p>
            </div>
            {userLoaded && !user && (
              <div className="px-4 py-3 bg-amber-500/5 border-b border-amber-500/20">
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Guest mode: chats won't be saved across sessions.</p>
              </div>
            )}
            
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
                      <div className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-all",
                        activeChatId === c.id ? "opacity-100" : "opacity-0 group-hover/chat:opacity-100"
                      )}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(c.id);
                            setEditChatTitle(c.title);
                          }}
                          className="p-1.5 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground"
                          title="Rename chat"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(c.id);
                          }}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
        <div className="shrink-0 flex flex-col gap-3 pr-1 hidden md:flex">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card shadow-sm hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            title="Open Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Top Right Controls (Model Selector) */}
        <div className="absolute top-4 right-4 z-[60] flex items-center gap-3">
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
                        onClick={() => {
                          if (model.isLocked) {
                            openUpgradeModal(`The ${model.displayName} AI model is restricted to a higher tier.`);
                            return;
                          }
                          setActiveModel(model);
                          setIsModelSelectorOpen(false);
                        }}
                        onMouseEnter={() => setHoveredModel(model.displayName)}
                        onMouseLeave={() => setHoveredModel(null)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                          model.isLocked && "opacity-50",
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
            <h2 className="text-2xl font-semibold text-foreground mb-3 tracking-tight flex items-center justify-center gap-3">
              How can I help you study?
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">AQA Syllabus</span>
            </h2>
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
          
          <div className="flex items-center justify-between mb-3 w-full">
            {/* Modes Selector */}
            <div className="relative" ref={modeDropdownRef}>
              <button
                onClick={() => setIsModeSelectorOpen(!isModeSelectorOpen)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full border shadow-sm transition-all text-[13px] font-medium group",
                  chatMode === "Strict Syllabus" 
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                    : "bg-card border-border hover:bg-muted/50 text-foreground"
                )}
              >
                {chatMode === "Standard" && <MessagesSquare className="w-3.5 h-3.5 text-primary" />}
                {chatMode === "Strict Syllabus" && <BrainCircuit className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />}
                {chatMode === "Quick Answer" && <Zap className="w-3.5 h-3.5 text-amber-500" />}
                {chatMode}
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isModeSelectorOpen && "rotate-180")} />
              </button>

              {isModeSelectorOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-border bg-card shadow-lg overflow-visible animate-in fade-in slide-in-from-bottom-2 z-[60]">
                  <div className="p-2 border-b border-border bg-muted/30">
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground px-2">Select Mode</p>
                  </div>
                  <div className="p-1.5 flex flex-col gap-0.5">
                    {(["Quick Answer", "Standard", "Strict Syllabus"] as ChatMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setChatMode(mode);
                          setIsModeSelectorOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                          chatMode === mode
                            ? (mode === "Strict Syllabus" ? "bg-emerald-500/10 text-emerald-600 font-medium" : "bg-primary/5 text-primary font-medium")
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {mode === "Standard" && <MessagesSquare className="w-4 h-4 shrink-0 text-primary" />}
                          {mode === "Strict Syllabus" && <BrainCircuit className="w-4 h-4 shrink-0 text-emerald-600" />}
                          {mode === "Quick Answer" && <Zap className="w-4 h-4 shrink-0 text-amber-500" />}
                          <span className="truncate">{mode}</span>
                        </div>
                        {chatMode === mode && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI and Curriculum Selector */}
            <div className="flex items-center gap-2">
              <div className="relative" ref={currDropdownRef}>
                <button
                  onClick={() => setIsCurriculumSelectorOpen(!isCurriculumSelectorOpen)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border bg-card shadow-sm hover:bg-muted/50 transition-colors text-[13px] font-medium text-foreground group"
                >
                  {curriculumLevel}
                  <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isCurriculumSelectorOpen && "rotate-180")} />
                </button>

                {isCurriculumSelectorOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl border border-border bg-card shadow-lg overflow-visible animate-in fade-in slide-in-from-bottom-2 z-[60]">
                    <div className="p-2 border-b border-border bg-muted/30">
                      <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground px-2">Select Curriculum</p>
                    </div>
                    <div className="p-1.5 flex flex-col gap-0.5">
                      {(["KS3", "GCSE", "A-Level"] as any[]).map((level) => (
                        <button
                          key={level}
                          onClick={() => {
                            setCurriculumLevel(level);
                            setIsCurriculumSelectorOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                            curriculumLevel === level
                              ? "bg-primary/5 text-primary font-medium"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <span className="truncate">{level}</span>
                          {curriculumLevel === level && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl border border-border bg-card shadow-sm focus-within:shadow-md focus-within:border-primary/50 transition-all duration-300 flex flex-col">
            <textarea
              className="w-full max-h-32 min-h-[60px] resize-none bg-transparent px-5 py-4 text-sm placeholder:text-muted-foreground focus:outline-none"
              placeholder={
                chatMode === "Strict Syllabus"
                  ? "Answers strictly from AQA specification"
                  : chatMode === "Quick Answer"
                    ? "Short, key facts only"
                    : "Ask anything or paste an image..."
              }
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:bg-muted transition-colors rounded-lg">
                  <Paperclip className="w-4 h-4" />
                  <span className="text-xs font-medium">Attach</span>
                </Button>
              </div>
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
