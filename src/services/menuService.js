import { apiClient } from "../api/apiClient";

const data = response => response.data;
const upload = file => {
  const body = new FormData();
  body.append("file", file);
  return body;
};
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

// El backend devuelve rutas completas (/api/v1/...) y apiClient ya tiene /api/v1 como base.
export const toApiPath = url => url.replace(/^\/api\/v1/, "");

/** Menú de un local: catálogo PDF, catálogo web, invitación al club y productos oficiales. */
export const menuService = {
  /** Enlace público del menú del local (/m/{slug}) para el QR que se imprime. */
  getPublicLink: (branchId, options) => apiClient.get(`/branches/${branchId}/public-link`, options).then(data),
  getCatalogs: (branchId, options) => apiClient.get(`/branches/${branchId}/catalogs`, options).then(data),
  uploadPdfFile: (branchId, file) => apiClient.post(`/branches/${branchId}/catalogs/pdf/files`, upload(file), multipart).then(data),
  deletePdfFile: (branchId, fileId) => apiClient.delete(`/branches/${branchId}/catalogs/pdf/files/${fileId}`).then(data),
  saveWeb: (branchId, url, active = true) => apiClient.put(`/branches/${branchId}/catalogs/web`, { url, active }).then(data),
  setCatalogActive: (branchId, type, active) => apiClient.patch(`/branches/${branchId}/catalogs/${type}`, { active }).then(data),
  deleteCatalog: (branchId, type) => apiClient.delete(`/branches/${branchId}/catalogs/${type}`),

  getInvitation: (branchId, options) => apiClient.get(`/branches/${branchId}/invitation`, options).then(data),
  saveInvitation: (branchId, invitation) => apiClient.put(`/branches/${branchId}/invitation`, invitation).then(data),

  getProducts: (branchId, options) => apiClient.get(`/branches/${branchId}/products`, options).then(data),
  createProduct: (branchId, product) => apiClient.post(`/branches/${branchId}/products`, product).then(data),
  updateProduct: (branchId, id, product) => apiClient.put(`/branches/${branchId}/products/${id}`, product).then(data),
  setProductStock: (branchId, id, inStock) => apiClient.patch(`/branches/${branchId}/products/${id}/stock`, { inStock }).then(data),
  deleteProduct: (branchId, id) => apiClient.delete(`/branches/${branchId}/products/${id}`),
  uploadProductImage: (branchId, id, file) => apiClient.post(`/branches/${branchId}/products/${id}/image`, upload(file), multipart).then(data),

  /** Descarga un archivo privado (foto o PDF) con la sesión y lo devuelve como Blob. */
  getFile: (url, options) => apiClient.get(toApiPath(url), { responseType: "blob", ...options }).then(data)
};
