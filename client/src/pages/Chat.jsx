import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

export default function ChatPage() {
  const { id } = useParams();
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const [chat, setChat] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!accessToken || !id) return;

    let cancelled = false;

    const loadChat = async () => {
      try {
        const data = await api(`/chats/${id}`, { accessToken });
        if (!cancelled) {
          setChat(data);
        }
      } catch (err) {
        if (!cancelled) {
          alert(err.message || "Chat not found or expired");
          navigate(-1);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadChat();

    return () => {
      cancelled = true;
    };
  }, [id, accessToken, navigate]);

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

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading chat...
      </div>
    );
  }

  if (!chat) return null;

  const otherName =
    user?.role === "customer"
      ? chat.vendor?.storeName
      : chat.customer?.name;

  const backLink = user?.role === "vendor" ? "/vendor/chats" : "/chats";

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-2xl flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link to={backLink} className="rounded-full p-1.5 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="font-semibold">{otherName}</h2>
          {chat.product && (
            <p className="text-xs text-muted-foreground">
              About: {chat.product.title}
            </p>
          )}
        </div>
      </div>

      <p className="bg-orange-50 px-4 py-1.5 text-center text-xs text-orange-700">
        ⏱ This chat will automatically disappear after 7 days
      </p>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {chat.messages?.map((msg) => {
          const isMe =
            String(msg.sender) === String(user?.id) ||
            String(msg.sender?._id) === String(user?.id);

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