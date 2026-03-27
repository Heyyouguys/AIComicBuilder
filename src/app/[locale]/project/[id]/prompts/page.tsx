"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { ProjectPromptCards } from "@/components/prompt-templates/project-prompt-cards";

export default function ProjectPromptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  return (
    <div className="flex-1 overflow-y-auto bg-[--surface] p-6">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[--text-muted] transition-colors hover:bg-white hover:text-[--text-primary]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/8">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-[--text-primary]">
              项目提示词
            </h2>
            <p className="text-xs text-[--text-muted]">
              为此项目配置专属 AI 提示词，覆盖全局默认设置
            </p>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="mx-auto max-w-5xl">
        <ProjectPromptCards projectId={projectId} />
      </div>
    </div>
  );
}
