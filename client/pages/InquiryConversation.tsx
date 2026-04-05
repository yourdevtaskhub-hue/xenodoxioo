import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api";
import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Send, MessageSquare, User, Building2 } from "lucide-react";

interface InquiryMessage {
  id: string;
  sender_type: "guest" | "host";
  message: string;
  created_at: string;
}

function formatDateOnly(str: string | null | undefined): string {
  if (!str) return "—";
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)).toLocaleDateString();
  return new Date(str).toLocaleDateString();
}

interface Inquiry {
  id: string;
  guest_name: string;
  guest_email: string;
  checkin_date: string;
  checkout_date: string;
  guests: number;
  status: string;
  created_at: string;
  property?: { name: string; location: string };
}

export default function InquiryConversation() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [messages, setMessages] = useState<InquiryMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState("");

  const fetchConversation = async () => {
    try {
      const res = await fetch(apiUrl(`/api/inquiries/${id}?email=${encodeURIComponent(email)}`));
      if (!res.ok) {
        setLoadError("Enquiry not found or unauthorized");
        return;
      }
      const data = await res.json();
      setInquiry(data.data.inquiry);
      setMessages(data.data.messages);
    } catch {
      setLoadError("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchConversation();
  }, [id]);

  const guestEmailToUse = (email || inquiry?.guest_email || manualEmail || "").trim();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;
    if (!guestEmailToUse) {
      setSendError("Please enter your email address above to send messages.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(apiUrl(`/api/inquiries/${id}/guest-reply`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestEmail: guestEmailToUse, message: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchConversation();
      } else {
        const data = await res.json().catch(() => ({}));
        const errMsg = data.details?.guestEmail
          ? `Email: ${data.details.guestEmail}`
          : data.error || "Failed to send reply";
        setSendError(errMsg);
      }
    } catch {
      setSendError("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container-max py-20 text-center">
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </Layout>
    );
  }

  if (loadError || !inquiry) {
    return (
      <Layout>
        <div className="container-max py-20 text-center">
          <p className="text-destructive">{loadError || "Enquiry not found"}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-max py-12 max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare size={28} className="text-primary" />
            <h1 className="text-2xl font-bold">Enquiry Conversation</h1>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Property: <strong>{inquiry.property?.name}</strong></p>
            <p className="text-sm text-muted-foreground">
              {formatDateOnly(inquiry.checkin_date)} - {formatDateOnly(inquiry.checkout_date)} | {inquiry.guests} guests
            </p>
            <p className="text-sm text-muted-foreground">Status: <span className="font-semibold capitalize">{inquiry.status.toLowerCase().replace("_", " ")}</span></p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_type === "guest" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.sender_type === "guest"
                  ? "bg-primary text-white rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {msg.sender_type === "guest" ? <User size={14} /> : <Building2 size={14} />}
                  <span className="text-xs opacity-75">{msg.sender_type === "guest" ? "You" : "Host"}</span>
                  <span className="text-xs opacity-50">{new Date(msg.created_at).toLocaleString()}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>

        {!guestEmailToUse && (
          <div className="mb-4 p-4 bg-muted/50 border border-border rounded-lg">
            <label className="block text-sm font-medium text-foreground mb-2">
              Enter your email to reply (same email you used for this enquiry):
            </label>
            <input
              type="email"
              value={manualEmail}
              onChange={(e) => { setManualEmail(e.target.value); setSendError(null); }}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>
        )}
        {sendError && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {sendError}
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => { setNewMessage(e.target.value); setSendError(null); }}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          />
          <button type="submit" disabled={sending || !newMessage.trim() || !guestEmailToUse}
            className="btn-primary px-6 gap-2 disabled:opacity-50">
            <Send size={16} />
            Send
          </button>
        </form>
      </div>
    </Layout>
  );
}
