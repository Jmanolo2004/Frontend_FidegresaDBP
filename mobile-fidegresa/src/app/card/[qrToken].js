import { useLocalSearchParams } from "expo-router";
import { CardScreen } from "../../screens/CardScreen";

export default function CardRoute() {
  const { qrToken, mode } = useLocalSearchParams();
  return <CardScreen key={`${qrToken}-${mode ?? "card"}`} qrToken={String(qrToken)} mode={mode === "reward" ? "reward" : "card"} />;
}
