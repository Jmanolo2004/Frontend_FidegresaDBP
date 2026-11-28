import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { FormField } from "../../components/common/FormField";
import { SubmitButton } from "../../components/common/SubmitButton";
import { useAuth } from "../../hooks/useAuth";
import { useForm } from "../../hooks/useForm";
import { useToast } from "../../hooks/useToast";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { BUSINESS_CATEGORIES, DISTRICT_NAMES } from "../../utils/constants";
import { findSubscriptionPlan, SUBSCRIPTION_PLANS } from "../../utils/subscriptionPlans";
import { email, maxLength, minLength, required, strongPassword } from "../../utils/validators";
import { businessReferralService, cleanReferralCode } from "../../services/businessReferralService";

const rules = {
  businessName: [required("Escribe el nombre de tu negocio."), maxLength(60, "Usa hasta 60 caracteres.")],
  category: [required("Elige el tipo de negocio.")],
  district: [required("Elige el distrito de tu local.")],
  address: [maxLength(100, "Usa hasta 100 caracteres.")],
  firstName: [required("Escribe tu nombre.")],
  lastName: [required("Escribe tu apellido.")],
  email: [required("Escribe tu correo electrónico."), email()],
  password: [required("Crea una contraseña."), minLength(8, "Usa al menos 8 caracteres."), strongPassword()],
  confirmPassword: [required("Repite tu contraseña."), (value, values) => (value === values.password ? "" : "Las contraseñas no coinciden.")],
  acceptTerms: [value => (value ? "" : "Debes aceptar los términos para crear tu cuenta.")]
};

const initialValues = {
  businessName: "",
  category: "",
  district: "",
  address: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false
};

