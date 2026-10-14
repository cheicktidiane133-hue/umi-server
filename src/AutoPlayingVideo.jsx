import { useEffect, useRef } from "react";

export default function AutoPlayingVideo(props) {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let visible = false;
    const update = () => {
      if (visible && document.visibilityState !== "hidden") video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }, { threshold: 0.35 });
    observer.observe(video);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); video.pause(); };
  }, [props.src]);
  return <video {...props} ref={ref} autoPlay muted loop playsInline preload="metadata" />;
}
