export const AUDIENCES = ["Cafeterías", "Barberías", "Panaderías", "Restaurantes", "Heladerías", "Confiterías", "Florerías"];

export const STORY_STEPS = [
  { title: "Diseña tu tarjeta", text: "Eliges cuántas visitas pide el premio, tus colores y tu logo. Queda lista en minutos." },
  { title: "Cada visita suma un sello", text: "Tu cliente muestra su código en caja y tu equipo registra la visita desde el celular." },
  { title: "El premio llega solo", text: "Al completar la tarjeta, tu cliente ve su recompensa y tú sabes quién volvió." }
];

export const CARD_TYPES = [
  {
    id: "stamps",
    label: "Estampillas",
    text: "Cada visita suma un sello. Al completar la tarjeta, tu cliente recibe su premio.",
    card: { tipo: "Estampillas", negocio: "Café de la Plaza", nombre: "Un café con cariño", descripcion: "Cada visita te acerca a una recompensa.", premio: "Tu décimo café va por la casa", color: "#603f2a", colorAcento: "#e08e3f", estampillas: 10 },
    stamps: 7
  },
  {
    id: "cashback",
    label: "Cashback",
    text: "Devuelves un porcentaje de cada compra como saldo para la próxima visita.",
    card: { tipo: "Cashback", negocio: "La Mesa Alegre", nombre: "La Mesa te premia", descripcion: "Recibe saldo en cada compra.", premio: "Saldo para tu próxima visita", color: "#2f6b57", colorAcento: "#d8b98c", porcentaje: 5 }
  },
  {
    id: "levels",
    label: "Niveles",
    text: "Quien más te visita sube de nivel y desbloquea mejores beneficios.",
    card: { tipo: "Niveles", negocio: "Barbería Norte", nombre: "Club Norte", descripcion: "Mientras más vuelves, más ganas.", premio: "Corte gratis en nivel Oro", color: "#35404a", colorAcento: "#e08e3f", niveles: 3 }
  },
  {
    id: "gift",
    label: "Gift card",
    text: "Tus clientes regalan saldo para usar en tu negocio y traen a alguien nuevo.",
    card: { tipo: "Giftcard", negocio: "Dulce Encuentro", nombre: "Un dulce regalo", descripcion: "Regala algo rico a quien quieras.", premio: "Saldo para usar en tienda", color: "#7c3f33", colorAcento: "#f0c98f", saldo: 100 }
  }
];

export const PLANS = [
  { name: "Esencial", title: "Para dar el primer paso", price: 0, features: ["1 local", "Hasta 50 clientes", "Tarjeta de estampillas", "Panel básico"], cta: "Empezar gratis" },
  { name: "Emprende", title: "Para fidelizar cada día", price: 39, features: ["Hasta 2 locales", "Hasta 500 clientes", "Estampillas y cashback", "Panel de métricas"], cta: "Elegir Emprende" },
  { name: "Crece", title: "Para conocer a tus clientes", price: 119, features: ["Hasta 5 locales", "Todos los tipos de tarjeta", "Métricas y tendencias", "Reseñas y geolocalización"], cta: "Elegir Crece", featured: true },
  { name: "Avanza", title: "Para equipos en expansión", price: 229, features: ["Hasta 15 locales", "Análisis completo", "Gestión avanzada de clientes", "Acompañamiento prioritario"], cta: "Elegir Avanza" }
];

export const FAQS = [
  ["¿Qué es Fidegresa?", "Es un programa de fidelización digital: reemplaza las tarjetas físicas de sellos por tarjetas digitales y le da a tu negocio un panel para conocer a sus clientes y hacerlos volver."],
  ["¿Qué tipos de tarjetas puedo ofrecer?", "Puedes crear tarjetas de estampillas, cashback, niveles y gift cards, según el plan que elijas."],
  ["¿Necesito conocimientos técnicos?", "No. Configuras tu programa desde un panel pensado para dueños de negocio y tu equipo solo registra las visitas."],
  ["¿Puedo cambiar de plan?", "Sí. Puedes empezar gratis y cambiar de plan cuando tu negocio lo necesite. Los precios mostrados son referenciales."],
  ["¿Qué pasa con las tarjetas físicas que ya entregué?", "Puedes registrar a tus clientes actuales y continuar su progreso en la tarjeta digital, así nadie pierde lo que ya acumuló."]
];

export const DEMO_METRICS = [
  { label: "Visitas de la semana", value: "312" },
  { label: "Clientes que volvieron", value: "64%" },
  { label: "Premios canjeados", value: "28" }
];

export const DEMO_WEEK = [
  { day: "Lun", visits: 34 },
  { day: "Mar", visits: 41 },
  { day: "Mié", visits: 38 },
  { day: "Jue", visits: 52 },
  { day: "Vie", visits: 63 },
  { day: "Sáb", visits: 58 },
  { day: "Dom", visits: 26 }
];

export const DEMO_CUSTOMERS = [
  { name: "Lucía Martínez", visits: 18, status: "Le faltan 2 sellos" },
  { name: "Mateo Fernández", visits: 14, status: "Premio listo" },
  { name: "Valentina Rojas", visits: 12, status: "Volvió ayer" },
  { name: "Diego Salazar", visits: 9, status: "Sin venir hace 30 días" }
];

export const DEMO_PROGRAMS = [
  { name: "Un café con cariño", type: "Estampillas", customers: 186 },
  { name: "La Mesa te premia", type: "Cashback", customers: 94 },
  { name: "Club Norte", type: "Niveles", customers: 57 }
];
