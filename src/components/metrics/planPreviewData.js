export const PLAN_PREVIEW = {
  traffic: Array.from({ length: 7 }, (_, day) => Array.from({ length: 15 }, (_, index) => ({
    day,
    hour: index + 8,
    count: (day * 7 + index * 3) % 17
  }))),
  funnel: [
    { label: "Registrados", value: 240 },
    { label: "1.ª visita", value: 196 },
    { label: "2.ª visita", value: 142 },
    { label: "Recurrentes (3+)", value: 91 },
    { label: "Canjearon premio", value: 48 }
  ],
  cohorts: [
    { month: "jun. 26", values: [100, 54, 42, 37, 31, 28] },
    { month: "jul. 26", values: [100, 59, 47, 39, 33] },
    { month: "ago. 26", values: [100, 51, 40, 35] },
    { month: "set. 26", values: [100, 62, 48] },
    { month: "oct. 26", values: [100, 57] },
    { month: "nov. 26", values: [100] }
  ]
};
