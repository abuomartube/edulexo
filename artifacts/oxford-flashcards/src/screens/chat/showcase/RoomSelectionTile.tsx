import {
  Mic,
  Headphones,
  GraduationCap,
  MessageCircle,
} from "lucide-react";
import {
  Header,
  SearchBar,
  Tabs,
  RoomCard,
  BottomNav,
  ChatScrollBg,
} from "@/components/chat-ui";
import { MOCK_ROOMS, type RoomIconKey } from "@/data/chat";

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
    default:
      return <Mic size={18} className={cls} />;
  }
}

export function RoomSelectionTile() {
  const visible = MOCK_ROOMS.slice(0, 4);
  return (
    <>
      <Header
        title="اختيار الغرفة"
        subtitle={
          <span className="text-[10px] text-slate-400">
            اختر الغرفة التي تريد الانضمام إليها
          </span>
        }
      />
      <div className="relative z-10 px-4 pt-2.5 pb-2 space-y-2.5 border-b border-white/5">
        <SearchBar
          placeholder="ابحث عن غرفة..."
          value=""
          onChange={() => {}}
          dir="rtl"
        />
        <Tabs
          dir="rtl"
          value="all"
          onChange={() => {}}
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
            onClick={() => {}}
            onJoin={() => {}}
          />
        ))}
      </ChatScrollBg>
      <BottomNav active="chat" />
    </>
  );
}
