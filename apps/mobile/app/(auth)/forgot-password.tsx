import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSend() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email);
      if (err) {
        setError(err.message);
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <View className="flex-1 justify-center px-6 bg-white">
        <Text className="text-3xl font-bold text-primary-900 mb-2">
          Check your email
        </Text>
        <Text className="text-gray-500 mb-8">
          We sent a password reset link to {email}. Click the link in your
          email to set a new password.
        </Text>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity className="bg-primary-600 rounded-xl py-4 items-center">
            <Text className="text-white font-semibold text-base">Back to Sign In</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold text-primary-900 mb-2">
        Reset password
      </Text>
      <Text className="text-gray-500 mb-8">
        Enter your email and we&apos;ll send you a reset link
      </Text>

      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 mb-6"
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      {error && <Text className="text-red-600 mb-4">{error}</Text>}

      <TouchableOpacity
        className="bg-primary-600 rounded-xl py-4 items-center mb-4"
        style={{ opacity: submitting ? 0.6 : 1 }}
        disabled={submitting}
        onPress={handleSend}
      >
        <Text className="text-white font-semibold text-base">
          {submitting ? "Sending…" : "Send reset link"}
        </Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity className="items-center">
          <Text className="text-primary-600">Remembered it? Sign in</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
