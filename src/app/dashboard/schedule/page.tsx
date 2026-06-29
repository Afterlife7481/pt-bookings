"use client";

import { ScheduleTab } from "../components/ScheduleTab";
import { useSchedulePage } from "../hooks/useSchedulePage";

export default function SchedulePage() {
  const schedule = useSchedulePage();

  return (
    <ScheduleTab
      settings={schedule.settings}
      weekStart={schedule.weekStart}
      scheduleRange={schedule.scheduleRange}
      scheduleEntries={schedule.scheduleEntries}
      hasTemplate={schedule.hasTemplate}
      clients={schedule.clients}
      trainerLocations={schedule.trainerLocations}
      applyingTemplate={schedule.applyingTemplate}
      scheduleError={schedule.scheduleError}
      onDismissError={() => schedule.setScheduleError(null)}
      onChangeWeek={schedule.changeWeek}
      onGoToThisWeek={schedule.goToThisWeek}
      onApplyTemplate={schedule.applyTemplateToCurrentWeek}
      onAddSlot={schedule.addScheduleSlot}
      onRemoveSlot={schedule.removeScheduleSlot}
      onAllocateSlot={schedule.allocateScheduleSlot}
      onUpdateSlotLocation={schedule.updateScheduleSlotLocation}
      onRefresh={schedule.refresh}
    />
  );
}
