import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatPage() {
  const { id } = useParams();
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const [chat, setChat] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadChat = async () => {
    try {
      const data = await api(`/chats/${id}`, { accessToken });
      setChat(data);
    } catch (err) {
      alert(err.message || "Chat not found or expired");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && id) loadChat();
  }, [id, accessToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const updated = await api(`/chats/${id}/message`, {
        method: "POST",
        accessToken,
        body: { text: text.trim() },
      });
      setChat(updated);
      setText("");
    } catch (err) {
      alert(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading chat...</div>;
  if (!chat) return null;

  const otherName =
    user.role === "customer"
      ? chat.vendor?.storeName
      : chat.customer?.name;

  return (
    <div className="mx-auto flex h-[80vh] max-w-2xl flex-col rounded-lg border bg-background shadow-sm">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">{otherName}</h2>
        {chat.product && (
          <p className="text-sm text-muted-foreground">
            About: {chat.product.title}
          </p>
        )}
        <p className="text-xs text-orange-600 mt-1">
          ⏱ This chat will disappear after 7 days
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {chat.messages.map((msg) => {
          const isMe = msg.sender === user.id || msg.sender?._id === user.id;
          return (
            <div
              key={msg._id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 border-t p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !text.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}