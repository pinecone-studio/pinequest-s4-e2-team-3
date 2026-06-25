import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

export default function RegisterScreen() {
  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold text-primary-900 mb-2">
        Create Account
      </Text>
      <Text className="text-gray-500 mb-8">Start your travel journey</Text>

      {/* TODO: wire up form state and auth service */}
      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
        placeholder="Full Name"
      />
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
        <Text className="text-white font-semibold text-base">Create Account</Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity className="items-center">
          <Text className="text-primary-600">Already have an account? Sign in</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
