"use client";
import { create } from "zustand";
import type { Coords, DemoRoute } from "@/types";

interface LiveState {
  activeRoute: DemoRoute | null;
  currentStopIndex: number;
  // Stops we've already spoken on arrival — so each narrates exactly once.
  arrivedStopIds: string[];
  // When set, this overrides the real GPS (the on-stage "simulate" control).
  simulatedCoords: Coords | null;

  // Routes that have an offline pack saved, + a demo toggle to preview offline.
  offlineReadyIds: string[];
  forceOffline: boolean;

  setRoute: (route: DemoRoute) => void;
  goToStop: (index: number) => void;
  advanceStop: () => void;
  markArrived: (stopId: string) => void;
  setSimulated: (coords: Coords | null) => void;
  setOfflineReady: (routeId: string) => void;
  setForceOffline: (value: boolean) => void;
  reset: () => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  activeRoute: null,
  currentStopIndex: 0,
  arrivedStopIds: [],
  simulatedCoords: null,
  offlineReadyIds: [],
  forceOffline: false,

  setRoute: (activeRoute) =>
    set({
      activeRoute,
      currentStopIndex: 0,
      arrivedStopIds: [],
      simulatedCoords: null,
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
    }),
}));
