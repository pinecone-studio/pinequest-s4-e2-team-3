export default function ExplorePage() {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <span className="font-semibold text-primary-900">Explore</span>
        {/* TODO: search bar, filters */}
      </div>

      {/* TODO: Mapbox GL map */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium">Map View</p>
          <p className="text-gray-400 text-sm mt-1">Mapbox GL placeholder</p>
        </div>
      </div>
    </div>
  );
}
