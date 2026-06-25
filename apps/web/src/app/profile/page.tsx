export default function ProfilePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-primary-900 mb-6">Profile</h1>

      {/* TODO: user info from authStore */}
      <div className="bg-gray-50 rounded-2xl p-6 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200" />
        <div>
          <p className="font-semibold text-gray-800">User Name</p>
          <p className="text-gray-500 text-sm">user@email.com</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-6 mb-4">
        <p className="text-gray-400 text-center">Settings placeholder</p>
      </div>

      <button className="w-full border border-red-200 text-red-600 rounded-xl py-3 hover:bg-red-50 transition-colors font-medium">
        Sign Out
      </button>
    </div>
  );
}
