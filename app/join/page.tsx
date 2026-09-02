"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AVATAR_BG } from "@/lib/types";

const COLORS = [
  { id: "indigo", label: "Indigo", cls: "bg-indigo-600" },
  { id: "purple", label: "Purple", cls: "bg-purple-600" },
  { id: "rose", label: "Rose", cls: "bg-rose-500" },
  { id: "amber", label: "Amber", cls: "bg-amber-500" },
  { id: "emerald", label: "Emerald", cls: "bg-emerald-500" },
  { id: "sky", label: "Sky", cls: "bg-sky-500" },
];

type Tab = "join" | "create";
type UnclaimedMember = { id: string; name: string; color: string };

export default function JoinPage() {
  const { update } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("join");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Join flow
  const [code, setCode] = useState("");
  const [groupInfo, setGroupInfo] = useState<{ id: string; name: string; invite_code: string } | null>(null);
  const [unclaimed, setUnclaimed] = useState<UnclaimedMember[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinColor, setJoinColor] = useState("indigo");

  // Create flow
  const [groupName, setGroupName] = useState("");
  const [createName, setCreateName] = useState("");
  const [createColor, setCreateColor] = useState("indigo");
  const [createdCode, setCreatedCode] = useState("");

  async function lookupCode() {
    setError("");
    setGroupInfo(null);
    setUnclaimed([]);
    setClaimId(null);
    if (!code.trim()) return;
    setLookingUp(true);
    try {
      const res = await fetch(`/api/groups/${code.trim().toUpperCase()}`);
      if (!res.ok) { setError("Invalid invite code. Check and try again."); return; }
      const data = await res.json();
      setGroupInfo(data.group);
      setUnclaimed(data.unclaimedMembers ?? []);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleJoin() {
    if (!groupInfo) return;
    if (!claimId && !joinName.trim()) { setError("Enter your display name."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: code.trim().toUpperCase(),
          displayName: joinName.trim(),
          color: joinColor,
          claimMemberId: claimId ?? undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to join."); return; }
      await update();
      router.replace("/");
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!groupName.trim()) { setError("Enter a group name."); return; }
    if (!createName.trim()) { setError("Enter your display name."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName: groupName.trim(), displayName: createName.trim(), color: createColor }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to create group."); return; }
      const data = await res.json();
      setCreatedCode(data.inviteCode);
      await update();
      // Short pause so user can see the invite code before redirecting
      setTimeout(() => router.replace("/"), 3000);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#7c6af7] flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h1 className="text-[22px] font-bold text-foreground">Join a Group</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Connect with your accountability brothers.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-muted p-1 mb-6">
          {(["join", "create"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); setCreatedCode(""); }}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-colors ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t === "join" ? "Join with Code" : "Create Group"}
            </button>
          ))}
        </div>

        {/* ── JOIN TAB ── */}
        {tab === "join" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && lookupCode()}
                placeholder="Invite code (e.g. BRHD01)"
                maxLength={10}
                className="flex-1 px-4 py-3 rounded-xl bg-card border border-input text-foreground text-[14px] font-mono placeholder:text-muted-foreground focus:outline-none focus:border-[#7c6af7]"
              />
              <button
                onClick={lookupCode}
                disabled={lookingUp || !code.trim()}
                className="px-4 py-3 rounded-xl bg-[#7c6af7] text-white text-[13px] font-semibold hover:bg-[#6c5ae7] disabled:opacity-40 transition-colors"
              >
                {lookingUp ? "…" : "Look up"}
              </button>
            </div>

            {groupInfo && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <p className="text-[13px] text-muted-foreground">
                  Found: <span className="text-foreground font-semibold">{groupInfo.name}</span>
                </p>

                {unclaimed.length > 0 && (
                  <div>
                    <p className="text-[12px] text-muted-foreground mb-2">
                      Existing members — claim yours or create a new one below:
                    </p>
                    <div className="space-y-2">
                      {unclaimed.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { setClaimId(claimId === m.id ? null : m.id); setJoinName(""); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                            claimId === m.id
                              ? "border-[#7c6af7] bg-[#7c6af7]/10"
                              : "border-border hover:border-[#7c6af7]/40"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full ${AVATAR_BG[m.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[13px] shrink-0`}>
                            {m.name[0].toUpperCase()}
                          </div>
                          <span className="text-foreground font-medium text-[14px]">{m.name}</span>
                          {claimId === m.id && (
                            <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c6af7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!claimId && (
                  <div className="space-y-3">
                    <p className="text-[12px] text-muted-foreground">
                      {unclaimed.length > 0 ? "Or create a new member:" : "Set up your profile:"}
                    </p>
                    <input
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      placeholder="Your display name"
                      className="w-full px-4 py-3 rounded-xl bg-background border border-input text-foreground text-[14px] placeholder:text-muted-foreground focus:outline-none focus:border-[#7c6af7]"
                    />
                    <div className="flex gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setJoinColor(c.id)}
                          title={c.label}
                          className={`w-8 h-8 rounded-full ${c.cls} transition-transform ${joinColor === c.id ? "ring-2 ring-offset-2 ring-[#7c6af7] scale-110" : "opacity-60 hover:opacity-100"}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleJoin}
                  disabled={saving || (!claimId && !joinName.trim())}
                  className="w-full py-3 rounded-xl bg-[#7c6af7] text-white font-semibold text-[14px] hover:bg-[#6c5ae7] disabled:opacity-40 transition-colors"
                >
                  {saving ? "Joining…" : claimId ? "Claim & Join" : "Join Group"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CREATE TAB ── */}
        {tab === "create" && (
          <div className="space-y-4">
            {createdCode ? (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center space-y-3">
                <p className="text-[14px] text-foreground font-semibold">Group created!</p>
                <p className="text-[13px] text-muted-foreground">Share this code with your group:</p>
                <p className="text-[28px] font-mono font-bold text-[#7c6af7] tracking-widest">{createdCode}</p>
                <p className="text-[12px] text-muted-foreground">Redirecting you in…</p>
              </div>
            ) : (
              <>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name (e.g. Brotherhood)"
                  className="w-full px-4 py-3 rounded-xl bg-card border border-input text-foreground text-[14px] placeholder:text-muted-foreground focus:outline-none focus:border-[#7c6af7]"
                />
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full px-4 py-3 rounded-xl bg-card border border-input text-foreground text-[14px] placeholder:text-muted-foreground focus:outline-none focus:border-[#7c6af7]"
                />
                <div>
                  <p className="text-[12px] text-muted-foreground mb-2">Pick a color:</p>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCreateColor(c.id)}
                        title={c.label}
                        className={`w-9 h-9 rounded-full ${c.cls} transition-transform ${createColor === c.id ? "ring-2 ring-offset-2 ring-[#7c6af7] scale-110" : "opacity-60 hover:opacity-100"}`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={saving || !groupName.trim() || !createName.trim()}
                  className="w-full py-3.5 rounded-2xl bg-[#7c6af7] text-white font-semibold text-[15px] hover:bg-[#6c5ae7] disabled:opacity-40 transition-colors"
                >
                  {saving ? "Creating…" : "Create Group"}
                </button>
              </>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-[13px] text-rose-500">{error}</p>
        )}
      </div>
    </div>
  );
}
