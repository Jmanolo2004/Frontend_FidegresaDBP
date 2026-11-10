import qrImage from "../../assets/illustrative-qr.png";

/** Imagen de QR de muestra para la tarjeta ilustrativa. */
export function SampleCode() {
  return (
    <img className="sample-code" src={qrImage} alt="Código QR ilustrativo de Fidegresa" />
  );
}
