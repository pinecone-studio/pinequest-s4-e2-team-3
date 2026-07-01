"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoRoutes } from "@/lib/routes";
import type { Coords, DemoRoute, PlaceOption } from "@/types";
import type { BusLeg } from "@/lib/transit";

interface LiveState {
  activeRoute: DemoRoute | null;
  currentStopIndex: number;
  // Stops we've already spoken on arrival — so each narrates exactly once.
  arrivedStopIds: string[];
  // When set, this overrides the real GPS (the on-stage "simulate" control).
  simulatedCoords: Coords | null;

  // Places Michelle suggested in the last answer (food spots, bus stations…) and the
  // one the traveller picked — drives the selectable buttons + map markers and
  // the ad-hoc route to it.
  suggestions: PlaceOption[];
  selectedPlace: PlaceOption | null;
  // After a detour, the next stop to guide the traveller back to (blue line).
  returnTarget: Coords | null;
  // How the guide line to returnTarget is drawn: solid road (drive/taxi),
  // dashed road (walk), or a transit (bus) route.
  returnMode: "drive" | "transit" | "walk";
  // Real bus route legs to draw (walk dashed, bus colored) from the Hamuga API.
  busLegs: BusLeg[] | null;
  // Map base layer: standard roads vs satellite imagery (with labels).
  mapType: "roadmap" | "hybrid";
  // Map shows only the current leg (this stop → next stop) by default; the
  // "view full" toggle switches to the whole route at once. Not persisted.
  fullRouteView: boolean;

  // Routes that have an offline pack saved, + a demo toggle to preview offline.
  offlineReadyIds: string[];
  forceOffline: boolean;

  setRoute: (route: DemoRoute) => void;
  goToStop: (index: number) => void;
  advanceStop: () => void;
  markArrived: (stopId: string) => void;
  setSimulated: (coords: Coords | null) => void;
  setSuggestions: (places: PlaceOption[]) => void;
  selectPlace: (place: PlaceOption | null) => void;
  setReturnTarget: (coords: Coords | null, mode?: "drive" | "transit" | "walk") => void;
  setBusLegs: (legs: BusLeg[] | null) => void;
  toggleMapType: () => void;
  toggleFullRouteView: () => void;
  setOfflineReady: (routeId: string) => void;
  setForceOffline: (value: boolean) => void;
  reset: () => void;
}

export const useLiveStore = create<LiveState>()(
  persist(
    (set) => ({
  activeRoute: null,
  currentStopIndex: 0,
  arrivedStopIds: [],
  simulatedCoords: null,
  suggestions: [],
  selectedPlace: null,
  returnTarget: null,
  returnMode: "drive",
  busLegs: null,
  mapType: "roadmap",
  fullRouteView: false,
  offlineReadyIds: [],
  forceOffline: false,

  setRoute: (activeRoute) =>
    set({
      activeRoute,
      currentStopIndex: 0,
      arrivedStopIds: [],
      simulatedCoords: null,
      suggestions: [],
      selectedPlace: null,
      returnTarget: null,
      busLegs: null,
    }),

  goToStop: (currentStopIndex) => set({ currentStopIndex }),

  advanceStop: () =>
    set((state) => {
      const last = (state.activeRoute?.stops.length ?? 1) - 1;
      return { currentStopIndex: Math.min(state.currentStopIndex + 1, last) };
    }),

  markArrived: (stopId) =>
    set((state) =>
      state.arrivedStopIds.includes(stopId)
        ? state
        : { arrivedStopIds: [...state.arrivedStopIds, stopId] },
    ),

  setSimulated: (simulatedCoords) => set({ simulatedCoords }),

  setSuggestions: (suggestions) =>
    set({ suggestions, selectedPlace: null, returnTarget: null, busLegs: null }),

  selectPlace: (selectedPlace) => set({ selectedPlace }),

  setReturnTarget: (returnTarget, mode = "drive") =>
    set({ returnTarget, returnMode: mode }),

  setBusLegs: (busLegs) => set({ busLegs }),

  toggleMapType: () =>
    set((state) => ({ mapType: state.mapType === "roadmap" ? "hybrid" : "roadmap" })),

  toggleFullRouteView: () => set((state) => ({ fullRouteView: !state.fullRouteView })),

  setOfflineReady: (routeId) =>
    set((state) =>
      state.offlineReadyIds.includes(routeId)
        ? state
        : { offlineReadyIds: [...state.offlineReadyIds, routeId] },
    ),

  setForceOffline: (forceOffline) => set({ forceOffline }),

  reset: () =>
    set({
      activeRoute: null,
      currentStopIndex: 0,
      arrivedStopIds: [],
      simulatedCoords: null,
      suggestions: [],
      selectedPlace: null,
      returnTarget: null,
      busLegs: null,
    }),
    }),
    {
      name: "lumo:live", // localStorage key (matches the chat's "lumo:chat")
      // Persist the resume state. simulatedCoords is included so the blue dot
      // resumes where the journey left off — otherwise it desyncs: the card says
      // "arrived at <stop>" (from currentStopIndex) while the dot falls back to
      // raw GPS somewhere else. forceOffline (a demo toggle) stays out.
      //
      // Store only the route ID, not the whole DemoRoute (stops + full narration
      // text) — autowalk writes simulatedCoords ~12×/s, and re-serialising the
      // entire route each tick is wasteful. merge() rehydrates it from demoRoutes.
      partialize: (s) =>
        ({
          activeRouteId: s.activeRoute?.id ?? null,
          currentStopIndex: s.currentStopIndex,
          arrivedStopIds: s.arrivedStopIds,
          simulatedCoords: s.simulatedCoords,
          suggestions: s.suggestions,
          selectedPlace: s.selectedPlace,
          returnTarget: s.returnTarget,
          returnMode: s.returnMode,
          busLegs: s.busLegs,
          mapType: s.mapType,
          offlineReadyIds: s.offlineReadyIds,
        }) as unknown as LiveState,
      merge: (persisted, current) => {
        const { activeRouteId, ...rest } = (persisted ?? {}) as Partial<LiveState> & {
          activeRouteId?: string | null;
        };
        return {
          ...current,
          ...rest,
          activeRoute: activeRouteId
            ? demoRoutes.find((r) => r.id === activeRouteId) ?? null
            : null,
        };
      },
    },
  ),
);
