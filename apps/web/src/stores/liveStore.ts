"use client";
import { create } from "zustand";
import type { Coords, DemoRoute, PlaceOption } from "@/types";

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
  setReturnTarget: (coords: Coords | null) => void;
  setOfflineReady: (routeId: string) => void;
  setForceOffline: (value: boolean) => void;
  reset: () => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  activeRoute: null,
  currentStopIndex: 0,
  arrivedStopIds: [],
  simulatedCoords: null,
  suggestions: [],
  selectedPlace: null,
  returnTarget: null,
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
    set({ suggestions, selectedPlace: null, returnTarget: null }),

  selectPlace: (selectedPlace) => set({ selectedPlace }),

  setReturnTarget: (returnTarget) => set({ returnTarget }),

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
    }),
}));
