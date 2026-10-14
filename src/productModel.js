export const numericPrice = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(String(value).replace(/FCFA/gi, "").replace(/[\s\u00a0\u202f]/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
export function getProductModel(product) {
  const models = Array.isArray(product?.models) ? product.models : [];
  return models.find((m) => product?.selectedModelId && String(m.id) === String(product.selectedModelId)) || models[0] || null;
}
export function withProductModel(product) {
  if (!product) return product;
  const model = getProductModel(product);
  if (!model) return product;
  const preservePrice = product.isLiveOffer === true || product.priceLocked === true;
  return {
    ...product,
    selectedModelId: model.id || "",
    model: model.name || "",
    capacity: model.capacity ?? "",
    power: model.power ?? "", year: model.year ?? "",
    warranty: model.warranty ?? "", availability: model.availability ?? "",
    price: preservePrice ? product.price : model.price,
    images: model.images || [], imageUrls: model.imageUrls || [], videos: model.videos || [],
    imageUrl: model.images?.[0] || model.imageUrls?.[0] || model.imageUrl || model.image || "",
    image: model.images?.[0] || model.imageUrls?.[0] || model.imageUrl || model.image || "",
    videoUrl: model.videos?.[0] || model.videoUrl || "",
  };
}
export const getProductNumericPrice = (product) => {
  if (product?.isLiveOffer || product?.priceLocked) return numericPrice(product.price);
  const model = getProductModel(product);
  return numericPrice(model ? model.price : product?.price ?? product?.prix);
};
