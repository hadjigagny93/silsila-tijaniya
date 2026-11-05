"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

// Succès : une notification qui s'efface après 5 secondes. Erreur : un encadré qui reste.
export function Notice({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (tone !== "success") return;
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [tone]);

  if (!visible) return null;
  if (tone === "error") {
    return (
      <p role="alert" className="notice-error">
        <Icon name="alert" />
        {children}
      </p>
    );
  }
  return (
    <p role="status" className="toast">
      <span className="toast-check">
        <Icon name="check" size={14} />
      </span>
      {children}
    </p>
  );
}
