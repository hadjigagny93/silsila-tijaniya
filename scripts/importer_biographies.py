#!/usr/bin/env python3
"""Place dans l'app les fichiers créés par telecharger_biographies.py.

À lancer soi-même. Chaque fichier rejoint la biographie dont les sources citent la même
page. Seul le texte change, et seulement si le fichier est plus long que le texte en place :
une biographie déjà rédigée n'est jamais raccourcie. La base est sauvegardée avant l'écriture.

Usage : python3 importer_biographies.py [--dossier DOSSIER] [--base FICHIER] [--essai]
"""
import argparse
import re
import sqlite3
import time
from pathlib import Path

APP = Path.home() / "Library" / "Application Support" / "Silsila Tijaniya"


def lire_fichier(fichier):
    contenu = fichier.read_text(encoding="utf-8")
    source = re.search(r"^Source : (\S+)$", contenu, re.M)
    if not source:
        return None, ""
    return source.group(1), contenu[source.end():].strip()


def main():
    options = argparse.ArgumentParser(description=__doc__)
    options.add_argument("--dossier", default=str(Path.home() / "Desktop" / "biographies-tidjaniya"))
    options.add_argument("--base", default=str(APP / "silsila.db"))
    options.add_argument("--essai", action="store_true", help="affiche le bilan sans rien écrire")
    args = options.parse_args()

    fichiers = sorted(Path(args.dossier).glob("*.md"))
    if not fichiers:
        raise SystemExit(f"Aucun fichier .md dans {args.dossier}")

    base = Path(args.base)
    db = sqlite3.connect(base, timeout=10)
    biographies = db.execute("select slug, name, body, sources from biographies").fetchall()

    a_faire, conserves, sans_fiche = [], [], []
    for fichier in fichiers:
        adresse, texte = lire_fichier(fichier)
        fiches = [b for b in biographies if adresse and adresse in (b[3] or "")]
        if not texte or not fiches:
            sans_fiche.append(fichier.name)
            continue
        for slug, nom, actuel, _ in fiches:
            if len(texte) > len(actuel or ""):
                a_faire.append((texte, slug, nom))
            else:
                conserves.append(nom)

    print(f"{len(fichiers)} fichiers : {len(a_faire)} textes à placer, {len(conserves)} biographies conservées, "
          f"{len(sans_fiche)} sans fiche.")
    for nom in sans_fiche:
        print(f"  Sans fiche : {nom}")
    if args.essai:
        print("Essai : rien n'a été écrit.")
        return

    dossier = base.parent / "sauvegardes"
    dossier.mkdir(exist_ok=True)
    copie = dossier / f"silsila-avant-import-site-{time.strftime('%Y%m%d-%H%M%S')}.db"
    with sqlite3.connect(copie) as sauvegarde:
        db.backup(sauvegarde)
    with db:
        db.executemany("update biographies set body = ? where slug = ? and name = ?", a_faire)
    print(f"Terminé : {len(a_faire)} biographies mises à jour.\nSauvegarde : {copie}")


if __name__ == "__main__":
    main()
