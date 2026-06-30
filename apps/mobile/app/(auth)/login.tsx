import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Link, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold text-primary-900 mb-2">
        AI Travel Guide
      </Text>
      <Text className="text-gray-500 mb-8">Sign in to continue</Text>

      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 mb-6"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text className="text-red-600 mb-4">{error}</Text>}

      <Link href="/(auth)/forgot-password" asChild>
        <TouchableOpacity className="items-end mb-4">
          <Text className="text-primary-600 font-medium">Forgot password?</Text>
        </TouchableOpacity>
      </Link>

      <TouchableOpacity
        className="bg-primary-600 rounded-xl py-4 items-center mb-4"
        style={{ opacity: submitting ? 0.6 : 1 }}
        disabled={submitting}
        onPress={handleSignIn}
      >
        <Text className="text-white font-semibold text-base">
          {submitting ? "Signing in…" : "Sign In"}
        </Text>
      </TouchableOpacity>

      <Link href="/(auth)/register" asChild>
        <TouchableOpacity className="items-center">
          <Text className="text-primary-600">Don&apos;t have an account? Register</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
