import { View, Text, TouchableOpacity } from "react-native";
import { Link, Stack } from "expo-router";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-6xl mb-4">🗺️</Text>
        <Text className="text-2xl font-bold text-primary-900 mb-2">
          Page Not Found
        </Text>
        <Text className="text-gray-500 text-center mb-8">
          This route doesn't exist.
        </Text>
        <Link href="/" asChild>
          <TouchableOpacity className="bg-primary-600 rounded-xl px-6 py-3">
            <Text className="text-white font-semibold">Go Home</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}
