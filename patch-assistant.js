import fs from 'fs';

let content = fs.readFileSync('src/app/(app)/assistant/page.tsx', 'utf-8');

// 1. Add chatsRef
content = content.replace(
  `  const [chats, setChats] = useState<ChatSession[]>([]);`,
  `  const [chats, setChats] = useState<ChatSession[]>([]);\n  const chatsRef = useRef<ChatSession[]>(chats);\n  useEffect(() => { chatsRef.current = chats; }, [chats]);`
);

// 2. Fix first title generation block
content = content.replace(
  `          let latestMessages = newMessages;\n          setChats(prev => {\n            return prev.map(c => {\n              if (c.id === currentId) {\n                latestMessages = c.messages;\n                return { ...c, title: d.title };\n              }\n              return c;\n            });\n          });\n          saveChatToSupabase(currentId!, d.title, latestMessages);`,
  `          setChats(prev => prev.map(c => c.id === currentId ? { ...c, title: d.title } : c));\n          const currentChat = chatsRef.current.find(c => c.id === currentId);\n          const latestMessages = currentChat ? currentChat.messages : newMessages;\n          saveChatToSupabase(currentId!, d.title, latestMessages);`
);

// 3. Fix second title generation block (it is exactly the same as above but indented more, or we can just replace all instances globally)
content = content.replace(
  /          let latestMessages = newMessages;[\s\S]*?saveChatToSupabase\(currentId!, d\.title, latestMessages\);/g,
  `          setChats(prev => prev.map(c => c.id === currentId ? { ...c, title: d.title } : c));\n          const currentChat = chatsRef.current.find(c => c.id === currentId);\n          const latestMessages = currentChat ? currentChat.messages : newMessages;\n          saveChatToSupabase(currentId!, d.title, latestMessages);`
);

// 4. Fix mistral api block
content = content.replace(
  `      let activeTitle = "New Chat";\n      setChats(prev => {\n        return prev.map(c => {\n          if (c.id === currentId) {\n            activeTitle = c.title;\n            return { ...c, messages: finalMessages, updatedAt: Date.now() };\n          }\n          return c;\n        });\n      });\n      saveChatToSupabase(currentId, activeTitle, finalMessages);`,
  `      setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: finalMessages, updatedAt: Date.now() } : c));\n      const currentChat = chatsRef.current.find(c => c.id === currentId);\n      const activeTitle = currentChat ? currentChat.title : "New Chat";\n      saveChatToSupabase(currentId!, activeTitle, finalMessages);`
);

fs.writeFileSync('src/app/(app)/assistant/page.tsx', content);
