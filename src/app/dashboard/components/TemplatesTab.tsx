"use client";

import { Card } from "@/components/ui";
import {
  CreateTemplateCard,
  TemplateCard,
} from "@/components/TemplateEditor";
import type { DashboardTemplate, TrainerLocation } from "../types";

export function TemplatesTab({
  templates,
  locations,
  scheduleStartTime,
  scheduleEndTime,
  onRefresh,
}: {
  templates: DashboardTemplate[];
  locations: TrainerLocation[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No templates yet.</p>
        </Card>
      ) : (
        templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            locations={locations}
            scheduleStartTime={scheduleStartTime}
            scheduleEndTime={scheduleEndTime}
            onUpdated={onRefresh}
          />
        ))
      )}
      <CreateTemplateCard
        locations={locations}
        scheduleStartTime={scheduleStartTime}
        scheduleEndTime={scheduleEndTime}
        onCreated={onRefresh}
      />
    </div>
  );
}
