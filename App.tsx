import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Role, Message } from './types';
import { initializeChat, sendMessageStream } from './services/geminiService';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Role.MODEL,
      content: "Hello! I'm your Concrete Expert. Ask me anything about cement, mix ratios, or structural durability.",
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Initialize chat session on mount
  useEffect(() => {
    if (!initialized.current) {
      try {
        initializeChat();
        initialized.current = true;
      } catch (err) {
        console.error("Failed to init chat", err);
      }
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsgId = uuidv4();
    const userMessage: Message = {
      id: userMsgId,
      role: Role.USER,
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create placeholder for model response
    const modelMsgId = uuidv4();
    const modelMessagePlaceholder: Message = {
      id: modelMsgId,
      role: Role.MODEL,
      content: '', // Starts empty, fills via stream
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, modelMessagePlaceholder]);

    try {
      let fullResponse = '';
      
      await sendMessageStream(text, (chunk) => {
        fullResponse += chunk;
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === modelMsgId 
              ? { ...msg, content: fullResponse } 
              : msg
          )
        );
      });

    } catch (error) {
      console.error("Error generating response:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: Role.MODEL,
          content: "I apologize, but I encountered an error processing your request. Please verify your API key or try again later.",
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsLoading(false);
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === modelMsgId 
            ? { ...msg, isStreaming: false } 
            : msg
        )
      );
    }
  }, [isLoading]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 relative">
      {/* Header - Compact for embedding */}
      <header className="flex-none bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10">
        <div className="bg-orange-500 p-1.5 rounded-lg text-white">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-base text-slate-800 leading-tight">Concrete Expert</h1>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 scroll-smooth">
        <div className="max-w-4xl mx-auto flex flex-col">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          
          {isLoading && messages[messages.length - 1].role === Role.USER && (
             <div className="flex w-full mb-4 justify-start animate-pulse">
               <div className="bg-white rounded-2xl px-5 py-4 shadow-sm rounded-bl-none flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </main>

      {/* Input Area - Sticky Bottom */}
      <div className="flex-none z-10">
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
};

export default App;