export const NAVIGATION_GROUPS = [
  {
    label: "Tu negocio",
    items: [
      { to: "/panel/metricas", label: "Métricas", icon: "chart" },
      { to: "/panel/tarjetas", label: "Tarjetas", icon: "card" },
      { to: "/panel/clientes", label: "Clientes", icon: "users" }
    ]
  },
  {
    label: "Tu programa",
    items: [
      { to: "/panel/geolocalizacion", label: "Geolocalización", icon: "target" },
      { to: "/panel/ubicaciones", label: "Ubicaciones", icon: "pin" },
      { to: "/panel/resenas", label: "Reseñas", icon: "star" }
    ]
  },
  {
    label: "Cuenta",
    items: [{ to: "/panel/configuracion", label: "Configuración", icon: "settings" }]
  }
];
