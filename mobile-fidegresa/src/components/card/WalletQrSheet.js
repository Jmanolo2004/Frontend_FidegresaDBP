import { Linking, Modal, Pressable, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../AppButton";
import { colors, radius, spacing, typography } from "../../utils/theme";

/**
 * QR para que el cliente guarde su tarjeta en Google Wallet desde su celular: lo escanea con la cámara
 * y se abre "Guardar en Google Wallet". También se puede enviar el enlace por WhatsApp o compartirlo.
 */
export function WalletQrSheet({ visible, url, customerName, phone, businessName, onClose }) {
  const firstName = (customerName ?? "").trim().split(/\s+/)[0] || "Hola";
  const message = `${firstName}, guarda tu tarjeta de ${businessName || "fidelidad"} en Google Wallet: ${url}`;
  const digits = String(phone ?? "").replace(/\D/g, "").replace(/^51(?=9\d{8}$)/, "");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar">
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title}>Guardar en Google Wallet</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.espresso} />
            </Pressable>
          </View>
          {url ? (
            <>
              <Text style={styles.text}>Pide al cliente que escanee este código con la cámara de su celular Android.</Text>
              <View style={styles.qr} accessibilityLabel="Código QR para guardar la tarjeta en Google Wallet">
                <QRCode value={url} size={220} color={colors.espresso} backgroundColor={colors.white} ecl="M" />
              </View>
              {digits.length === 9 ? (
                <AppButton
                  label="Enviar por WhatsApp"
                  icon="logo-whatsapp"
                  variant="accent"
                  onPress={() => Linking.openURL(`https://wa.me/51${digits}?text=${encodeURIComponent(message)}`).catch(() => {})}
                />
              ) : null}
              <AppButton label="Compartir enlace" icon="share-outline" variant="secondary" onPress={() => Share.share({ message }).catch(() => {})} />
            </>
          ) : (
            <Text style={styles.text}>
              Google Wallet todavía no está configurado en el servidor. El cliente puede usar su tarjeta igual: búscala por su nombre en caja.
            </Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: typography.title,
  text: { ...typography.body, color: colors.muted, lineHeight: 21 },
  qr: { alignSelf: "center", padding: spacing.md, backgroundColor: colors.white, borderRadius: radius.md, marginVertical: spacing.sm }
});
