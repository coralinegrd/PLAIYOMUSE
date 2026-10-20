import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type ConversationRow = {
  id: string;
  kind: string;
  created_at: string;
  sessions: { title: string } | null;
  conversation_participants: { user_id: string }[] | null;
};

/**
 * Messages — real conversations only. RLS guarantees the query below can
 * only return conversations the current user participates in.
 * Direct chats start from people you follow; session chats are attached
 * to a session. Full chat UI (thread view + realtime) is the next step —
 * see README "What remains".
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "games" ? "games" : "direct";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("conversations")
    .select(
      "id, kind, created_at, sessions(title), conversation_participants(user_id)",
    )
    .order("created_at", { ascending: false });
  const conversations = (data ?? []) as unknown as ConversationRow[];
  const shown = conversations.filter((c) =>
    tab === "direct" ? c.kind === "direct" : c.kind === "session",
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-3xl border border-border bg-white px-4 py-3">
        <Link
          href="/"
          aria-label="Back"
          className="rounded-full bg-soft px-2.5 py-1 font-black text-ink"
        >
          ‹
        </Link>
        <h1 className="text-xl font-black text-ink">Messages</h1>
      </div>

      <div className="flex rounded-3xl border border-border bg-white p-1">
        <Link
          href="/messages?tab=direct"
          aria-current={tab === "direct" ? "page" : undefined}
          className={`flex-1 rounded-2xl py-2.5 text-center font-black ${
            tab === "direct" ? "bg-primary text-white" : "text-muted"
          }`}
        >
          Direct
        </Link>
        <Link
          href="/messages?tab=games"
          aria-current={tab === "games" ? "page" : undefined}
          className={`flex-1 rounded-2xl py-2.5 text-center font-black ${
            tab === "games" ? "bg-primary text-white" : "text-muted"
          }`}
        >
          Games
        </Link>
      </div>

      {shown.length > 0 ? (
        <ul className="space-y-3">
          {shown.map((conv) => {
            const others =
              conv.conversation_participants?.filter(
                (p) => p.user_id !== user?.id,
              ).length ?? 0;
            return (
              <li
                key={conv.id}
                className="rounded-3xl border border-border bg-white p-4"
              >
                <p className="font-black text-ink">
                  {conv.kind === "session"
                    ? (conv.sessions?.title ?? "Session chat")
                    : "Direct conversation"}
                </p>
                <p className="text-sm font-semibold text-muted">
                  {others} other participant{others === 1 ? "" : "s"}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-3xl border border-border bg-white p-6 text-center">
          <span className="inline-block rounded-full bg-cobalt/10 p-4 text-2xl text-primary">
            💬
          </span>
          <p className="mt-3 font-black text-ink">No chats yet</p>
          <p className="mt-1 font-semibold text-muted">
            {tab === "direct"
              ? "Start a conversation with someone you follow."
              : "Session chats appear here when you join or host a session."}
          </p>
          {tab === "direct" && (
            <p className="mx-auto mt-4 max-w-xs rounded-full bg-primary px-4 py-2.5 text-sm font-black text-white">
              Start a new chat
            </p>
          )}
        </div>
      )}

      <p className="text-center text-xs font-semibold text-muted">
        Chat threads with live messaging are the next build step — the data
        model and access rules are already in place.
      </p>
    </div>
  );
}
