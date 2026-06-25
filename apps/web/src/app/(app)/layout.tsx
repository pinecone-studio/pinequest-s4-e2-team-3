import { AppNav } from "@/components/AppNav";

// Shared shell for the main app screens.
// The nav renders as a left sidebar on large screens and a bottom tab bar on
// small screens. `modal` is a parallel route slot used for intercepted overlays
// (e.g. the SOS sheet), which render on top of the current page.
export default function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-sand lg:pl-64">
      <AppNav />
      <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6 lg:pb-12 lg:pt-10">
        {children}
      </main>
      {modal}
    </div>
  );
}
