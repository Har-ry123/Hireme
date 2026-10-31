import { useRef } from "react";

const MENU_BAR_HEIGHT = 28;
const MIN_VISIBLE = 80;

export default function Window({ win, title, icon, children, onClose, onFocus, onMove, onToggleMaximize }) {
  const drag = useRef(null);

  function startDrag(event) {
    onFocus();
    // Windows fill the screen on phones, and buttons in the title bar must stay clickable
    if (win.maximized || event.target.closest("button") || window.innerWidth <= 800) return;
    drag.current = { dx: event.clientX - win.x, dy: event.clientY - win.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    if (!drag.current) return;
    onMove(
      Math.min(Math.max(event.clientX - drag.current.dx, MIN_VISIBLE - win.width), window.innerWidth - MIN_VISIBLE),
      Math.min(Math.max(event.clientY - drag.current.dy, MENU_BAR_HEIGHT), window.innerHeight - MIN_VISIBLE),
    );
  }

  function endDrag() {
    drag.current = null;
  }

  return (
    <section
      className={`window ${win.maximized ? "maximized" : ""}`}
      style={{ left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z }}
      aria-label={title}
      onPointerDown={onFocus}
    >
      <header
        className="titlebar"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onDoubleClick={onToggleMaximize}
      >
        <div className="lights">
          <button className="light close" aria-label={`Close ${title}`} onClick={onClose} />
          <button className="light minimize" aria-label={`Minimize ${title}`} onClick={onClose} />
          <button className="light zoom" aria-label={`Maximize ${title}`} onClick={onToggleMaximize} />
        </div>
        <h2>
          {icon}
          {title}
        </h2>
      </header>
      <div className="window-body">{children}</div>
    </section>
  );
}
