import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../components/AppButton";
import { TextField } from "../components/TextField";
import { useAuth } from "../hooks/useAuth";
import { validateLogin } from "../utils/validation";
import { colors, radius, spacing, typography } from "../utils/theme";

export function LoginScreen() {
  const { signIn, sessionExpired } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef(null);

  const updateField = (field, value) => {
    setForm(previous => ({ ...previous, [field]: value }));
    if (errors[field]) setErrors(previous => ({ ...previous, [field]: undefined }));
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await signIn(form);
    } catch (error) {
      setSubmitError(error.status === 401 || error.status === 400 ? "Correo o contraseña incorrectos." : error.message);
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="cafe" size={30} color={colors.caramel} />
            </View>
            <Text style={styles.brandName}>Fidegresa</Text>
            <Text style={styles.brandTag}>Caja · Escanea y registra visitas</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Inicia sesión</Text>
            <Text style={styles.subtitle}>Usa la misma cuenta del panel de tu negocio.</Text>

            {sessionExpired ? (
              <View style={styles.notice}>
                <Ionicons name="time-outline" size={18} color={colors.warning} />
                <Text style={styles.noticeText}>Tu sesión expiró. Vuelve a ingresar.</Text>
              </View>
            ) : null}

            <TextField
              label="Correo"
              value={form.email}
              onChangeText={value => updateField("email", value)}
              placeholder="tucorreo@negocio.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={errors.email}
              editable={!submitting}
            />
            <TextField
              ref={passwordRef}
              label="Contraseña"
              value={form.password}
              onChangeText={value => updateField("password", value)}
              placeholder="Tu contraseña"
              secure
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              error={errors.password}
              editable={!submitting}
            />

            {submitError ? (
              <View style={[styles.notice, styles.noticeError]} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <Text style={[styles.noticeText, { color: colors.danger }]}>{submitError}</Text>
              </View>
            ) : null}

            <AppButton label="Ingresar" icon="log-in-outline" onPress={handleSubmit} loading={submitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.espresso },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.xxl },
  brand: { alignItems: "center", gap: spacing.sm },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  brandName: { ...typography.display, color: colors.cream },
  brandTag: { fontSize: 14, color: colors.kraft },
  card: { backgroundColor: colors.cream, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  title: typography.title,
  subtitle: { ...typography.body, color: colors.muted, marginTop: -spacing.sm },
  notice: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.warningSoft, padding: spacing.md, borderRadius: radius.md },
  noticeError: { backgroundColor: colors.dangerSoft },
  noticeText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.warning }
});
