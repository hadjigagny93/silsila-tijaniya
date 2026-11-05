"use client";

// Bouton d'envoi qui demande confirmation avant une action sans retour.
export function ConfirmButton({ message, className, children }: { message: string; className: string; children: React.ReactNode }) {
  return (
    <button className={className} onClick={(event) => !window.confirm(message) && event.preventDefault()}>
      {children}
    </button>
  );
}
