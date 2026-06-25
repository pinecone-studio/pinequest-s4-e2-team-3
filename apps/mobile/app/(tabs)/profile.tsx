import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const fullName =
    (user?.unsafeMetadata?.fullName as string | undefined) ??
    user?.fullName ??
    "User Name";
  const email = user?.primaryEmailAddress?.emailAddress ?? "user@email.com";

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/login");
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-4">
        <Text className="text-2xl font-bold text-primary-900 mt-6 mb-6">
          Profile
        </Text>

        <View className="bg-gray-50 rounded-2xl p-4 mb-4 items-center">
          <View className="w-20 h-20 rounded-full bg-gray-200 mb-3" />
          <Text className="font-semibold text-gray-800">{fullName}</Text>
          <Text className="text-gray-500 text-sm">{email}</Text>
        </View>

        <View className="bg-gray-50 rounded-2xl p-4 mb-4">
          <Text className="text-gray-400 text-center">Settings placeholder</Text>
        </View>

        <TouchableOpacity
          className="bg-red-50 border border-red-200 rounded-xl py-4 items-center mt-auto mb-4"
          onPress={handleSignOut}
        >
          <Text className="text-red-600 font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
