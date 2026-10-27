import { LegalLayout } from "../../components/public/LegalLayout";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const SECTIONS = [
  { title: "1. Alcance del programa", body: "Fidegresa es una plataforma para que cada negocio participante configure beneficios digitales y comunique sus reglas a sus clientes. El negocio que crea una tarjeta es responsable de definir la recompensa, las condiciones para obtenerla y la forma de canjearla." },
  { title: "2. Tipos de tarjeta y recompensas", body: "El programa puede incluir tarjetas de estampillas, cashback, niveles de recompensa y gift cards con saldo de regalo, según el plan contratado. Cada tarjeta debe indicar con claridad su vigencia, límites, exclusiones y condiciones de canje." },
  { title: "3. Participación de los clientes", body: "Los clientes participan de acuerdo con las condiciones publicadas para cada programa. Las recompensas son ofrecidas por el negocio que las anuncia; salvo que se informe expresamente lo contrario, no son dinero en efectivo ni pueden transferirse o combinarse con otras promociones." },
  { title: "4. Responsabilidades del negocio", body: "El negocio debe mantener actualizada la información de sus locales y tarjetas, explicar las reglas antes de la participación y respetar los beneficios válidamente obtenidos. También debe atender consultas o reclamos relacionados con sus productos, servicios y promociones." },
  { title: "5. Planes y precios", body: "Los planes se expresan en soles e incluyen IGV. Antes de cualquier cobro se informará el precio aplicable, la periodicidad y las condiciones de cancelación. El plan Esencial no tiene costo." },
  { title: "6. Uso responsable y cambios", body: "El panel debe utilizarse de forma lícita y respetuosa, sin manipular los registros de visitas ni presentar beneficios de manera engañosa. Cualquier cambio material en las reglas o condiciones se comunicará de forma clara a los negocios y usuarios afectados." },
  {
    title: "7. Consultas y reclamos",
    body: (
      <>
        Para consultas sobre Fidegresa, puedes escribir a <a href="mailto:contacto@fidegresa.com">contacto@fidegresa.com</a>. Los reclamos sobre una recompensa específica deben dirigirse también al negocio que la ofrece.
      </>
    )
  }
];

export default function TermsPage() {
  useDocumentTitle("Términos y condiciones");
  return (
    <LegalLayout
      kicker="Programa de fidelización"
      title="Términos y condiciones"
      lead="Estas condiciones describen, en lenguaje sencillo, cómo funcionan los programas de fidelización creados con Fidegresa."
      sections={SECTIONS}
    />
  );
}
