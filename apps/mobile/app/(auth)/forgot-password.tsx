import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Link, useRouter } from "expo-router";
import { useSignIn, isClerkAPIResponseError } from "@clerk/clerk-expo";

export default function ForgotPasswordScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pendingReset, setPendingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function describeError(err: unknown): string {
    return isClerkAPIResponseError(err)
      ? (err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Something went wrong")
      : "Something went wrong. Please try again.";
  }

  async function handleSendCode() {
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setPendingReset(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    if (!isLoaded || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setError("Couldn't reset your password. Please try again.");
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingReset) {
    return (
      <View className="flex-1 justify-center px-6 bg-white">
        <Text className="text-3xl font-bold text-primary-900 mb-2">
          Set a new password
        </Text>
        <Text className="text-gray-500 mb-8">We sent a code to {email}</Text>

        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
          placeholder="Reset code"
          keyboardType="number-pad"
          autoCapitalize="none"
          value={code}
          onChangeText={setCode}
        />
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6"
          placeholder="New password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text className="text-red-600 mb-4">{error}</Text>}

        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-4 items-center mb-4"
          style={{ opacity: !isLoaded || submitting ? 0.6 : 1 }}
          disabled={!isLoaded || submitting}
          onPress={handleReset}
        >
          <Text className="text-white font-semibold text-base">
            {submitting ? "Resetting…" : "Reset password"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center"
          onPress={() => {
            setPendingReset(false);
            setError(null);
          }}
        >
          <Text className="text-gray-500">Use a different email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold text-primary-900 mb-2">
        Reset password
      </Text>
      <Text className="text-gray-500 mb-8">
        Enter your email and we&apos;ll send you a reset code
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
        style={{ opacity: !isLoaded || submitting ? 0.6 : 1 }}
        disabled={!isLoaded || submitting}
        onPress={handleSendCode}
      >
        <Text className="text-white font-semibold text-base">
          {submitting ? "Sending…" : "Send reset code"}
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
