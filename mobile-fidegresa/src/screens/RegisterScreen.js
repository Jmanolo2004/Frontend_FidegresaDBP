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
import { colors, programColors, radius, spacing, typography } from "../utils/theme";

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
        <LoyaltyCardView card={card} color={result.programColor} branchName={options.data?.branchName ?? ""} />
        {card.display?.progressText ? <Text style={styles.progress}>{card.display.progressText}</Text> : null}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Que guarde su tarjeta</Text>
          <Text style={styles.muted}>
            Muéstrale el QR para guardarla en Google Wallet o envíaselo por WhatsApp. En caja también la encuentras escaneando su pase o
            buscando su nombre.
          </Text>
          <AppButton label="Mostrar QR de Google Wallet" icon="qr-code-outline" variant="accent" onPress={() => setWalletOpen(true)} />
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
          <Text style={styles.muted}>Elige tu local para registrar al cliente en él.</Text>
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
        <Text style={styles.muted}>Se registra en {options.data?.branchName || selectedBranch.name}. Pídele sus datos y que acepte el uso de ellos.</Text>

        <TextField label="Nombre y apellido" value={form.fullName} onChangeText={change("fullName")} error={errors.fullName} autoCapitalize="words" placeholder="Rosa Díaz" />
        <TextField label="Celular" prefix="+51" value={form.phone} onChangeText={change("phone")} error={errors.phone} keyboardType="phone-pad" placeholder="987 654 321" maxLength={15} />
        <TextField label="Correo" value={form.email} onChangeText={change("email")} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="rosa@correo.com" />
        <TextField label="Cumpleaños (opcional)" value={form.birthday} onChangeText={change("birthday")} error={errors.birthday} hint="Día/mes, por ejemplo 25/12. Para su saludo de cumpleaños." keyboardType="numbers-and-punctuation" placeholder="25/12" maxLength={5} />

        <View style={styles.block}>
          <Text style={styles.label}>Programa</Text>
          {programs.length === 0 ? (
            <Text style={styles.muted}>Este local no tiene programas activos de estampillas, cashback o niveles. Créalos en el panel.</Text>
          ) : (
            <View style={styles.programs}>
              {programs.map(program => {
                const selected = program.id === chosenId;
                const color = program.color ?? programColors[APP_TYPES[program.type]] ?? colors.coffee;
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
                    style={[styles.program, selected && { borderColor: color, backgroundColor: colors.paper }]}
                  >
                    <View style={[styles.programIcon, { backgroundColor: color }]}>
                      <Ionicons name={TYPE_ICONS[program.type] ?? "card"} size={18} color={colors.white} />
                    </View>
                    <View style={styles.programText}>
                      <Text style={styles.programName}>{program.name}</Text>
                      <Text style={styles.programType}>{TYPE_LABELS[program.type] ?? program.type}</Text>
                    </View>
                    <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={selected ? color : colors.muted} />
                  </Pressable>
                );
              })}
            </View>
          )}
          {errors.program ? <Text style={styles.error}>{errors.program}</Text> : null}
        </View>

        <TextField label="Código de invitación (opcional)" value={form.referralCode} onChangeText={change("referralCode")} hint="Si un amigo lo invitó, los dos ganan un premio en su primera compra." autoCapitalize="characters" autoCorrect={false} placeholder="LUCIA23" maxLength={20} />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          onPress={() => {
            setConsent(value => !value);
            setErrors(current => ({ ...current, consent: null }));
          }}
          style={[styles.consent, errors.consent && styles.consentError]}
        >
          <Ionicons name={consent ? "checkbox" : "square-outline"} size={24} color={consent ? colors.success : colors.muted} />
          <Text style={styles.consentText}>{options.data?.consentText || "El cliente acepta el uso de sus datos para su tarjeta de fidelización."}</Text>
        </Pressable>
        {errors.consent ? <Text style={styles.error}>{errors.consent}</Text> : null}

        <AppButton label="Registrar y entregar tarjeta" icon="person-add-outline" onPress={submit} loading={saving} disabled={programs.length === 0} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  branchOnly: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.espresso },
  muted: { ...typography.body, color: colors.muted, lineHeight: 21 },
  label: { ...typography.label, color: colors.coffee },
  block: { gap: spacing.sm },
  programs: { gap: spacing.sm },
  program: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white },
  programIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  programText: { flex: 1 },
  programName: { ...typography.subtitle },
  programType: { ...typography.caption },
  consent: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  consentError: { borderColor: colors.danger },
  consentText: { ...typography.body, flex: 1, fontSize: 14, lineHeight: 20, color: colors.ink },
  error: { fontSize: 13, color: colors.danger, fontWeight: "600" },
  progress: { ...typography.body, fontWeight: "600", textAlign: "center" },
  box: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md },
  boxTitle: typography.subtitle
});
