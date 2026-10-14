# Tester un modele Hugging Face en local

Quatre commandes, dans PowerShell, depuis ce dossier.

## 1. Environnement isole

    py -m venv .venv
    .\.venv\Scripts\Activate.ps1

Si PowerShell refuse le script d'activation :

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

## 2. Dependances

    pip install -r requirements.txt

Compte ~2,5 Go et quelques minutes : torch embarque beaucoup.

## 3. Lancer le test

    python test_phishing.py

Le premier lancement telecharge le modele (~1,3 Go pour bert-large).
Il est ensuite mis en cache dans %USERPROFILE%\.cache\huggingface ;
les lancements suivants demarrent en quelques secondes.

## 4. Tester tes propres URL

    python test_phishing.py --url "http://exemple-suspect.top/login"

Et pour comparer un autre modele du Hub :

    python test_phishing.py --model un-autre/modele-phishing

---

## Ce que le script mesure

Il soumet 8 URL dont **je connais la nature**, moitie phishing moitie legitimes,
et compare le verdict du modele a la verite. Les trois cas interessants :

- un vrai lien OAuth Microsoft et un vrai lien OAuth Google : longs, avec
  `login`, des parametres et une redirection encodee. Un modele entraine sur
  des URL de phishing les classe souvent comme malveillants. C'est le faux
  positif qui ferait couper Office 365 a toute une entreprise.
- un site WordPress legitime compromis : le domaine est sain, seul le chemin
  trahit l'attaque. C'est le faux negatif typique.
- un raccourcisseur bit.ly : le modele ne peut rien savoir. Observer ce qu'il
  repond quand l'information n'existe pas est plus instructif que son score.

Le script finit par convertir le taux de faux positifs en **alertes par jour**
sur 100 000 URL. C'est la seule metrique qu'un responsable SOC ecoute.

## Nettoyer

Supprimer le dossier `.venv` et le cache `%USERPROFILE%\.cache\huggingface`.
