import { getProductNumericPrice } from "./productModel";
export const getProductPrice = (product) => {
  const price = getProductNumericPrice(product);
  return price === null ? "Prix non renseigné" : `${price.toLocaleString("fr-FR")} FCFA`;
};
