import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../components/AppButton";
import { TextField } from "../components/TextField";
import { BranchBar } from "../components/BranchBar";
import { LoyaltyCardView } from "../components/card/LoyaltyCardView";
import { WalletQrSheet } from "../components/card/WalletQrSheet";
import { ErrorView, LoadingView } from "../components/StateViews";
import { useAsync } from "../hooks/useAsync";
import { useBranch } from "../hooks/useBranch";
import { useToast } from "../hooks/useToast";
import { getRegistrationOptions, registerCustomer } from "../services/cardService";
import { colors, fonts, programColors, radius, readableOn, spacing, typography } from "../utils/theme";

const TYPE_LABELS = { Estampillas: "Estampillas", Cashback: "Cashback", Niveles: "Niveles" };
const TYPE_ICONS = { Estampillas: "star", Cashback: "cash", Niveles: "trophy" };
const APP_TYPES = { Estampillas: "STAMPS", Cashback: "CASHBACK", Niveles: "LEVELS" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMPTY_FORM = { fullName: "", phone: "", email: "", birthday: "", referralCode: "" };

/** Validación en el celular (el backend vuelve a validar todo). */
function validate(form, programId, consent) {
  const errors = {};
  if (form.fullName.trim().length < 2) errors.fullName = "Escribe el nombre del cliente.";
  const digits = form.phone.replace(/\D/g, "").replace(/^51(?=9\d{8}$)/, "");
  if (!/^9\d{8}$/.test(digits)) errors.phone = "Escribe un celular de 9 dígitos que empiece con 9.";
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Escribe un correo válido.";
  if (form.birthday.trim() && !/^(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])$/.test(form.birthday.trim())) {
    errors.birthday = "Escríbelo como día/mes, por ejemplo 25/12.";
  }
  if (!programId) errors.program = "Elige el programa al que se une.";
  if (!consent) errors.consent = "El cliente debe aceptar el uso de sus datos.";
  return errors;
}

