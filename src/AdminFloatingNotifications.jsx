import {
  useEffect,
  useRef,
  useState,
} from "react";


function AdminFloatingNotifications({
  quoteCount = 0,
  chatCount = 0,
  onOpenQuotes,
  onOpenChat,
}) {

  const containerRef =
    useRef(null);

  const dragRef =
    useRef({
      dragging: false,
      moved: false,
      startX: 0,
      startY: 0,
      initialX: 0,
      initialY: 0,
    });


  /* =========================================
     POSITION DE LA BULLE
  ========================================= */

  const [
    position,
    setPosition,
  ] = useState(() => {

    try {

      const saved =
        localStorage.getItem(
          "umiAdminFloatingNotificationsPosition"
        );

      if (saved) {

        const parsed =
          JSON.parse(saved);

        if (
          Number.isFinite(parsed?.x) &&
          Number.isFinite(parsed?.y)
        ) {

          return {
            x: parsed.x,
            y: parsed.y,
          };

        }

      }

    } catch (error) {

      console.error(
        "Erreur position bulles admin :",
        error
      );

    }


    return {
      x:
        Math.max(
          12,
          window.innerWidth - 86
        ),

      y:
        Math.max(
          90,
          window.innerHeight / 2 - 70
        ),
    };

  });


  /* =========================================
     LIMITER LA POSITION À L'ÉCRAN
  ========================================= */

  const clampPosition = (
    x,
    y
  ) => {

    const width =
      containerRef.current
        ?.offsetWidth || 68;

    const height =
      containerRef.current
        ?.offsetHeight || 150;


    const maxX =
      Math.max(
        8,
        window.innerWidth -
          width -
          8
      );


    const maxY =
      Math.max(
        8,
        window.innerHeight -
          height -
          8
      );


    return {

      x:
        Math.min(
          Math.max(
            8,
            x
          ),
          maxX
        ),

      y:
        Math.min(
          Math.max(
            8,
            y
          ),
          maxY
        ),

    };

  };


  /* =========================================
     SAUVEGARDER LA POSITION
  ========================================= */

  useEffect(() => {

    try {

      localStorage.setItem(
        "umiAdminFloatingNotificationsPosition",
        JSON.stringify(
          position
        )
      );

    } catch (error) {

      console.error(
        "Erreur sauvegarde position bulles admin :",
        error
      );

    }

  }, [position]);


  /* =========================================
     CORRIGER LA POSITION SI L'ÉCRAN CHANGE
  ========================================= */

  useEffect(() => {

    const handleResize = () => {

      setPosition(
        (current) =>
          clampPosition(
            current.x,
            current.y
          )
      );

    };


    window.addEventListener(
      "resize",
      handleResize
    );


    return () => {

      window.removeEventListener(
        "resize",
        handleResize
      );

    };

  }, []);


  /* =========================================
     COMMENCER LE DÉPLACEMENT
  ========================================= */

  const handlePointerDown = (
    event
  ) => {

    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {

      return;

    }


    dragRef.current = {

      dragging: true,

      moved: false,

      startX:
        event.clientX,

      startY:
        event.clientY,

      initialX:
        position.x,

      initialY:
        position.y,

    };


    event.currentTarget
      .setPointerCapture?.(
        event.pointerId
      );

  };


  /* =========================================
     DÉPLACER
  ========================================= */

  const handlePointerMove = (
    event
  ) => {

    if (
      !dragRef.current
        .dragging
    ) {

      return;

    }


    const deltaX =
      event.clientX -
      dragRef.current.startX;


    const deltaY =
      event.clientY -
      dragRef.current.startY;


    if (
      Math.abs(deltaX) > 4 ||
      Math.abs(deltaY) > 4
    ) {

      dragRef.current.moved =
        true;

    }


    const nextPosition =
      clampPosition(

        dragRef.current
          .initialX +
          deltaX,

        dragRef.current
          .initialY +
          deltaY

      );


    setPosition(
      nextPosition
    );

  };


  /* =========================================
     TERMINER LE DÉPLACEMENT
  ========================================= */

  const handlePointerUp = (
    event
  ) => {

    dragRef.current.dragging =
      false;


    event.currentTarget
      .releasePointerCapture?.(
        event.pointerId
      );

  };


  /* =========================================
     OUVRIR DEVIS
  ========================================= */

  const handleOpenQuotes = () => {

    if (
      dragRef.current.moved
    ) {

      dragRef.current.moved =
        false;

      return;

    }


    onOpenQuotes?.();

  };


  /* =========================================
     OUVRIR CHAT
  ========================================= */

  const handleOpenChat = () => {

    if (
      dragRef.current.moved
    ) {

      dragRef.current.moved =
        false;

      return;

    }


    onOpenChat?.();

  };


  /* =========================================
     AFFICHAGE DU COMPTEUR
  ========================================= */

  const displayCount = (
    count
  ) => {

    const number =
      Number(count) || 0;


    if (number > 99) {

      return "99+";

    }


    return String(number);

  };


    return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {[
        {
          key: "quotes",
          icon: "📄",
          label: "Ouvrir les devis",
          count: quoteCount,
          onClick: handleOpenQuotes,
        },
        {
          key: "chat",
          icon: "💬",
          label: "Ouvrir les messages clients",
          count: chatCount,
          onClick: handleOpenChat,
        },
      ].map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          aria-label={item.label}
          title={item.label}
          style={{
            position: "relative",
            width: "44px",
            minWidth: "44px",
            maxWidth: "44px",
            height: "44px",
            minHeight: "44px",
            maxHeight: "44px",
            padding: 0,
            border: "none",
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 3px 12px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "21px",
            cursor: "grab",
            touchAction: "none",
          }}
        >
          {item.icon}

          {item.count > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                width: "20px",
                minWidth: "20px",
                maxWidth: "20px",
                height: "20px",
                padding: 0,
                borderRadius: "50%",
                background: "#e11d48",
                color: "#ffffff",
                border: "2px solid #ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                fontSize: item.count > 99
                  ? "7px"
                  : "9px",
                fontWeight: "800",
                lineHeight: "1",
              }}
            >
              {displayCount(item.count)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default AdminFloatingNotifications;