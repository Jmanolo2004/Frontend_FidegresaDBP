export const NAVIGATION_GROUPS = [
  {
    label: "Tu negocio",
    items: [
      { to: "/panel/metricas", label: "Métricas", icon: "chart" },
      { to: "/panel/tarjetas", label: "Tarjetas", icon: "card" },
      { to: "/panel/menu", label: "Menú", icon: "book" },
      { to: "/panel/clientes", label: "Clientes", icon: "users" },
      { to: "/panel/equipo", label: "Equipo", icon: "users" }
    ]
  },
  {
    label: "Tu programa",
    items: [
      { to: "/panel/geolocalizacion", label: "Geolocalización", icon: "target" },
      { to: "/panel/ubicaciones", label: "Ubicaciones", icon: "pin" },
      { to: "/panel/resenas", label: "Reseñas", icon: "star" },
      { to: "/panel/referidos", label: "Referidos", icon: "link" }
    ]
  },
  {
    label: "Cuenta",
    items: [{ to: "/panel/configuracion", label: "Configuración", icon: "settings" }]
  }
];
