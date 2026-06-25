import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <span className="text-xl font-bold text-primary-900">AI Travel Guide</span>
        <div className="flex gap-4">
          <Link href="/explore" className="text-gray-600 hover:text-primary-600 transition-colors">
            Explore
          </Link>
          <Link href="/guide" className="text-gray-600 hover:text-primary-600 transition-colors">
            AI Guide
          </Link>
          <Link
            href="/(auth)/login"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
        <h1 className="text-5xl font-bold text-primary-900 mb-4">
          Explore Mongolia with AI
        </h1>
        <p className="text-xl text-gray-500 max-w-xl mb-10">
          Discover hidden gems, get real-time audio guides, and navigate with your personal AI travel companion.
        </p>
        <div className="flex gap-4">
          <Link
            href="/explore"
            className="bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            Start Exploring
          </Link>
          <Link
            href="/guide"
            className="border border-primary-600 text-primary-600 px-8 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
          >
            Ask AI Guide
          </Link>
        </div>
      </div>

      {/* TODO: featured places, map preview, testimonials */}
      <div className="grid grid-cols-3 gap-6 px-8 pb-16 max-w-5xl mx-auto">
        {["Interactive Map", "AI Audio Guide", "Multilingual"].map((feature) => (
          <div key={feature} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="h-10 w-10 bg-primary-100 rounded-xl mb-4" />
            <h3 className="font-semibold text-gray-800 mb-2">{feature}</h3>
            <p className="text-gray-500 text-sm">Placeholder description for {feature} feature.</p>
          </div>
        ))}
      </div>
    </main>
  );
}
