"use client";

import { WeeklyTemplatePanel } from "@/components/TemplateEditor";
import type { DashboardTemplate, TrainerLocation } from "../types";

export function TemplatesTab({
  template,
  locations,
  scheduleStartTime,
  scheduleEndTime,
  onRefresh,
}: {
  template: DashboardTemplate | null;
  locations: TrainerLocation[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  onRefresh: () => void;
}) {
  return (
    <WeeklyTemplatePanel
      template={template}
      locations={locations}
      scheduleStartTime={scheduleStartTime}
      scheduleEndTime={scheduleEndTime}
      onSaved={onRefresh}
    />
  );
}
