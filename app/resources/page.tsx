"use client";

import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { Member, AVATAR_BG } from "@/lib/types";
import { getMembers, initDb } from "@/lib/api";

interface Resource {
  id: string;
  memberId: string;
  category: string;
  title: string;
  url: string;
  description: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: "book", label: "Book", emoji: "📚" },
  { value: "website", label: "Website", emoji: "🌐" },
  { value: "movie", label: "Movie", emoji: "🎬" },
  { value: "podcast", label: "Podcast", emoji: "🎙️" },
  { value: "video", label: "Video", emoji: "▶️" },
  { value: "tool", label: "Tool", emoji: "🛠️" },
  { value: "other", label: "Other", emoji: "💡" },
];

function getCategoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? { value, label: value, emoji: "💡" };
}

async function fetchResources(): Promise<Resource[]> {
  const res = await fetch("/api/resources");
  if (!res.ok) return [];
  return res.json();
}

async function postResource(r: Omit<Resource, "id" | "createdAt">): Promise<void> {
  await fetch("/api/resources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() }),
  });
}

async function deleteResource(id: string): Promise<void> {
  await fetch("/api/resources", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export default function ResourcesPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formMemberId, setFormMemberId] = useState("");
  const [formCategory, setFormCategory] = useState("book");
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      await initDb();
      const [m, r] = await Promise.all([getMembers(), fetchResources()]);
      setMembers(m);
      setResources(r);
      if (m.length > 0) setFormMemberId(m[0].id);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formMemberId) return;
    setSaving(true);
    await postResource({
      memberId: formMemberId,
      category: formCategory,
      title: formTitle.trim(),
      url: formUrl.trim(),
      description: formDesc.trim(),
    });
    const updated = await fetchResources();
    setResources(updated);
    setFormTitle("");
    setFormUrl("");
    setFormDesc("");
    setSaving(false);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    await deleteResource(id);
    setResources((prev) => prev.filter((r) => r.id !== id));
  }

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const filtered = filterCategory === "all"
    ? resources
    : resources.filter((r) => r.category === filterCategory);

  // Group by category
  const usedCategories = Array.from(new Set(resources.map((r) => r.category)));

  return (
    <div className="min-h-screen bg-[#0d0f14] pb-28">
      <div className="max-w-lg mx-auto">
        <div className="px-5 pt-8 pb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[32px] font-bold text-white leading-none">Resources</h2>
            <p className="text-[13px] text-[#8b93a7] mt-2">Shared by the brotherhood</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="mt-1 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#7c6af7] text-white text-[13px] font-semibold hover:bg-[#6c5ae7] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mx-4 mb-4 bg-[#161922] rounded-2xl px-4 py-4 space-y-3">
            <p className="text-[13px] font-semibold text-white">Add a resource</p>

            {/* Member */}
            <div>
              <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1.5">From</label>
              <div className="flex gap-2 flex-wrap">
                {members.map((m) => (
                  <button key={m.id} type="button" onClick={() => setFormMemberId(m.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${formMemberId === m.id ? "bg-[#7c6af7] text-white" : "bg-[#0d0f14] text-[#8b93a7]"}`}>
                    <div className={`w-4 h-4 rounded-full ${AVATAR_BG[m.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[9px]`}>
                      {m.name[0].toUpperCase()}
                    </div>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1.5">Category</label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((c) => (
                  <button key={c.value} type="button" onClick={() => setFormCategory(c.value)}
                    className={`px-2.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${formCategory === c.value ? "bg-[#7c6af7] text-white" : "bg-[#0d0f14] text-[#8b93a7]"}`}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="bg-[#0d0f14] rounded-xl px-3 py-2.5">
              <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1">Title *</label>
              <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. The War of Art" required
                className="w-full bg-transparent text-[14px] text-white placeholder:text-[#374151] outline-none" />
            </div>

            {/* URL */}
            <div className="bg-[#0d0f14] rounded-xl px-3 py-2.5">
              <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1">Link (optional)</label>
              <input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-transparent text-[14px] text-white placeholder:text-[#374151] outline-none" />
            </div>

            {/* Description */}
            <div className="bg-[#0d0f14] rounded-xl px-3 py-2.5">
              <label className="text-[11px] font-semibold text-[#6b7280] tracking-wider uppercase block mb-1">Why recommend it?</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Short note..." rows={2}
                className="w-full bg-transparent text-[14px] text-white placeholder:text-[#374151] outline-none resize-none" />
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#0d0f14] text-[#8b93a7] text-[13px] font-semibold hover:text-white transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!formTitle.trim() || saving}
                className="flex-1 py-2.5 rounded-xl bg-[#7c6af7] text-white text-[13px] font-semibold hover:bg-[#6c5ae7] transition-colors disabled:opacity-40">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}

        {/* Category filter */}
        {!loading && resources.length > 0 && (
          <div className="flex gap-2 px-4 flex-wrap mb-4 overflow-x-auto">
            <FilterPill label="All" active={filterCategory === "all"} onClick={() => setFilterCategory("all")} />
            {usedCategories.map((cat) => {
              const meta = getCategoryMeta(cat);
              return (
                <FilterPill key={cat} label={`${meta.emoji} ${meta.label}`} active={filterCategory === cat} onClick={() => setFilterCategory(cat)} />
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="px-4 space-y-3">
          {loading && <p className="text-[#4b5563] text-sm text-center py-16">Loading...</p>}

          {!loading && resources.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#4b5563] text-sm">No resources yet.</p>
              <p className="text-[#374151] text-xs mt-1">Be the first to add one.</p>
            </div>
          )}

          {!loading && filtered.map((r) => {
            const member = memberMap[r.memberId];
            const meta = getCategoryMeta(r.category);
            return (
              <ResourceCard key={r.id} resource={r} member={member} meta={meta} onDelete={() => handleDelete(r.id)} />
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${active ? "bg-[#7c6af7] text-white" : "bg-[#161922] text-[#8b93a7] hover:text-white"}`}>
      {label}
    </button>
  );
}

function ResourceCard({ resource, member, meta, onDelete }: {
  resource: Resource;
  member: Member | undefined;
  meta: { emoji: string; label: string };
  onDelete: () => void;
}) {
  const dateLabel = new Date(resource.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  return (
    <div className="bg-[#161922] rounded-2xl px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0d0f14] flex items-center justify-center text-[20px] shrink-0">
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {resource.url ? (
                <a href={resource.url} target="_blank" rel="noopener noreferrer"
                  className="text-[15px] font-semibold text-white hover:text-[#7c6af7] transition-colors leading-snug block">
                  {resource.title}
                  <svg className="inline ml-1 mb-0.5" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              ) : (
                <p className="text-[15px] font-semibold text-white leading-snug">{resource.title}</p>
              )}
              <span className="text-[11px] font-medium text-[#6b7280]">{meta.label}</span>
            </div>
            <button onClick={onDelete} className="text-[#2a2f3e] hover:text-red-400 transition-colors shrink-0 mt-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>

          {resource.description && (
            <p className="text-[13px] text-[#8b93a7] mt-1.5 leading-relaxed">{resource.description}</p>
          )}

          <div className="flex items-center gap-2 mt-2">
            {member && (
              <>
                <div className={`w-4 h-4 rounded-full ${AVATAR_BG[member.color] ?? "bg-indigo-600"} flex items-center justify-center text-white font-bold text-[9px]`}>
                  {member.name[0].toUpperCase()}
                </div>
                <span className="text-[11px] text-[#6b7280]">{member.name}</span>
                <span className="text-[#2a2f3e]">·</span>
              </>
            )}
            <span className="text-[11px] text-[#4b5563]">{dateLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
