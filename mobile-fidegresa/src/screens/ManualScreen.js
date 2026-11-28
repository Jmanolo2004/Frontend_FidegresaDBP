import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, programColors, radius, spacing, typography } from "../utils/theme";

/** Guía para el staff: qué hacer en caja con cada tipo de tarjeta. */
const SECTIONS = [
  {
    icon: "log-in-outline",
    title: "1. Antes de empezar",
    steps: [
      "Inicia sesión con el correo y la contraseña que te dio el dueño del negocio (la misma cuenta del panel).",
      "Elige tu local arriba, en la pantalla Escanear. La app lo sugiere con el GPS; si no, tócalo y elígelo a mano.",
      "Todo lo que registres queda guardado en ese local. Si atiendes en otro, cámbialo desde Mi cuenta → Cambiar local."
    ]
  },
  {
    icon: "scan-outline",
    title: "2. Escanear tarjeta (sumar)",
    steps: [
      "Úsalo cuando el cliente paga su compra.",
      "Toca «Escanear tarjeta» y apunta al QR que el cliente muestra en su celular o en Google Wallet.",
      "La app reconoce sola el tipo de tarjeta y abre su detalle: estampillas, cashback, niveles o gift card.",
      "Registra el movimiento según el tipo (ver la sección 4) y confirma. El cambio se ve al instante en la tarjeta y en el panel."
    ]
  },
  {
    icon: "gift-outline",
    title: "3. Canjear recompensa",
    steps: [
      "Úsalo cuando el cliente quiere usar su premio o su saldo.",
      "Toca «Canjear recompensa» y escanea su QR. Arriba verás un aviso con lo que puede canjear.",
      "Si todavía no le alcanza (por ejemplo, le faltan sellos), el aviso te lo dice y no se registra nada."
    ]
  },
  {
    icon: "albums-outline",
    title: "4. Qué hacer con cada tarjeta",
    types: [
      { type: "STAMPS", icon: "star", name: "Estampillas", text: "Toca «Agregar estampillas» (de 1 a 5 por compra). Al completar la tarjeta, aparece «Canjear premio»." },
      { type: "CASHBACK", icon: "cash", name: "Cashback", text: "«Registrar compra»: escribe el monto en soles y se suma el % de cashback. «Usar saldo»: descuenta el saldo de la compra." },
      { type: "LEVELS", icon: "trophy", name: "Niveles", text: "Escribe el monto de la compra y se suman puntos. Al llegar a los puntos del siguiente nivel, el cliente sube solo." },
      { type: "GIFT_CARD", icon: "gift", name: "Gift card", text: "Escribe el monto a cobrar. Si no alcanza el saldo, la app te avisa y no cobra." }
    ]
  },
  {
    icon: "person-add-outline",
    title: "5. Registrar cliente nuevo",
    steps: [
      "Escanea su código: si todavía no es cliente, la app te dice «No encontramos esta tarjeta» y te ofrece «Registrar cliente nuevo».",
      "Escribe su nombre, celular y correo. El cumpleaños y el código de un amigo que lo invitó son opcionales.",
      "Elige el programa del local al que se une, léele el texto de uso de datos y marca la casilla solo si acepta.",
      "Al registrar, muéstrale el QR para que guarde su tarjeta en Google Wallet o envíaselo por WhatsApp. Si ya era cliente, la app te muestra su tarjeta.",
      "Toca «Registrar su primera visita» para sumarle su primer sello o compra."
    ]
  },
  {
    icon: "pricetag-outline",
    title: "6. Promociones",
    steps: [
      "Si el cliente tiene una promoción vigente, aparece arriba de las acciones de su tarjeta.",
      "Escribe el monto de la compra: la app te muestra el descuento y cuánto cobrar. Confirma para aplicarla.",
      "Cada promoción se puede usar una vez al día. Si te equivocas, anúlala en «Últimos movimientos»."
    ]
  },
  {
    icon: "people-outline",
    title: "7. Sin cámara",
    steps: [
      "Si la cámara no funciona, en Escanear toca «¿Sin cámara? Buscar cliente».",
      "Elige el tipo de tarjeta y luego al cliente de la lista (puedes buscarlo por nombre)."
    ]
  },
  {
    icon: "arrow-undo-outline",
    title: "8. Corregir un error",
    steps: [
      "Si registraste algo por error, en la tarjeta del cliente ve a «Últimos movimientos» y toca «Anular».",
      "Solo se pueden anular movimientos recientes (los primeros minutos)."
    ]
  },
  {
    icon: "lock-closed-outline",
    title: "9. Bloquear una tarjeta",
    steps: [
      "Si el cliente perdió su celular o ves un uso extraño, toca el candado arriba a la derecha de su tarjeta.",
      "Mientras esté bloqueada no se puede sumar ni canjear. Con el mismo candado la reactivas."
    ]
  },
  {
    icon: "time-outline",
    title: "10. Historial",
    steps: [
      "Muestra todo lo que se registró, del más reciente al más antiguo, con el ícono del tipo de tarjeta.",
      "Arriba eliges el local. En «Locales» ves solo ese local o todos; en «Tarjetas», todas, un tipo (por ejemplo, solo cashback) o una tarjeta.",
      "Toca un movimiento para abrir la tarjeta del cliente."
    ]
  },
  {
    icon: "people-outline",
    title: "11. Programa de referidos",
    steps: [
      "En Escanear toca «Programa de referidos». Ahí está el enlace y el QR de tu negocio para invitar a otros dueños a Fidegresa.",
      "Envíalo por WhatsApp o compártelo. Cuando el otro negocio se registra con él, aparece en la lista; al crear su primera tarjeta, figura «Con tarjeta»."
    ]
  },
  {
    icon: "help-circle-outline",
    title: "12. Problemas frecuentes",
    steps: [
      "«No encontramos esta tarjeta»: el QR no es de tu negocio o el cliente todavía no es parte del club. Regístralo con «Registrar cliente nuevo».",
      "«Sin conexión con el servidor»: revisa el internet. Si el servidor estuvo inactivo, el primer intento puede tardar hasta un minuto.",
      "«Elige tu local»: no se puede registrar nada hasta que elijas en qué local estás."
    ]
  }
];

