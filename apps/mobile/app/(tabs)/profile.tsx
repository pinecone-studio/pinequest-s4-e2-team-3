import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore, getEmergencyContact } from "@/stores/authStore";
import { useDeadSwitchStore } from "@/stores/deadSwitchStore";

const GREEN = "#1F9D6B";
const AMBER = "#D9831F";
const RED = "#e53935";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, updateEmergencyContact } = useAuthStore();
  const { isArmed, arm, disarm, triggerOverlay } = useDeadSwitchStore();

  const fullName =
    (user?.user_metadata?.fullName as string | undefined) ?? "User";
  const email = user?.email ?? "";
  const contact = getEmergencyContact(user);

  // Emergency contact editing
  const [editingContact, setEditingContact] = useState(false);
  const [contactName, setContactName] = useState(contact?.name ?? "");
  const [contactPhone, setContactPhone] = useState(contact?.phone ?? "");
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  async function handleSaveContact() {
    if (savingContact) return;
    setContactError(null);
    setSavingContact(true);
    const { error } = await updateEmergencyContact({
      name: contactName,
      phone: contactPhone,
    });
    setSavingContact(false);
    if (error) {
      setContactError(error);
    } else {
      setEditingContact(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/login");
  }

  function handleToggleSwitch() {
    if (isArmed) {
      Alert.alert(
        "Disarm Switch",
        "Are you sure? Your emergency contact will no longer be alerted if you miss a check-in.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disarm",
            style: "destructive",
            onPress: () => disarm(),
          },
        ],
      );
    } else {
      if (!contact) {
        Alert.alert(
          "Emergency contact required",
          "Add an emergency contact first, then arm the switch.",
        );
        return;
      }
      arm();
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-bold text-primary-900 mt-6 mb-6">
          Profile
        </Text>

        {/* User card */}
        <View className="bg-gray-50 rounded-2xl p-4 mb-4 items-center">
          <View className="w-20 h-20 rounded-full bg-gray-200 mb-3" />
          <Text className="font-semibold text-gray-800">{fullName}</Text>
          <Text className="text-gray-500 text-sm">{email}</Text>
        </View>

        {/* Dead Man's Switch */}
        <View className="rounded-2xl border mb-4 overflow-hidden"
          style={{ borderColor: isArmed ? AMBER : "#e5e7eb" }}>
          <View className="p-4"
            style={{ backgroundColor: isArmed ? "#fff8f0" : "#f9fafb" }}>
            <View className="flex-row items-center justify-between mb-1">
              <Text className="font-semibold text-base"
                style={{ color: isArmed ? AMBER : "#1b2640" }}>
                Dead Man&apos;s Switch
              </Text>
              <View className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: isArmed ? AMBER : "#e5e7eb" }}>
                <Text className="text-xs font-bold text-white">
                  {isArmed ? "ARMED" : "OFF"}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-gray-500 mb-3">
              If you miss a check-in, your emergency contact is automatically
              alerted. Works offline.
            </Text>
            <TouchableOpacity
              className="rounded-xl py-3 items-center"
              style={{ backgroundColor: isArmed ? RED : GREEN }}
              onPress={handleToggleSwitch}
            >
              <Text className="text-white font-semibold text-sm">
                {isArmed ? "Disarm Switch" : "Arm Switch"}
              </Text>
            </TouchableOpacity>

            {/* Dev demo buttons */}
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
              <TouchableOpacity
                style={{ backgroundColor: "#1b264615", borderRadius: 8, paddingVertical: 8, alignItems: "center", marginBottom: 8 }}
                onPress={() => triggerOverlay()}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#1b2640" }}>
                  Offline Demo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: "#D9831F18", borderRadius: 8, paddingVertical: 8, alignItems: "center" }}
                onPress={() => triggerOverlay()}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: AMBER }}>
                  Service Demo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Emergency contact */}
        <View className="bg-gray-50 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-semibold text-gray-800">Emergency Contact</Text>
            {!editingContact && (
              <TouchableOpacity onPress={() => {
                setContactName(contact?.name ?? "");
                setContactPhone(contact?.phone ?? "");
                setEditingContact(true);
              }}>
                <Text className="text-primary-600 text-sm font-medium">
                  {contact ? "Edit" : "Add"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {editingContact ? (
            <>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 mb-3 bg-white"
                placeholder="Contact name"
                value={contactName}
                onChangeText={setContactName}
              />
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 mb-3 bg-white"
                placeholder="Phone number"
                keyboardType="phone-pad"
                value={contactPhone}
                onChangeText={setContactPhone}
              />
              {contactError && (
                <Text className="text-red-600 text-sm mb-3">{contactError}</Text>
              )}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 border border-gray-300 rounded-xl py-3 items-center"
                  onPress={() => {
                    setEditingContact(false);
                    setContactError(null);
                  }}
                >
                  <Text className="text-gray-600 font-medium">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-primary-600 rounded-xl py-3 items-center"
                  style={{ opacity: savingContact ? 0.6 : 1 }}
                  disabled={savingContact}
                  onPress={handleSaveContact}
                >
                  <Text className="text-white font-medium">
                    {savingContact ? "Saving…" : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : contact ? (
            <View>
              <Text className="text-gray-800 font-medium">{contact.name}</Text>
              <Text className="text-gray-500 text-sm">{contact.phone}</Text>
            </View>
          ) : (
            <Text className="text-gray-400 text-sm">
              No emergency contact set. Add one to use the Dead Man&apos;s Switch.
            </Text>
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          className="bg-red-50 border border-red-200 rounded-xl py-4 items-center mb-8"
          onPress={handleSignOut}
        >
          <Text className="text-red-600 font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
