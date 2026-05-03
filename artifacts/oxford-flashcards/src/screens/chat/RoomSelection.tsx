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
import { useState } from "react";
import { useLocation } from "wouter";
import { MOCK_ROOMS, type MockRoom, type RoomIconKey } from "@/data/chat";

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
  const [, setLocation] = useLocation();

  const visible = MOCK_ROOMS.filter(
    (r) =>
      (filter === "all" || r.cat === filter) &&
      (search === "" ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.desc.includes(search)),
  );

  function openDetails(r: MockRoom) {
    setLocation(r.cat === "voice" ? "/voice-room" : `/room-details/${r.id}`);
  }

  function joinRoom(r: MockRoom) {
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
              onJoin={() => joinRoom(r)}
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