export function ManualScreen() {
  const [open, setOpen] = useState(0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Cómo usar Fidegresa Caja</Text>
        <Text style={styles.introText}>Con esta app el staff suma y canjea beneficios de las tarjetas digitales de los clientes. Toca cada tema para ver los pasos.</Text>
      </View>

      {SECTIONS.map((section, index) => {
        const expanded = open === index;
        return (
          <View key={section.title} style={styles.section}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? -1 : index)}
              style={styles.sectionHeader}
            >
              <Ionicons name={section.icon} size={22} color={colors.coffee} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
            </Pressable>
            {expanded ? (
              <View style={styles.sectionBody}>
                {section.steps?.map(step => (
                  <View key={step} style={styles.step}>
                    <View style={styles.dot} />
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
                {section.types?.map(item => (
                  <View key={item.type} style={styles.typeRow}>
                    <View style={[styles.typeIcon, { backgroundColor: programColors[item.type] }]}>
                      <Ionicons name={item.icon} size={18} color={colors.white} />
                    </View>
                    <View style={styles.typeText}>
                      <Text style={styles.typeName}>{item.name}</Text>
                      <Text style={styles.stepText}>{item.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  intro: { gap: spacing.xs, marginBottom: spacing.sm },
  introTitle: { ...typography.title },
  introText: { ...typography.body, color: colors.muted },
  section: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  sectionTitle: { ...typography.subtitle, flex: 1 },
  sectionBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  step: { flexDirection: "row", gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.caramel, marginTop: 8 },
  stepText: { ...typography.body, flex: 1, lineHeight: 21 },
  typeRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  typeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  typeText: { flex: 1, gap: 2 },
  typeName: { ...typography.subtitle }
});
