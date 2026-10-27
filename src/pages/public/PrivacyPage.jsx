import { LegalLayout } from "../../components/public/LegalLayout";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const SECTIONS = [
  { title: "1. Información que tratamos", body: "Para operar el programa tratamos los datos de la cuenta del negocio (nombre, correo y teléfono) y, por encargo del negocio, los datos de sus clientes: nombre, correo, teléfono, visitas, compras registradas con la tarjeta y reseñas." },
  { title: "2. Finalidad", body: "Usamos la información para registrar visitas y recompensas, mostrar métricas al negocio, responder reseñas y enviar avisos relacionados con el programa. No vendemos datos personales a terceros." },
  { title: "3. Ubicación", body: "La geolocalización del panel trabaja con la ubicación de los locales y con el distrito declarado por cada cliente. Fidegresa no rastrea la ubicación en tiempo real de las personas desde la web." },
  { title: "4. Seguridad de la sesión", body: "El acceso al panel usa tokens de sesión con vencimiento. Las contraseñas nunca se muestran ni se guardan en el navegador, y las comunicaciones con el servidor se realizan mediante HTTPS." },
  { title: "5. Tus derechos", body: "Conforme a la Ley N° 29733, Ley de Protección de Datos Personales, puedes solicitar el acceso, rectificación, cancelación u oposición al tratamiento de tus datos escribiéndonos." },
  {
    title: "6. Contacto",
    body: (
      <>
        Para consultas sobre privacidad, escríbenos a <a href="mailto:contacto@fidegresa.com">contacto@fidegresa.com</a>.
      </>
    )
  }
];

export default function PrivacyPage() {
  useDocumentTitle("Política de privacidad");
  return (
    <LegalLayout
      kicker="Tus datos, con claridad"
      title="Política de privacidad"
      lead="Aquí explicamos qué información usa Fidegresa, para qué la usa y cómo puedes ejercer tus derechos."
      sections={SECTIONS}
    />
  );
}
