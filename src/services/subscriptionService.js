import { apiClient } from "../api/apiClient";

export const subscriptionService = {
  upgrade: planId => apiClient.post("/subscription/upgrade", { planId, confirmed: true }).then(response => response.data)
};
