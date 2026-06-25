import { AppNav } from "@/components/AppNav";

// Shared shell for the main app screens.
// The nav renders as a left sidebar on large screens and a bottom tab bar on
// small screens, so the content area shifts right (lg) and leaves room at the
// bottom (mobile) accordingly.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-sand lg:pl-64">
      <AppNav />
      <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6 lg:pb-12 lg:pt-10">
        {children}
      </main>
    </div>
  );
}
