import { Tabs } from "expo-router/tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../utils/theme";

const TAB_ICONS = {
  index: ["scan", "scan-outline"],
  history: ["time", "time-outline"],
  profile: ["person-circle", "person-circle-outline"]
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.espresso,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = TAB_ICONS[route.name] ?? ["ellipse", "ellipse-outline"];
          return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
        }
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Escanear" }} />
      <Tabs.Screen name="history" options={{ title: "Historial" }} />
      <Tabs.Screen name="profile" options={{ title: "Mi cuenta" }} />
    </Tabs>
  );
}
