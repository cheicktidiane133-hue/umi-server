import { withProductModel } from "./productModel";

export function getLiveProducts(live, catalog = []) {
  const embedded = Array.isArray(live?.clientProducts) ? live.clientProducts : [];
  const products = new Map(catalog.filter(Boolean).map((item) => [String(item.id), item]));
  for (const item of embedded) {
    if (!item?.id) continue;
    products.set(String(item.id), { ...item, sellerId: live.ownerId || item.sellerId || item.ownerId || "", sellerName: live.sellerName || item.sellerName || "", liveId: live.id || "", liveType: live.liveType || "client" });
  }
  // Compatibility with older client lives containing the presented product inline.
  const id = live?.machineId || live?.productId;
  if (live?.liveType === "client" && id && !products.has(String(id))) {
    products.set(String(id), { id, name: live.machineName || live.productName || "", price: live.price ?? null, description: live.description || "", imageUrl: live.productImage || live.imageUrl || live.photos?.[0] || "", images: live.photos || [], videos: live.videos || [], sellerId: live.ownerId || "", sellerName: live.sellerName || "", liveId: live.id || "", liveType: "client", models: [] });
  }
  return [...products.values()].map(withProductModel);
}
export function getSimilarProducts(live, products) {
  const ids = new Set((live?.similarMachineIds || []).map(String));
  return products.filter((item) => ids.has(String(item.id)));
}
