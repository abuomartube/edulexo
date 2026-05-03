import {
  Mic,
  Headphones,
  GraduationCap,
  MessageCircle,
  PenLine,
} from "lucide-react";
import {
  Header,
  SearchBar,
  Tabs,
  RoomCard,
  PhoneFrame,
  PageBackdrop,
  BottomNav,
  ChatScrollBg,
} from "@/components/chat-ui";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import type { RoomIconKey } from "@/data/chat";
import { getRooms, joinRoom, type Room } from "@/data/chatApi";

type RoomFilter = "all" | "speaking" | "voice" | "ielts";

function roomIcon(key: RoomIconKey) {
  const cls = "text-white";
  switch (key) {
    case "mic":
      return <Mic size={18} className={cls} />;
    case "headphones":
      return <Headphones size={18} className={cls} />;
    case "graduation":
      return <GraduationCap size={18} className={cls} />;
    case "message":
      return <MessageCircle size={18} className={cls} />;
    case "pen":
      return <PenLine size={18} className={cls} />;
  }
}

export default function RoomSelection() {
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [search, setSearch] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cancelled = false;
    getRooms().then((res) => {
      if (!cancelled) setRooms(res);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = rooms.filter(
    (r) =>
      (filter === "all" || r.cat === filter) &&
      (search === "" ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.desc.includes(search)),
  );

  function openDetails(r: Room) {
    setLocation(r.cat === "voice" ? "/voice-room" : `/room-details/${r.id}`);
  }

  async function handleJoin(r: Room) {
    const res = await joinRoom(r.id);
    if (!res.ok) return;
    setLocation(r.cat === "voice" ? "/voice-room" : `/chat-screen/${r.id}`);
  }

  return (
    <PageBackdrop>
      <PhoneFrame>
        <Header
          title="اختيار الغرفة"
          subtitle={
            <span className="text-[10px] text-slate-400">
              اختر نوع الغرفة الذي تريد الانضمام إليها
            </span>
          }
        />

        <div className="relative z-10 px-4 pt-2.5 pb-2 space-y-2.5 border-b border-white/5">
          <SearchBar
            placeholder="ابحث عن غرفة..."
            value={search}
            onChange={setSearch}
            dir="rtl"
          />
          <Tabs
            dir="rtl"
            value={filter}
            onChange={(v) => setFilter(v as RoomFilter)}
            items={[
              { value: "all", label: "كل الغرف" },
              { value: "speaking", label: "المحادثة" },
              { value: "voice", label: "الصوت فقط" },
              { value: "ielts", label: "IELTS" },
            ]}
          />
        </div>

        <ChatScrollBg className="px-4 pt-2.5 pb-2 space-y-2">
          {visible.map((r) => (
            <RoomCard
              key={r.id}
              icon={roomIcon(r.iconKey)}
              tone={r.tone}
              title={r.title}
              desc={r.desc}
              online={r.online}
              joinLabel="انضمام"
              onClick={() => openDetails(r)}
              onJoin={() => handleJoin(r)}
            />
          ))}
          {visible.length === 0 && (
            <div className="text-center text-[12px] text-slate-500 py-10">
              لم يتم العثور على غرف
            </div>
          )}
        </ChatScrollBg>

        <BottomNav active="chat" />
      </PhoneFrame>
    </PageBackdrop>
  );
}
