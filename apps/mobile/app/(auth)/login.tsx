import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

export default function LoginScreen() {
  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold text-primary-900 mb-2">
        AI Travel Guide
      </Text>
      <Text className="text-gray-500 mb-8">Sign in to continue</Text>

      {/* TODO: wire up form state and auth service */}
      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 mb-6"
        placeholder="Password"
        secureTextEntry
      />

      <TouchableOpacity className="bg-primary-600 rounded-xl py-4 items-center mb-4">
        <Text className="text-white font-semibold text-base">Sign In</Text>
      </TouchableOpacity>

      <Link href="/(auth)/register" asChild>
        <TouchableOpacity className="items-center">
          <Text className="text-primary-600">Don't have an account? Register</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
