import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function GuideScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-4">
        <Text className="text-2xl font-bold text-primary-900 mt-6 mb-2">
          AI Guide
        </Text>
        <Text className="text-gray-500 mb-6">
          Ask anything about your destination
        </Text>

        {/* TODO: chat history list */}
        <View className="flex-1 bg-gray-50 rounded-2xl mb-4 items-center justify-center">
          <Text className="text-gray-400">Conversation history placeholder</Text>
        </View>

        {/* TODO: voice input (Chimege STT) + text input + send */}
        <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3 mb-2">
          <Text className="flex-1 text-gray-400">Ask the AI guide...</Text>
          <TouchableOpacity className="ml-2">
            <Ionicons name="mic-outline" size={22} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity className="ml-2 bg-primary-600 rounded-xl p-2">
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
