// Self-check for planDayToRoute. No test framework — run directly:
//   cd apps/web && bun run src/lib/planToRoute.check.ts
// fetch is stubbed to fail, so it runs offline: coords come from the fixture's
// places, narration falls back to the note / template, and a stop that has no
// coords and can't be geocoded is dropped.

import assert from "node:assert";
import { planDayToRoute } from "./planToRoute";

globalThis.fetch = (async () => {
  throw new Error("offline");
}) as typeof fetch;

async function main() {
  const plan = {
    id: "p1",
    title: "My UB day",
    stops: [
      { day: 1, time: "09:00", title: "Sukhbaatar Square", note: "City heart." },
      { day: 1, time: "11:00", title: "Gandan Monastery", note: "" }, // empty note → template
      { day: 2, time: "09:00", title: "Zaisan", note: "" }, // no coords → geocode fails → dropped
    ],
    places: [
      { name: "Sukhbaatar Square", latitude: 47.9186, longitude: 106.9176, imageUrl: "x" },
      { name: "Gandan Monastery", latitude: 47.9214, longitude: 106.8945 },
    ],
  };

  const route = await planDayToRoute(plan, 1);
  assert(route, "day 1 should produce a route");
  assert.equal(route.id, "plan:p1:d1", "route id");
  assert.equal(route.stops.length, 2, "day 1 has 2 mappable stops");
  assert(
    route.stops.every((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude)),
    "every stop has finite coordinates",
  );
  assert.equal(route.stops[0].narration, "City heart.", "non-empty note becomes narration");
  assert(
    route.stops[1].narration.includes("Gandan Monastery"),
    "empty note falls back to the template",
  );

  const day2 = await planDayToRoute(plan, 2);
  assert.equal(day2, null, "day 2 has no locatable stop → null");

  // eslint-disable-next-line no-console
  console.log("PASS planToRoute:", route.id, "·", route.stops.map((s) => s.name).join(" → "));
}

void main();
