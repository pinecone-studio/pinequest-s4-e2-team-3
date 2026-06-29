import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { demoRoutes } from "@/lib/routes";
import type { DemoRoute } from "@/types";

// GET /api/routes — the guided journeys for the Journey page + live guide.
// Reads from Supabase; self-seeds from the bundled demoRoutes the first time the
// table is empty (so "put the routes on the backend" needs no separate script).
// Any failure falls back to demoRoutes, so the app never loses its routes.
export async function GET() {
  if (!supabaseAdmin) return Response.json(demoRoutes);

  try {
    const { data, error } = await supabaseAdmin
      .from("routes")
      .select("id, title, region, summary, stops")
      .order("sort_order", { ascending: true });
    if (error) throw error;

    if (!data || data.length === 0) {
      // Empty table → seed once from the bundled routes, then return them.
      const rows = demoRoutes.map((r, i) => ({
        id: r.id,
        title: r.title,
        region: r.region,
        summary: r.summary,
        stops: r.stops,
        sort_order: i,
      }));
      const { error: seedError } = await supabaseAdmin.from("routes").upsert(rows);
      if (seedError) throw seedError;
      return Response.json(demoRoutes);
    }

    return Response.json(data as DemoRoute[]);
  } catch (e) {
    console.error("GET /api/routes falling back to bundled routes:", e);
    return Response.json(demoRoutes);
  }
}
