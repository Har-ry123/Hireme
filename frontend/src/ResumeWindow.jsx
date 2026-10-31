import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { RESUME_URL } from "./candidate.js";

const FILE_NAME = "Hariom-Jha-Resume.pdf";

// Pages are drawn on the site itself, because not every browser or phone can display a PDF
async function renderResume(container, isCancelled) {
  // Loaded only when the resume is opened, since the library is large
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const pdf = await pdfjs.getDocument({ url: RESUME_URL }).promise;
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number);
    if (isCancelled()) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const scale = (container.clientWidth / page.getViewport({ scale: 1 }).width) * pixelRatio;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.setAttribute("aria-label", `Resume page ${number}`);
    canvas.setAttribute("role", "img");
    await page.render({ canvas, viewport }).promise;
    if (isCancelled()) return;
    container.appendChild(canvas);
  }
}

export default function ResumeWindow() {
  const pages = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    const container = pages.current;
    setStatus("loading");
    renderResume(container, () => cancelled)
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch((error) => {
        console.error("Could not display the resume", error);
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, []);

  return (
    <div className="resume">
      <div className="resume-bar">
        <a href={RESUME_URL} download={FILE_NAME}>
          <Download size={14} aria-hidden="true" />
          Download PDF
        </a>
      </div>
      {status === "loading" && <p className="resume-note">Loading resume…</p>}
      {status === "failed" && <p className="resume-note">The resume couldn't be displayed. Use Download PDF instead.</p>}
      <div className="resume-pages" ref={pages} />
    </div>
  );
}