/** Registro de un cliente nuevo en caja: sus datos, el programa del local y su consentimiento. Al final, su tarjeta y el QR para Google Wallet. */
export function RegisterScreen() {
  const { selectedBranch } = useBranch();
  const toast = useToast();
  const options = useAsync(
    ({ signal }) => (selectedBranch ? getRegistrationOptions(selectedBranch.id, { signal }) : Promise.resolve(null)),
    `register-${selectedBranch?.id ?? "none"}`
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [programId, setProgramId] = useState(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [walletOpen, setWalletOpen] = useState(false);

  const programs = options.data?.programs ?? [];
  const chosenId = programId ?? (programs.length === 1 ? programs[0].id : null);
  const chosen = programs.find(program => program.id === chosenId) ?? null;

  const change = field => value => {
    setForm(current => ({ ...current, [field]: value }));
    if (errors[field]) setErrors(current => ({ ...current, [field]: null }));
  };

  const submit = async () => {
    const found = validate(form, chosenId, consent);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    setSaving(true);
    try {
      const response = await registerCustomer({
        branchId: selectedBranch.id,
        programId: chosenId,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone,
        birthday: form.birthday.trim(),
        consent,
        referralCode: form.referralCode.trim()
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult({ ...response, phone: form.phone, programColor: chosen?.color ?? null });
      toast.success(response.alreadyRegistered ? "Ya era cliente: esta es su tarjeta." : "Cliente registrado. Su tarjeta ya está activa.");
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setConsent(false);
    setErrors({});
    setResult(null);
  };

  if (result) {
    const { card } = result;
    return (
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: result.alreadyRegistered ? "Ya era cliente" : "¡Cliente registrado!" }} />
        <View style={styles.resultHead}>
          <View style={styles.resultBadge}>
            <Ionicons name={result.alreadyRegistered ? "person" : "checkmark"} size={22} color={colors.white} />
          </View>
          <Text style={styles.resultTitle}>{result.alreadyRegistered ? `${card.customer.fullName.split(" ")[0]} ya era parte del club` : `¡${card.customer.fullName.split(" ")[0]} ya es parte del club!`}</Text>
        </View>
        <LoyaltyCardView card={card} color={result.programColor} branchName={options.data?.branchName ?? ""} />
        {card.display?.progressText ? <Text style={styles.progress}>{card.display.progressText}</Text> : null}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Que guarde su tarjeta</Text>
          <Text style={styles.onDarkText}>
            Muéstrale el QR para guardarla en Google Wallet o envíaselo por WhatsApp. En caja también la encuentras escaneando su pase o
            buscando su nombre.
          </Text>
          <AppButton label="Mostrar QR de Google Wallet" icon="qr-code-outline" variant="light" onPress={() => setWalletOpen(true)} />
        </View>
        <AppButton
          label="Registrar su primera visita"
          icon="add-circle-outline"
          onPress={() => router.replace({ pathname: "/card/[qrToken]", params: { qrToken: card.qrToken, mode: "card" } })}
        />
        <AppButton label="Registrar otro cliente" icon="person-add-outline" variant="secondary" onPress={reset} />
        <WalletQrSheet
          visible={walletOpen}
          url={result.walletSaveUrl}
          customerName={card.customer.fullName}
          phone={result.phone}
          businessName={options.data?.branchName ?? ""}
          onClose={() => setWalletOpen(false)}
        />
      </ScrollView>
    );
  }

  if (!selectedBranch) {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={{ title: "Nuevo cliente" }} />
        <View style={styles.branchOnly}>
          <Text style={styles.onDarkText}>Elige tu local para registrar al cliente en él.</Text>
          <BranchBar />
        </View>
      </View>
    );
  }
  if (options.loading && !options.data) return <LoadingView message="Cargando los programas del local…" />;
  if (options.error) return <ErrorView title="No pudimos cargar los programas" error={options.error} onRetry={options.reload} />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: "Nuevo cliente" }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Ionicons name="storefront" size={18} color={colors.caramel} />
          <Text style={styles.introText}>
            Se registra en <Text style={styles.introStrong}>{options.data?.branchName || selectedBranch.name}</Text>. Pídele sus datos y que acepte el uso de ellos.
          </Text>
        </View>

        <Step number={1} title="Sus datos">
          <TextField label="Nombre y apellido" value={form.fullName} onChangeText={change("fullName")} error={errors.fullName} autoCapitalize="words" placeholder="Rosa Díaz" />
          <TextField label="Celular" prefix="+51" value={form.phone} onChangeText={change("phone")} error={errors.phone} keyboardType="phone-pad" placeholder="987 654 321" maxLength={15} />
          <TextField label="Correo" value={form.email} onChangeText={change("email")} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="rosa@correo.com" />
          <TextField label="Cumpleaños (opcional)" value={form.birthday} onChangeText={change("birthday")} error={errors.birthday} hint="Día/mes, por ejemplo 25/12. Para su saludo de cumpleaños." keyboardType="numbers-and-punctuation" placeholder="25/12" maxLength={5} />
        </Step>

        <Step number={2} title="Su tarjeta">
          {programs.length === 0 ? (
            <Text style={styles.muted}>Este local no tiene programas activos de estampillas, cashback o niveles. Créalos en el panel.</Text>
          ) : (
            <View style={styles.programs}>
              {programs.map(program => {
                const selected = program.id === chosenId;
                const color = program.color ?? programColors[APP_TYPES[program.type]] ?? colors.coffee;
                const ink = readableOn(color);
                return (
                  <Pressable
                    key={program.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${program.name}, ${TYPE_LABELS[program.type] ?? program.type}`}
                    onPress={() => {
                      setProgramId(program.id);
                      setErrors(current => ({ ...current, program: null }));
                    }}
                    style={({ pressed }) => [styles.program, { backgroundColor: color }, selected ? styles.programSelected : styles.programIdle, pressed && { opacity: 0.9 }]}
                  >
                    <View style={styles.programIcon}>
                      <Ionicons name={TYPE_ICONS[program.type] ?? "card"} size={18} color={color} />
                    </View>
                    <View style={styles.programText}>
                      <Text style={[styles.programType, { color: ink }]}>{TYPE_LABELS[program.type] ?? program.type}</Text>
                      <Text style={[styles.programName, { color: ink }]} numberOfLines={2}>
                        {program.name}
                      </Text>
                    </View>
                    <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={26} color={ink} />
                  </Pressable>
                );
              })}
            </View>
          )}
          {errors.program ? <Text style={styles.error}>{errors.program}</Text> : null}
          <TextField label="Código de invitación (opcional)" value={form.referralCode} onChangeText={change("referralCode")} hint="Si un amigo lo invitó, los dos ganan un premio en su primera compra." autoCapitalize="characters" autoCorrect={false} placeholder="LUCIA23" maxLength={20} />
        </Step>

        <Step number={3} title="Su permiso">
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            onPress={() => {
              setConsent(value => !value);
              setErrors(current => ({ ...current, consent: null }));
            }}
            style={[styles.consent, consent && styles.consentOn, errors.consent && styles.consentError]}
          >
            <Ionicons name={consent ? "checkbox" : "square-outline"} size={24} color={consent ? colors.success : colors.muted} />
            <Text style={styles.consentText}>{options.data?.consentText || "El cliente acepta el uso de sus datos para su tarjeta de fidelización."}</Text>
          </Pressable>
          {errors.consent ? <Text style={styles.error}>{errors.consent}</Text> : null}
        </Step>

        <AppButton label="Registrar y entregar tarjeta" icon="person-add-outline" variant="accent" onPress={submit} loading={saving} disabled={programs.length === 0} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Paso numerado, como los de la sección "cómo funciona" de la landing. */
function Step({ number, title, children }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHead}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{number}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      <View style={styles.stepBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  branchOnly: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.espresso },
  muted: { ...typography.body, color: colors.muted },
  onDarkText: { ...typography.body, color: colors.onDarkSoft },
  intro: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", backgroundColor: colors.espresso, borderRadius: radius.lg, padding: spacing.lg },
  introText: { ...typography.body, flex: 1, color: colors.onDarkSoft },
  introStrong: { fontFamily: fonts.bold, color: colors.onDark },
  step: { gap: spacing.md },
  stepHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 2, borderBottomColor: colors.ink },
  stepNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.caramel, alignItems: "center", justifyContent: "center" },
  stepNumberText: { fontFamily: fonts.display, fontSize: 16, color: colors.espresso },
  stepTitle: { ...typography.title, fontSize: 23 },
  stepBody: { gap: spacing.lg },
  programs: { gap: spacing.sm },
  program: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 3 },
  programIdle: { borderColor: "transparent", opacity: 0.72 },
  programSelected: { borderColor: colors.espresso },
  programIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  programText: { flex: 1, gap: 1 },
  programName: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22 },
  programType: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.9, textTransform: "uppercase", opacity: 0.8 },
  consent: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.paper },
  consentOn: { borderColor: colors.success, backgroundColor: colors.successSoft },
  consentError: { borderColor: colors.danger },
  consentText: { ...typography.body, flex: 1, fontSize: 14, lineHeight: 20 },
  error: { fontSize: 13, color: colors.danger, fontFamily: fonts.semibold },
  resultHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  resultBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  resultTitle: { ...typography.display, flex: 1, fontSize: 26, lineHeight: 30 },
  progress: { fontFamily: fonts.display, fontSize: 17, color: colors.ink, textAlign: "center" },
  box: { backgroundColor: colors.espresso, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  boxTitle: { ...typography.title, color: colors.caramel }
});
