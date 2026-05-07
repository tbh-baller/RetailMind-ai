import { PageHeader } from "@/components/common/PageHeader";
import { ChatPanel } from "@/components/chat/ChatbotFab";

export default function Chatbot() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Assistant" subtitle="Ask about reorders, expiring stock, and best suppliers" />
      <div className="glow-card h-[calc(100vh-220px)] overflow-hidden max-w-3xl mx-auto">
        <ChatPanel />
      </div>
    </div>
  );
}
