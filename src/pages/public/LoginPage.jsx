import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { SocialAuthButtons } from "../../components/auth/SocialAuthButtons";
import { useSocialLogin } from "../../components/auth/useSocialLogin";
import { FormField } from "../../components/common/FormField";
import { SubmitButton } from "../../components/common/SubmitButton";
import { useAuth } from "../../hooks/useAuth";
import { useForm } from "../../hooks/useForm";
import { useToast } from "../../hooks/useToast";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { email, required } from "../../utils/validators";
import { USE_MOCK } from "../../api/apiClient";

const DEMO_ACCOUNT = { email: "maria@fidegresa.com", password: "Fidegresa2026" };

const rules = {
  email: [required("Escribe tu correo electrónico."), email()],
  password: [required("Escribe tu contraseña.")]
};

export default function LoginPage() {
  useDocumentTitle("Iniciar sesión");
  const { login, sessionExpired } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/panel/metricas";
  const social = useSocialLogin(redirectTo);

  const form = useForm({
    initialValues: { email: "", password: "" },
    rules,
    onSubmit: async (values, { setErrors }) => {
      try {
        const profile = await login({ email: values.email.trim(), password: values.password });
        showToast(`Bienvenida de vuelta, ${profile.fullName.split(" ")[0]}.`);
        navigate(redirectTo, { replace: true });
      } catch (error) {
        if (error.isNetworkError) {
          navigate("/sin-conexion");
          return;
        }
        if (error.status === 401) setErrors({ form: "Correo o contraseña incorrectos. Revisa tus datos e inténtalo otra vez." });
        else if (error.status === 400) setErrors({ form: error.message });
        else setErrors({ form: error.message });
      }
    }
  });

  const useDemoAccount = () => {
    form.setFieldValue("email", DEMO_ACCOUNT.email);
    form.setFieldValue("password", DEMO_ACCOUNT.password);
  };

  return (
    <AuthLayout variant="login">
      <p className="eyebrow">Tu negocio, más cerca</p>
      <h1>Bienvenido de vuelta</h1>
      <p className="auth-intro">Ingresa tus datos para volver a tu espacio de fidelización.</p>
      {sessionExpired && !form.errors.form && (
        <p className="form-alert info" role="status">
          Tu sesión expiró por seguridad. Vuelve a iniciar sesión.
        </p>
      )}
      {form.errors.form && (
        <p className="form-alert" role="alert">
          {form.errors.form}
        </p>
      )}
      <form className="auth-form" onSubmit={form.handleSubmit} noValidate>
        <FormField label="Correo electrónico" error={form.errors.email} variant="auth">
          <input type="email" autoComplete="email" placeholder="tu@negocio.com" maxLength={120} {...form.getFieldProps("email")} />
        </FormField>
        <FormField label="Contraseña" error={form.errors.password} variant="auth">
          <PasswordInput autoComplete="current-password" placeholder="Ingresa tu contraseña" {...form.getFieldProps("password")} />
        </FormField>
        <SubmitButton loading={form.isSubmitting} loadingText="Ingresando…" disabled={Boolean(social.loadingProvider)}>
          Iniciar sesión
        </SubmitButton>
      </form>
      <SocialAuthButtons onSelect={social.continueWith} loadingProvider={social.loadingProvider} disabled={form.isSubmitting} />
      <p className="auth-switch">
        ¿Aún no tienes cuenta?{" "}
        <Link className="link-button" to="/registro" state={location.state}>
          Crear cuenta
        </Link>
      </p>
      <Link className="connection-link" to="/sin-conexion">
        ¿Problemas para conectarte?
      </Link>
      {USE_MOCK && (
        <p className="prototype-note">
          Modo demostración · cuenta de prueba {DEMO_ACCOUNT.email} ·{" "}
          <button type="button" className="inline-link" onClick={useDemoAccount}>
            Usar cuenta demo
          </button>
        </p>
      )}
    </AuthLayout>
  );
}
