"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Edit, RotateCcw, FileText } from "lucide-react";
import { useLocale } from "next-intl";

// ── Types ─────────────────────────────────────────────────

interface PromptSlot {
  key: string;
  nameKey: string;
  descriptionKey: string;
  defaultContent: string;
  editable: boolean;
}

interface RegistryEntry {
  key: string;
  nameKey: string;
  descriptionKey: string;
  category: string;
  slots: PromptSlot[];
}

interface ProjectPromptTemplate {
  id: string;
  promptKey: string;
  slotKey: string | null;
  scope: string;
  projectId: string;
  content: string;
}

// ── Category icon/emoji map ───────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  script: "📝",
  character: "👤",
  shot: "🎬",
  frame: "🖼️",
  video: "🎥",
};

// ── Name key → human-readable fallback map ────────────────
// We display the raw nameKey split on underscores since we don't have access
// to the full i18n namespace here (could be improved by passing translations).
function formatNameKey(nameKey: string): string {
  return nameKey
    .replace(/^prompts\./, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Toggle Switch ─────────────────────────────────────────

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none ${
          checked ? "bg-primary" : "bg-[--border-subtle]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className="text-sm font-medium text-[--text-primary]">{label}</span>
    </label>
  );
}

// ── Main component ────────────────────────────────────────

interface ProjectPromptCardsProps {
  projectId: string;
}

export function ProjectPromptCards({ projectId }: ProjectPromptCardsProps) {
  const locale = useLocale();

  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [overrides, setOverrides] = useState<ProjectPromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Fetch registry + project overrides on mount
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [regResp, overResp] = await Promise.all([
        apiFetch("/api/prompt-templates/registry"),
        apiFetch(`/api/projects/${projectId}/prompt-templates`),
      ]);
      const regData: RegistryEntry[] = await regResp.json();
      const overData: ProjectPromptTemplate[] = await overResp.json();
      setRegistry(regData);
      setOverrides(overData);
      // Auto-enable toggle if there are existing overrides
      if (overData.length > 0) {
        setEnabled(true);
      }
    } catch {
      toast.error("加载提示词模板失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute per-prompt stats
  function getPromptStats(entry: RegistryEntry) {
    const promptOverrides = overrides.filter(
      (o) => o.promptKey === entry.key
    );
    const hasOverride = promptOverrides.length > 0;

    const editableSlots = entry.slots.filter((s) => s.editable);
    const modifiedSlotKeys = new Set(promptOverrides.map((o) => o.slotKey));
    const modifiedCount = editableSlots.filter((s) =>
      modifiedSlotKeys.has(s.key)
    ).length;

    return {
      hasOverride,
      totalSlots: editableSlots.length,
      modifiedCount,
    };
  }

  // Delete all project-level overrides for a promptKey
  async function handleUseGlobal(promptKey: string) {
    setDeletingKey(promptKey);
    try {
      const resp = await apiFetch(
        `/api/projects/${projectId}/prompt-templates/${promptKey}`,
        { method: "DELETE" }
      );
      if (!resp.ok && resp.status !== 204) {
        throw new Error("Delete failed");
      }
      // Refresh overrides
      const overResp = await apiFetch(
        `/api/projects/${projectId}/prompt-templates`
      );
      const overData: ProjectPromptTemplate[] = await overResp.json();
      setOverrides(overData);
      toast.success("已恢复为全局默认");
    } catch {
      toast.error("操作失败，请重试");
    } finally {
      setDeletingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-[--text-muted]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toggle header */}
      <div className="flex items-center justify-between rounded-2xl border border-[--border-subtle] bg-white p-4">
        <div className="flex flex-col gap-0.5">
          <ToggleSwitch
            checked={enabled}
            onChange={setEnabled}
            label="使用项目专属提示词"
          />
          <p className="ml-12 text-xs text-[--text-muted]">
            {enabled
              ? "此项目将使用下方配置的提示词覆盖全局默认设置"
              : "此项目当前使用全局默认提示词"}
          </p>
        </div>
        {enabled && overrides.length > 0 && (
          <Badge variant="default" className="shrink-0">
            {overrides.length} 个插槽已覆盖
          </Badge>
        )}
      </div>

      {/* Disabled state — show info message */}
      {!enabled && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[--border-subtle] bg-[--surface] py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--surface] text-2xl">
            <FileText className="h-5 w-5 text-[--text-muted]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[--text-secondary]">
              使用全局提示词
            </p>
            <p className="mt-1 text-xs text-[--text-muted]">
              启用项目专属提示词后，可为此项目单独定制 AI 生成行为
            </p>
          </div>
        </div>
      )}

      {/* Card grid */}
      {enabled && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {registry.map((entry) => {
            const { hasOverride, totalSlots, modifiedCount } =
              getPromptStats(entry);
            const emoji = CATEGORY_EMOJI[entry.category] ?? "💬";
            const isDeleting = deletingKey === entry.key;
            const editUrl = `/${locale}/settings/prompts?scope=project&projectId=${projectId}&prompt=${entry.key}`;

            return (
              <div
                key={entry.key}
                className="flex flex-col gap-3 rounded-2xl border border-[--border-subtle] bg-white p-4 transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
              >
                {/* Card header */}
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base ${
                      hasOverride
                        ? "bg-primary/10"
                        : "bg-[--surface]"
                    }`}
                  >
                    {emoji}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[--text-primary]">
                        {formatNameKey(entry.nameKey)}
                      </span>
                      {hasOverride ? (
                        <Badge
                          variant="success"
                          className="shrink-0 text-[10px] px-1.5 py-0"
                        >
                          已覆盖
                        </Badge>
                      ) : (
                        <Badge
                          className="shrink-0 text-[10px] px-1.5 py-0 bg-[--surface] text-[--text-muted]"
                        >
                          使用全局
                        </Badge>
                      )}
                    </div>
                    <span className="truncate font-mono text-[10px] text-[--text-muted]">
                      {entry.key}
                    </span>
                  </div>
                </div>

                {/* Slot count */}
                <p className="text-xs text-[--text-secondary]">
                  {totalSlots} 个插槽
                  {hasOverride && modifiedCount > 0
                    ? `，${modifiedCount} 个已修改`
                    : ""}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      window.location.href = editUrl;
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    编辑
                  </Button>
                  {hasOverride && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-[--text-muted] hover:text-destructive"
                      disabled={isDeleting}
                      onClick={() => handleUseGlobal(entry.key)}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      用全局
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
