import { useEffect, useState } from "react";
import "./Intro.css";

import image1 from "./assets/1.png";
import image2 from "./assets/2.png";
import image3 from "./assets/3.png";
import image4 from "./assets/4.png";

function Intro({ onSkip }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    image1,
    image2,
    image3,
    image4,
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((previous) =>
        previous === slides.length - 1
          ? 0
          : previous + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="intro-page">

      {/* IMAGES */}
      <div className="intro-slides">

        {slides.map((image, index) => (
          <div
            key={index}
            className={
              index === currentSlide
                ? "intro-slide active"
                : "intro-slide"
            }
          >
            <img
              src={image}
              alt={`UMI ${index + 1}`}
              className="intro-image"
            />
          </div>
        ))}

      </div>


      {/* BAS DE LA PAGE */}
      <div className="intro-bottom">

        {/* POINTS */}
        <div className="intro-dots">

          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              className={
                index === currentSlide
                  ? "intro-dot active"
                  : "intro-dot"
              }
              onClick={() =>
                setCurrentSlide(index)
              }
              aria-label={`Photo ${index + 1}`}
            />
          ))}

        </div>


        {/* BOUTON PASSER */}
        <button
          type="button"
          className="intro-skip"
          onClick={onSkip}
        >
          Passer
        </button>

      </div>

    </div>
  );
}

export default Intro;
