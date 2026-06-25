import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4">
        <Text className="text-2xl font-bold text-primary-900 mt-6 mb-2">
          Discover
        </Text>
        <Text className="text-gray-500 mb-6">
          Find amazing places near you
        </Text>

        {/* TODO: featured places, nearby POIs, weather widget */}
        <View className="bg-gray-100 rounded-2xl h-48 items-center justify-center mb-4">
          <Text className="text-gray-400">Featured Places Placeholder</Text>
        </View>

        <View className="bg-gray-100 rounded-2xl h-32 items-center justify-center mb-4">
          <Text className="text-gray-400">Nearby POIs Placeholder</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
