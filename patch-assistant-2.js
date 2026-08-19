import fs from 'fs';

let content = fs.readFileSync('src/app/(app)/assistant/page.tsx', 'utf-8');

const regex = /let activeTitle = "New Chat";\s+setChats\(prev => \{\s+return prev\.map\(c => \{\s+if \(c\.id === currentId\) \{\s+activeTitle = c\.title;\s+return \{ \.\.\.c, messages: finalMessages, updatedAt: Date\.now\(\) \};\s+\}\s+return c;\s+\}\);\s+\}\);\s+saveChatToSupabase\(currentId!, activeTitle, finalMessages\);/g;

const replacement = `setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: finalMessages, updatedAt: Date.now() } : c));
      const currentChat = chatsRef.current.find(c => c.id === currentId);
      const activeTitle = currentChat ? currentChat.title : "New Chat";
      saveChatToSupabase(currentId!, activeTitle, finalMessages);`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/app/(app)/assistant/page.tsx', content);
