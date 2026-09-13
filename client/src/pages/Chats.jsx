import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MessageCircle } from "lucide-react";

export default function Chats() {
  const { accessToken, user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    const loadChats = async () => {
      try {
        const data = await api("/chats", { accessToken });
        setChats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [accessToken]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading messages...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Messages</h1>

      {chats.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>No conversations yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => {
            const lastMessage = chat.messages?.[chat.messages.length - 1];
            const otherName =
              user?.role === "customer"
                ? chat.vendor?.storeName
                : chat.customer?.name;

            return (
              <Link
                key={chat._id}
                to={user?.role === "vendor" ? `/vendor/chats/${chat._id}` : `/chats/${chat._id}`}
                className="flex items-center gap-4 rounded-lg border p-4 transition hover:bg-muted/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageCircle className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{otherName}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {chat.product && (
                    <p className="text-xs text-muted-foreground truncate">
                      About: {chat.product.title}
                    </p>
                  )}

                  {lastMessage && (
                    <p className="mt-1 text-sm text-muted-foreground truncate">
                      {lastMessage.text}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}