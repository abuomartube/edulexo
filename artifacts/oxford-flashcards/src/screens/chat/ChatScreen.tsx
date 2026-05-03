import {
  Mic,
  Hand,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import {
  Avatar,
  Header,
  IncomingBubble,
  OutgoingBubble,
  SystemBubble,
  VoiceMessage,
  ActionButton,
  InputBar,
  PhoneFrame,
  PageBackdrop,
  ChatScrollBg,
  HomeIndicator,
  Waves,
} from "@/components/chat-ui";
import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { MOCK_ROOMS, pickRandom, ICE_BREAKERS, TOPICS } from "@/data/chat";
import {
  getRoom,
  getMessages,
  sendMessage,
  sendVoiceMessage,
  postSystemMessage,
  type Room,
  type Message,
} from "@/data/chatApi";

function MessageItem({ m }: { m: Message }) {
  if (m.kind === "incoming" && m.name && m.letter && m.tone) {
    return (
      <IncomingBubble
        name={m.name}
        tone={m.tone}
        letter={m.letter}
        time={m.time}
        reactions={m.reactions}
      >
        {m.text}
      </IncomingBubble>
    );
  }
  if (m.kind === "outgoing") {
    return <OutgoingBubble time={m.time}>{m.text}</OutgoingBubble>;
  }
  if (m.kind === "voice-out") {
    return (
      <OutgoingBubble time={m.time}>
        <VoiceMessage duration={m.duration ?? "0:10"} played={0.5} bars={22} />
      </OutgoingBubble>
    );
  }
  if (m.kind === "voice-in" && m.name && m.letter && m.tone) {
    return (
      <IncomingBubble
        name={m.name}
        tone={m.tone}
        letter={m.letter}
        time={m.time}
      >
        <VoiceMessage duration={m.duration ?? "0:10"} played={0.3} bars={20} />
      </IncomingBubble>
    );
  }
  if (m.kind === "system") {
    return <SystemBubble>{m.text}</SystemBubble>;
  }
  return null;
}

export default function ChatScreen() {
  const [, params] = useRoute("/chat-screen/:id");
  const [, setLocation] = useLocation();
  const roomId = params?.id ?? MOCK_ROOMS[1].id;

  const [room, setRoom] = useState<Room>(MOCK_ROOMS[1]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getRoom(roomId), getMessages(roomId)]).then(([r, msgs]) => {
      if (cancelled) return;
      if (r) setRoom(r);
      setMessages(msgs);
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function sendText() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const res = await sendMessage(roomId, text);
    if (res.ok) setMessages((prev) => [...prev, res.data]);
  }

  async function sendVoice() {
    const res = await sendVoiceMessage(roomId);
    if (res.ok) setMessages((prev) => [...prev, res.data]);
  }

  async function addTopic() {
    const res = await postSystemMessage(
      roomId,
      `Topic suggestion: ${pickRandom(TOPICS)} 💡`,
    );
    if (res.ok) setMessages((prev) => [...prev, res.data]);
  }

  async function addIceBreaker() {
    const res = await postSystemMessage(roomId, pickRandom(ICE_BREAKERS));
    if (res.ok) setMessages((prev) => [...prev, res.data]);
  }

  return (
    <PageBackdrop>
      <PhoneFrame dir="ltr">
        <Header
          title={room.title}
          onBack={() => setLocation(`/room-details/${room.id}`)}
          subtitle={
            <>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                {room.online} online
              </span>
              <div className="flex -space-x-1.5">
                <Avatar letter="O" tone="blue" size={18} ring />
                <Avatar letter="S" tone="pink" size={18} ring />
                <Avatar letter="J" tone="emerald" size={18} ring />
              </div>
            </>
          }
          controls={
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                EN English Only
              </span>
              <div className="relative">
                <div className="absolute inset-0 -m-1 rounded-full bg-blue-500/40 blur-md" />
                <button className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_6px_20px_-2px_rgba(59,130,246,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] ring-2 ring-white/15">
                  <Mic size={16} className="text-white" />
                </button>
              </div>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 ring-1 ring-amber-500/30 text-amber-300 text-[11px] font-bold">
                <Hand size={12} />
                رفع اليد
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[9px] font-extrabold flex items-center justify-center">
                  3
                </span>
              </button>
            </>
          }
        />

        <ChatScrollBg
          scrollRef={scrollRef}
          className="px-4 pt-3 pb-2 space-y-2.5"
        >
          {messages.map((m) => (
            <div key={m.id} className="animate-fade-in-up">
              <MessageItem m={m} />
            </div>
          ))}
        </ChatScrollBg>

        <div className="relative z-10 px-4 pt-2 pb-1 border-t border-white/5 bg-slate-950/40 backdrop-blur">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ActionButton
              icon={<Sparkles size={14} />}
              label="Topic"
              tone="purple"
              onClick={addTopic}
            />
            <ActionButton
              icon={<Lightbulb size={14} />}
              label="Ice Breaker"
              tone="blue"
              onClick={addIceBreaker}
            />
            <ActionButton
              icon={<RefreshCw size={14} />}
              label="Rotate"
              tone="green"
              onClick={addTopic}
            />
            <ActionButton
              icon={<ImageIcon size={14} />}
              label="Image Talk"
              tone="orange"
              onClick={addTopic}
            />
          </div>

          <InputBar value={draft} onChange={setDraft} onSend={sendText} />

          <div className="flex items-center justify-center gap-2 mt-1.5 mb-0.5">
            <Waves />
            <div className="relative">
              <div className="absolute inset-0 -m-1.5 rounded-full bg-purple-500/40 blur-lg animate-pulse" />
              <button
                onClick={sendVoice}
                className="relative w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-white/20 hover:brightness-110 active:brightness-95 active:scale-90 animate-mic-breathe transition-[transform,filter] duration-150"
                style={{
                  background:
                    "linear-gradient(135deg, #60a5fa 0%, #818cf8 35%, #a855f7 100%)",
                  boxShadow:
                    "0 6px 18px -3px rgba(99,102,241,0.7), 0 0 28px -6px rgba(168,85,247,0.65), inset 0 1px 0 rgba(255,255,255,0.4)",
                }}
              >
                <Mic size={15} className="text-white drop-shadow" />
              </button>
            </div>
            <Waves />
          </div>

          <HomeIndicator />
        </div>
      </PhoneFrame>
    </PageBackdrop>
  );
}
