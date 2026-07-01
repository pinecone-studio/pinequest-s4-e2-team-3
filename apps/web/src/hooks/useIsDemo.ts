"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { DEMO_EMAIL } from "@/lib/demoAuth";

// True only for the shared demo (sevo) account. Defaults to false until the auth
// check resolves, so normal users never flash the demo/presenter controls — and
// every demo-only affordance stays hidden unless we've confirmed the demo login.
// Mirrors the same gate the RoutePicker and Journey page already apply.
export function useIsDemo(): boolean {
  const [isDemo, setIsDemo] = useState(false);
  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        setIsDemo(data.user?.email?.toLowerCase() === DEMO_EMAIL.toLowerCase());
      })
      .catch(() => setIsDemo(false));
  }, []);
  return isDemo;
}
