import { describe, expect, it } from "vitest";
import {
  filterPreferencesToTemplateSlots,
  filterTemplateSlotsForClient,
} from "./last-minute";

describe("filterPreferencesToTemplateSlots", () => {
  const templateSlots = [
    {
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      locationId: "loc-a",
      locationName: "Gym",
    },
    {
      dayOfWeek: 1,
      startTime: "10:30",
      endTime: "11:30",
      locationId: "loc-b",
      locationName: "Park",
    },
  ];

  it("keeps preferences that match template slot starts", () => {
    const result = filterPreferencesToTemplateSlots(
      [
        { dayOfWeek: 1, startTime: "09:00" },
        { dayOfWeek: 1, startTime: "10:30" },
      ],
      templateSlots,
    );
    expect(result).toHaveLength(2);
  });

  it("drops preferences that are not template slot starts", () => {
    const result = filterPreferencesToTemplateSlots(
      [
        { dayOfWeek: 1, startTime: "09:00" },
        { dayOfWeek: 1, startTime: "10:00" },
        { dayOfWeek: 2, startTime: "09:00" },
      ],
      templateSlots,
    );
    expect(result).toEqual([{ dayOfWeek: 1, startTime: "09:00" }]);
  });
});

describe("filterTemplateSlotsForClient", () => {
  const templateSlots = [
    {
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      locationId: "loc-a",
      locationName: "Gym",
    },
    {
      dayOfWeek: 2,
      startTime: "09:00",
      endTime: "10:00",
      locationId: "loc-b",
      locationName: "Park",
    },
  ];

  it("keeps only template slots at enabled client locations", () => {
    const result = filterTemplateSlotsForClient(templateSlots, ["loc-a"]);
    expect(result).toHaveLength(1);
    expect(result[0]?.locationName).toBe("Gym");
  });

  it("returns empty when client has no enabled locations", () => {
    expect(filterTemplateSlotsForClient(templateSlots, [])).toEqual([]);
  });
});
