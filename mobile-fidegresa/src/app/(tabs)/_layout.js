import { Tabs } from "expo-router/tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../utils/theme";

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
        // Barra oscura como el menú de la landing; la pestaña activa en caramelo.
        tabBarActiveTintColor: colors.caramel,
        tabBarInactiveTintColor: colors.onDarkSoft,
        tabBarStyle: { backgroundColor: colors.espresso, borderTopColor: colors.onDarkLine },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 15, fontFamily: fonts.semibold },
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
