import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExploreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        {/* TODO: Mapbox MapView integration */}
        <View className="w-full h-full bg-gray-200 items-center justify-center">
          <Text className="text-gray-500 text-lg font-medium">Map View</Text>
          <Text className="text-gray-400 text-sm mt-1">
            Mapbox integration placeholder
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