export default function RegisterPage() {
  useDocumentTitle("Crear cuenta");
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const selectedPlan = findSubscriptionPlan(query.get("plan"));
  // Invitación de otro negocio (/unete/CÓDIGO): el código va en el registro para que cuente en sus referidos.
  const referralCode = cleanReferralCode(query.get("ref")) || businessReferralService.remembered();

  const form = useForm({
    initialValues: { ...initialValues, planId: selectedPlan?.id || "", simulatedPaymentConfirmed: false },
    rules: {
      ...rules,
      planId: [value => (findSubscriptionPlan(value) ? "" : "Selecciona un plan.")],
      simulatedPaymentConfirmed: [value => (value ? "" : "Confirma el pago simulado para continuar.")]
    },
    onSubmit: async (values, { setErrors }) => {
      try {
        const result = await register({
          businessName: values.businessName.trim(),
          category: values.category,
          district: values.district,
          address: values.address.trim(),
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          password: values.password,
          planId: values.planId,
          simulatedPaymentConfirmed: values.simulatedPaymentConfirmed,
          ...(referralCode ? { referralCode } : {})
        });
        businessReferralService.forget();
        if (result.locationNotCreated) {
          navigate("/panel/ubicaciones", { replace: true, state: { registrationLimit: true } });
        } else {
          showToast(`¡Listo! ${values.businessName.trim()} ya tiene su programa de fidelización. No se realizó ningún cobro.`);
          navigate("/panel/metricas", { replace: true });
        }
      } catch (error) {
        if (error.status === 409) setErrors({ email: "Ya existe una cuenta con este correo. Inicia sesión o usa otro correo." });
        else setErrors({ form: error.message });
      }
    }
  });

  const field = name => form.getFieldProps(name);

  return (
    <AuthLayout variant="register">
      <h1>Crea tu cuenta</h1>
      <p className="auth-intro">Cuéntanos de tu negocio y prepara tu programa de fidelización.</p>
      {referralCode ? (
        <p className="auth-referral">
          Te registras con la invitación <strong>{referralCode}</strong>.
        </p>
      ) : null}
      {form.errors.form && (
        <p className="form-alert" role="alert">
          {form.errors.form}
        </p>
      )}
      <form className="auth-form register-form" onSubmit={form.handleSubmit} noValidate>
        <FormField label="Nombre del negocio" error={form.errors.businessName} variant="auth">
          <input autoComplete="organization" placeholder="Ej. Café de la Plaza" maxLength={60} {...field("businessName")} />
        </FormField>
        <div className="form-pair">
          <FormField label="Tipo de negocio" error={form.errors.category} variant="auth">
            <select {...field("category")}>
              <option value="" disabled>
                Elige una
              </option>
              {BUSINESS_CATEGORIES.map(category => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Distrito del local" error={form.errors.district} variant="auth">
            <select {...field("district")}>
              <option value="" disabled>
                Elige uno
              </option>
              {DISTRICT_NAMES.map(district => (
                <option key={district}>{district}</option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label="Dirección o referencia" error={form.errors.address} optional variant="auth">
          <input autoComplete="street-address" placeholder="Ej. Av. José Larco 812" maxLength={100} {...field("address")} />
        </FormField>
        <div className="form-pair">
          <FormField label="Nombre del dueño" error={form.errors.firstName} variant="auth">
            <input autoComplete="given-name" placeholder="Nombre" maxLength={50} {...field("firstName")} />
          </FormField>
          <FormField label="Apellido del dueño" error={form.errors.lastName} variant="auth">
            <input autoComplete="family-name" placeholder="Apellido" maxLength={50} {...field("lastName")} />
          </FormField>
        </div>
        <FormField label="Correo personal o corporativo" error={form.errors.email} variant="auth">
          <input type="email" autoComplete="email" placeholder="tu@negocio.com" maxLength={120} {...field("email")} />
        </FormField>
        <div className="form-pair">
          <FormField label="Contraseña" error={form.errors.password} hint="Mínimo 8 caracteres, con letras y números." variant="auth">
            <PasswordInput autoComplete="new-password" placeholder="Crea una contraseña" {...field("password")} />
          </FormField>
          <FormField label="Confirmar contraseña" error={form.errors.confirmPassword} variant="auth">
            <PasswordInput autoComplete="new-password" placeholder="Repite tu contraseña" {...field("confirmPassword")} />
          </FormField>
        </div>
        {(
          <>
            <FormField label="Plan" error={form.errors.planId} variant="auth">
              <select {...field("planId")}>
                <option value="">Selecciona un plan</option>
                {SUBSCRIPTION_PLANS.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · hasta {plan.maxLocations} locales · S/ {plan.price}/mes</option>)}
              </select>
            </FormField>
            <p className="form-alert info">El pago es simulado: no se pedirán datos de tarjeta ni se realizará ningún cobro real.</p>
            <label className="terms-check">
              <input type="checkbox" name="simulatedPaymentConfirmed" checked={form.values.simulatedPaymentConfirmed} onChange={form.handleChange} aria-invalid={form.errors.simulatedPaymentConfirmed ? "true" : undefined} />
              <span>Confirmo el pago simulado del plan seleccionado.</span>
            </label>
            {form.errors.simulatedPaymentConfirmed && <small className="field-error" role="alert">{form.errors.simulatedPaymentConfirmed}</small>}
          </>
        )}
        <label className="terms-check">
          <input type="checkbox" name="acceptTerms" checked={form.values.acceptTerms} onChange={form.handleChange} aria-invalid={form.errors.acceptTerms ? "true" : undefined} />
          <span>
            Acepto los <Link to="/terminos">términos y condiciones</Link> y la <Link to="/privacidad">política de privacidad</Link>.
          </span>
        </label>
        {form.errors.acceptTerms && (
          <small className="field-error" role="alert">
            {form.errors.acceptTerms}
          </small>
        )}
        <SubmitButton loading={form.isSubmitting} loadingText="Creando tu cuenta…">
          Crear cuenta
        </SubmitButton>
      </form>
      <p className="auth-switch">
        ¿Ya tienes cuenta?{" "}
        <Link className="link-button" to="/login" state={location.state}>
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
