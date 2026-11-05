#!/usr/bin/env python3
"""Télécharge les pages « Compagnons de Cheikh Tijani » de tidjaniya.com dans un dossier local.

À lancer soi-même, avec l'accord de l'auteur du site. Chaque page devient un fichier .md.
Les fichiers déjà présents sont sautés : on peut relancer le script sans tout refaire.

Usage : python3 telecharger_biographies.py [--sortie DOSSIER] [--limite N]
"""
import argparse
import html
import re
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

LISTE = "https://tidjaniya.com/fr/category/sidi-ahmed-tidjani/compagnons-cheikh-tidjani/page/{}/"
AGENT = "Mozilla/5.0 (Macintosh) silsila-tijaniya"
PAUSE = 1.0  # secondes entre deux pages, pour ne pas charger le site
BLOCS = {"p", "h2", "h3", "h4", "li", "blockquote"}
IGNORES = {"script", "style", "noscript", "svg", "figure"}


def lire(url):
    requete = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(requete, timeout=30) as reponse:
        return reponse.read().decode("utf-8", "replace")


class Article(HTMLParser):
    """Garde le texte du bloc principal de la page."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.titre = ""
        self.dans_titre = False
        self.profondeur = 0
        self.ignore = 0
        self.courant = []
        self.blocs = []

    def handle_starttag(self, tag, attrs):
        classes = (dict(attrs).get("class") or "").split()
        if tag == "h1" and not self.titre:
            self.dans_titre = True
        if self.profondeur:
            if tag == "div":
                self.profondeur += 1
            if tag in IGNORES:
                self.ignore += 1
            if tag == "br":
                self.courant.append("\n")
        elif tag == "div" and "entry-content" in classes and "is-layout-constrained" in classes and not self.blocs:
            self.profondeur = 1

    def handle_endtag(self, tag):
        if tag == "h1":
            self.dans_titre = False
        if not self.profondeur:
            return
        if tag in IGNORES and self.ignore:
            self.ignore -= 1
        if tag in BLOCS:
            self.fermer(tag)
        if tag == "div":
            self.profondeur -= 1
            if not self.profondeur:
                self.fermer("p")

    def fermer(self, tag):
        texte = re.sub(r"[ \t]+", " ", "".join(self.courant)).strip()
        self.courant = []
        if texte:
            self.blocs.append(f"## {texte}" if tag in {"h2", "h3", "h4"} else texte)

    def handle_data(self, data):
        if self.dans_titre:
            self.titre += data
        elif self.profondeur and not self.ignore:
            self.courant.append(data)


def adresses():
    trouvees = []
    for page in range(1, 100):
        try:
            contenu = lire(LISTE.format(page))
        except urllib.error.HTTPError as erreur:
            if erreur.code == 404:
                break
            raise
        liens = re.findall(r'href="(https://tidjaniya\.com/fr/[^"#?]+-agree/)"', contenu)
        nouveaux = [lien for lien in dict.fromkeys(liens) if lien not in trouvees]
        if not nouveaux:
            break
        trouvees += nouveaux
        print(f"Liste, page {page} : {len(nouveaux)} articles")
        time.sleep(PAUSE)
    return trouvees


def main():
    options = argparse.ArgumentParser(description=__doc__)
    options.add_argument("--sortie", default=str(Path.home() / "Desktop" / "biographies-tidjaniya"))
    options.add_argument("--limite", type=int, default=0, help="nombre maximal d'articles (0 : tous)")
    args = options.parse_args()

    sortie = Path(args.sortie)
    sortie.mkdir(parents=True, exist_ok=True)
    liste = adresses()
    if args.limite:
        liste = liste[: args.limite]

    enregistres, sautes, echecs = 0, 0, []
    for numero, adresse in enumerate(liste, 1):
        nom = adresse.rstrip("/").rsplit("/", 1)[-1]
        fichier = sortie / f"{nom}.md"
        if fichier.exists():
            sautes += 1
            continue
        try:
            article = Article()
            article.feed(lire(adresse))
        except (urllib.error.URLError, TimeoutError) as erreur:
            echecs.append(f"{adresse} : {erreur}")
            continue
        if not article.blocs:
            echecs.append(f"{adresse} : texte introuvable")
            continue
        titre = html.unescape(article.titre).strip()
        fichier.write_text(f"# {titre}\n\nSource : {adresse}\n\n" + "\n\n".join(article.blocs) + "\n", encoding="utf-8")
        enregistres += 1
        print(f"[{numero}/{len(liste)}] {titre}")
        time.sleep(PAUSE)

    print(f"\nTerminé : {enregistres} enregistrés, {sautes} déjà présents, {len(echecs)} en échec.")
    print(f"Dossier : {sortie}")
    for echec in echecs:
        print(f"  Échec : {echec}")


if __name__ == "__main__":
    main()
