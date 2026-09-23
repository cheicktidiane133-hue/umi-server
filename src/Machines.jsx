import "./Machines.css";
import machineUmi from "./assets/machine-umi.png";
import agroImage from "./assets/categories/agro.jpeg";
import emballageImage from "./assets/categories/emb.jpeg";
import plastiqueImage from "./assets/categories/plas.jpeg";
import eauImage from "./assets/categories/eau.jpeg";
import chimiqueImage from "./assets/categories/chim.jpeg";
import cosmetiqueImage from "./assets/categories/cosm.jpeg";
import agricultureImage from "./assets/categories/agric.jpeg";
import constructionImage from "./assets/categories/const.jpeg";
import boisImage from "./assets/categories/bois.jpeg";
import metallurgieImage from "./assets/categories/metall.jpeg";
import textileImage from "./assets/categories/text.jpeg";
import papierImage from "./assets/categories/papie.jpeg";
import energieImage from "./assets/categories/equip.jpeg";
import recyclageImage from "./assets/categories/recy.jpeg";
import autresImage from "./assets/categories/acce.jpeg";

function Machines({ onBack, onOpenCategory }) {
  const categories = [
    {
      id: 1,
      name: "Agroalimentaire",
      image: agroImage,
    },
    {
      id: 2,
      name: "Emballage & conditionnement",
      image: emballageImage,
    },
    {
      id: 3,
      name: "Fabrication plastique",
      image: plastiqueImage,
    },
    {
      id: 4,
      name: "Eau & boissons",
      image: eauImage,
    },
    {
      id: 5,
      name: "Produits chimiques & entretien",
      image: chimiqueImage,
    },
    {
      id: 6,
      name: "Cosmétiques",
      image: cosmetiqueImage,
    },
    {
      id: 7,
      name: "Agriculture & élevage",
      image: agricultureImage,
    },
    {
      id: 8,
      name: "Construction & BTP",
      image: constructionImage,
    },
    {
      id: 9,
      name: "Bois & menuiserie",
      image: boisImage,
    },
    {
      id: 10,
      name: "Métallurgie & fabrication",
      image: metallurgieImage,
    },
    {
      id: 11,
      name: "Textile & habillement",
      image: textileImage,
    },
    {
      id: 12,
      name: "Papier & impression",
      image: papierImage,
    },
    {
      id: 13,
      name: "Énergie & équipements",
      image: energieImage,
    },
    {
      id: 14,
      name: "Recyclage & environnement",
      image: recyclageImage,
    },
    {
      id: 15,
      name: "Autres machines & accessoires",
      image: autresImage,
    },
  ];

  return (
    <div className="machines-page">

      {/* BARRE DU HAUT */}
      <header className="machines-header">
        <button className="machines-back" onClick={onBack}>
          ←
        </button>

        <h1>Machines</h1>

        <div className="machines-header-space"></div>
      </header>

      {/* CONTENU */}
      <main className="machines-content">

        <h2>Catégories de machines</h2>

        <p>
          Trouvez la machine adaptée à votre activité
        </p>

        <div className="machine-categories-list">

          {categories.map((category) => (
            <button
              className="machine-category-item"
              key={category.id}
              onClick={() => onOpenCategory(category)}
            >
              <img
                src={category.image}
                alt={category.name}
                className="machine-category-image"
              />
            </button>
          ))}

        </div>

      </main>

    </div>
  );
}

export default Machines;