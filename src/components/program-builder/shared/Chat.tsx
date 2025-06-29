'use client';

import { useChat } from '@ai-sdk/react';

export default function Chat() {

  const { messages, input, handleInputChange, handleSubmit } = useChat();
  return (
        <div className="bg-white flex items-center justify-center flex-col p-24">
            {messages.map(message => (
                <div key={message.id} className="whitespace-pre-wrap">
                {message.role === 'user' ? 'User: ' : 'AI: '}
                {message.parts.map((part, i) => {
                    switch (part.type) {
                    case 'text':
                        return <div key={`${message.id}-${i}`}>{part.text}</div>;
                    }
                })}
                </div>
            ))}

        <form onSubmit={handleSubmit}>
            <input
                className="dark:bg-zinc-900 p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
                value={input}
                placeholder="Ask Proxima to build..."
                onChange={handleInputChange}
            />
        </form>
    </div>
  );
}