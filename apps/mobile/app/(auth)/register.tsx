import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Link, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignUp() {
    if (submitting) return;
    setError(null);

    if (!emergencyName.trim() || !emergencyPhone.trim()) {
      setError("Emergency contact name and phone are required.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            fullName,
            emergencyContact: { name: emergencyName.trim(), phone: emergencyPhone.trim() },
          },
        },
      });
      if (err) {
        setError(err.message);
      } else {
        setPendingVerification(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
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

  async function handleResend() {
    setError(null);
    try {
      await supabase.auth.resend({ type: "signup", email });
    } catch {
      setError("Failed to resend. Please try again.");
    }
  }

  if (pendingVerification) {
    return (
      <View className="flex-1 justify-center px-6 bg-white">
        <Text className="text-3xl font-bold text-primary-900 mb-2">
          Verify your email
        </Text>
        <Text className="text-gray-500 mb-8">We sent a code to {email}</Text>

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6"
          placeholder="Verification code"
          keyboardType="number-pad"
          autoCapitalize="none"
          value={code}
          onChangeText={setCode}
        />

        {error && <Text className="text-red-600 mb-4">{error}</Text>}

        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-4 items-center mb-4"
          style={{ opacity: submitting ? 0.6 : 1 }}
          disabled={submitting}
          onPress={handleVerify}
        >
          <Text className="text-white font-semibold text-base">
            {submitting ? "Verifying…" : "Verify & Continue"}
          </Text>
        </TouchableOpacity>

        <View className="flex-row items-center justify-center gap-4">
          <TouchableOpacity onPress={handleResend} disabled={submitting}>
            <Text className="text-primary-600 font-medium">Resend code</Text>
          </TouchableOpacity>
          <Text className="text-gray-300">·</Text>
          <TouchableOpacity
            onPress={() => {
              setPendingVerification(false);
              setError(null);
            }}
          >
            <Text className="text-gray-500">Use a different email</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-3xl font-bold text-primary-900 mb-2">
        Create Account
      </Text>
      <Text className="text-gray-500 mb-8">Start your travel journey</Text>

      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />
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

      {/* Emergency contact section */}
      <View className="border border-amber-200 bg-amber-50 rounded-xl p-4 mb-6">
        <Text className="text-sm font-semibold text-amber-800 mb-1">
          Emergency Contact (Required)
        </Text>
        <Text className="text-xs text-amber-700 mb-3">
          Used by the Dead Man&apos;s Switch safety feature. When you turn the switch
          on, this person receives your live location by SMS until you turn it off.
        </Text>
        <TextInput
          className="border border-amber-200 bg-white rounded-xl px-4 py-3 mb-3"
          placeholder="Contact name"
          value={emergencyName}
          onChangeText={setEmergencyName}
        />
        <TextInput
          className="border border-amber-200 bg-white rounded-xl px-4 py-3"
          placeholder="Phone number"
          keyboardType="phone-pad"
          value={emergencyPhone}
          onChangeText={setEmergencyPhone}
        />
      </View>

      {error && <Text className="text-red-600 mb-4">{error}</Text>}

      <TouchableOpacity
        className="bg-primary-600 rounded-xl py-4 items-center mb-4"
        style={{ opacity: submitting ? 0.6 : 1 }}
        disabled={submitting}
        onPress={handleSignUp}
      >
        <Text className="text-white font-semibold text-base">
          {submitting ? "Creating…" : "Create Account"}
        </Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity className="items-center">
          <Text className="text-primary-600">Already have an account? Sign in</Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}
