export const NAVIGATION_GROUPS = [
  {
    label: "Tu negocio",
    items: [
      { to: "/panel/metricas", label: "Métricas", icon: "chart" },
      { to: "/panel/clientes", label: "Clientes", icon: "users" },
      { to: "/panel/resenas", label: "Reseñas", icon: "star" }
    ]
  },
  {
    label: "Tu programa",
    items: [
      { to: "/panel/tarjetas", label: "Tarjetas", icon: "card" },
      { to: "/panel/ubicaciones", label: "Ubicaciones", icon: "pin" },
      { to: "/panel/geolocalizacion", label: "Geolocalización", icon: "target" }
    ]
  },
  {
    label: "Cuenta",
    items: [{ to: "/panel/configuracion", label: "Configuración", icon: "settings" }]
  }
];
