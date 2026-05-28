"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Member, AVATAR_BG } from "@/lib/types";
import { getMembers, initDb } from "@/lib/api";

export default function LinkMemberPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await initDb();
      const m = await getMembers();
      setMembers(m);
      setLoading(false);
    }
    load();
  }, []);

  async function handleLink() {
    if (!selected) return;
    setSaving(true);

    const res = await fetch("/api/link-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: selected }),
    });

    if (res.ok) {
      // Refresh the session so memberId is available everywhere
      await update();
      router.replace("/");
    } else {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#7c6af7] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <h1 className="text-[22px] font-bold text-foreground">Who are you?</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Link your Google account to your member profile.
          </p>
          {session?.user?.email && (
            <p className="text-[12px] text-dimmer mt-1">{session.user.email}</p>
          )}
        </div>

        {/* Member list */}
        {loading ? (
          <p className="text-center text-dimmer text-sm py-8">Loading...</p>
        ) : (
          <div className="space-y-2 mb-6">
            {members.map((m) => {
              const isSelected = selected === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? "border-[#7c6af7] bg-[#7c6af7]/10"
                      : "border-border bg-card hover:border-[#7c6af7]/40"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full ${AVATAR_BG[m.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[16px] shrink-0`}>
                    {m.name[0].toUpperCase()}
                  </div>
                  <span className="text-foreground font-semibold text-[16px]">{m.name}</span>
                  {isSelected && (
                    <svg className="ml-auto shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c6af7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={handleLink}
          disabled={!selected || saving}
          className="w-full py-3.5 rounded-2xl bg-[#7c6af7] text-white font-semibold text-[15px] hover:bg-[#6c5ae7] transition-colors disabled:opacity-40"
        >
          {saving ? "Linking..." : "Confirm"}
        </button>
      </div>
    </div>
  );
}
