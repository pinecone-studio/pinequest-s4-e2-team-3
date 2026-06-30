// Shared types for the Live Guide screen.

export type Theme = "dark" | "light";

// A place the traveller has chosen to head to (plan stop or a nearby pick).
export type Target = { name: string; latitude: number; longitude: number };
