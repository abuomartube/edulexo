import { Trash2, Image as ImageIcon } from "lucide-react";
import VoicePlayer from "./VoicePlayer";
import type { ChatMessage } from "@/lib/chat-api";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function MessageBubble({
  msg,
  isMine,
  canDelete,
  onDelete,
  lang,
}: {
  msg: ChatMessage;
  isMine: boolean;
  canDelete: boolean;
  onDelete: () => void;
  lang: "en" | "ar";
}) {
  const time = new Date(msg.createdAt).toLocaleTimeString(
    lang === "ar" ? "ar-EG" : "en-US",
    { hour: "numeric", minute: "2-digit" },
  );

  if (msg.kind === "system") {
    return (
      <div className="my-2 flex justify-center">
        <div className="text-xs px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-200 border border-purple-200/60 dark:border-purple-900/60">
          {msg.body}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2 my-2 ${isMine ? "flex-row-reverse" : "flex-row"} items-end`}
    >
      {!isMine && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
          {initials(msg.authorName)}
        </div>
      )}
      <div className={`max-w-[78%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
        {!isMine && (
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5 px-1">
            {msg.authorName}
            {msg.authorRole === "admin" && (
              <span className="ms-1 px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[9px] uppercase tracking-wide">
                Admin
              </span>
            )}
          </span>
        )}
        <div
          className={`group relative px-3.5 py-2 rounded-2xl shadow-sm ${
            isMine
              ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-sm"
              : "bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-gray-700 rounded-bl-sm"
          }`}
        >
          {msg.deleted ? (
            <span className="italic opacity-70 text-sm">message deleted</span>
          ) : msg.kind === "text" ? (
            <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
          ) : msg.kind === "voice" && msg.attachmentUrl ? (
            <VoicePlayer
              src={msg.attachmentUrl}
              durationSec={msg.audioDurationSec}
              tone={isMine ? "self" : "other"}
            />
          ) : msg.kind === "image" && msg.attachmentUrl ? (
            <a
              href={msg.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="block max-w-[260px]"
            >
              <img
                src={msg.attachmentUrl}
                alt="attachment"
                className="rounded-xl max-h-[260px] object-cover"
                loading="lazy"
              />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs opacity-80">
              <ImageIcon size={14} /> attachment
            </span>
          )}
          <div
            className={`mt-1 text-[10px] ${
              isMine
                ? "text-white/70 text-end"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {time}
          </div>
          {canDelete && !msg.deleted && (
            <button
              onClick={onDelete}
              type="button"
              aria-label="Delete"
              className={`absolute -top-2 ${
                isMine ? "-start-2" : "-end-2"
              } opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow`}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
