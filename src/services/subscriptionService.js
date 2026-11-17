import { apiClient } from "../api/apiClient";

export const subscriptionService = {
  upgrade: planId => apiClient.post("/demo/subscription/upgrade", { planId, confirmed: true }).then(response => response.data)
};
