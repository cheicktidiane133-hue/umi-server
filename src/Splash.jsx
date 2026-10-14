import { useEffect } from "react";
import "./Splash.css";

import logo from "./assets/logo-start.jpeg";

function Splash({ onFinish }) {

  useEffect(() => {

    const timer = setTimeout(() => {
      onFinish?.();
    }, 3200);

    return () => clearTimeout(timer);

  }, [onFinish]);

  return (

    <div className="umi-splash">

      {/* LUMIÈRES */}
      <div className="splash-light splash-light-1" />
      <div className="splash-light splash-light-2" />

      {/* PARTICULES */}
      <div className="splash-particles">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* LOGO */}
      <div className="splash-logo-zone">

        <div className="splash-logo-glow" />

        <div className="splash-logo-wrapper">
          <img
            src={logo}
            alt="UMI"
            className="splash-logo"
          />
        </div>

        <div className="splash-company">
          UNIVERS DES MACHINES
          <br />
          INDUSTRIELLES
        </div>

        <div className="splash-line">
          <span />
        </div>

        <div className="splash-slogan">
          <span>COMMANDEZ</span>
          <i>•</i>
          <span>PRODUISEZ</span>
          <i>•</i>
          <span>VENDEZ</span>
        </div>

      </div>

    </div>

  );
}

export default Splash;