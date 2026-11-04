# Boxer Club Vaud – l’app

Application du **Boxer Club Vaud** (www.boxerclubvaud.ch) : une vitrine du club et un espace pour les membres.
C’est une application web installable (PWA) : on l’ouvre dans le navigateur, puis « Ajouter à l’écran d’accueil » pour l’avoir comme une app, sur iPhone comme sur Android. Elle est construite sur la même base que Dragon Ball Day – Gestion.

| Rubrique | Ce qu’on y fait | Qui la voit |
| --- | --- | --- |
| Accueil | Présentation, annonce du comité, prochains rendez-vous | Tout le monde |
| Agenda des cours | Cours et événements, inscription, rappel avant le cours, ajout à son agenda | Tout le monde ; inscription pour les membres |
| Moniteurs | Fiche de chaque moniteur·rice : photo, présentation, spécialités, brevets, ses prochains cours | Tout le monde |
| Chiots & portées | Annonces de naissances par élevage : nombre de chiots, mâles/femelles, disponibles ou réservés, contact de l’élevage | Tout le monde |
| Wiki du boxer | Questions / réponses (santé, chaleur, torsion d’estomac, éducation, démarches…), avec recherche | Tout le monde |
| Comité & adhérents | Le comité avec rôles et contacts ; la liste des adhérent·es et leurs chiens | Comité : tout le monde. Adhérents : membres |
| Plan d’accès | Adresse, carte, itinéraire Google Maps / Apple Plans / transports publics | Tout le monde |
| Tchat | Discussion entre membres et adhérent·es | Membres validés |
| Contacts d’urgence | 144, 117, 118, 112, Tox Info 145, vétérinaire de garde, présidente, Boxer en détresse | Tout le monde |
| Soutenir | Twint, devenir membre, vêtements du club, Boxer en détresse, bénévolat | Tout le monde |
| Mon compte | Pseudo, photo, fiches de ses chiens (nom, sexe, âge, photo, castré/stérilisée…), rappels | La personne |
| Réglages | Valider les nouveaux comptes, donner les rôles, modifier les textes de l’app | Comité |

## Comptes et rôles

Chacun crée son compte avec un **pseudo**, un e-mail et un mot de passe, puis se connecte avec son pseudo (ou son e-mail).
Un nouveau compte est **en attente** : il voit toute la vitrine, mais pas le tchat ni la liste des adhérents, jusqu’à ce que le comité le valide dans Réglages.
**Le tout premier compte créé devient administrateur.** Créez-le vous-même dès la mise en ligne.

| Rôle | Ce qu’il peut faire |
| --- | --- |
| Administrateur·rice | Tout, y compris nommer d’autres administrateurs |
| Président·e / Caissier·ère | Comme le comité, et coche les cotisations réglées dans la liste des adhérents (seuls eux et l’admin voient ces cases). Nommé·es par un·e admin |
| Comité | Valide les comptes, donne les rôles, modifie tout le contenu |
| Responsable éducation | Crée, modifie et annule tous les cours, gère les fiches moniteurs et répond aux questions du wiki |
| Moniteur·rice | Gère l’agenda des cours, les fiches moniteurs et le wiki |
| Éleveur·euse | Publie et met à jour ses propres élevages et portées |
| Membre | Ajoute des cours à l’agenda et modifie les siens, s’inscrit aux cours, tchat, liste des adhérents |
| Adhérent·e | S’inscrit aux cours, tchat, liste des adhérents |
| En attente | Compte créé, pas encore validé |

Les droits sont vérifiés par la base elle-même (`firestore.rules`), pas seulement par l’interface.

## Rappels avant les cours

- **« Ajouter à mon agenda »** sur chaque cours : le cours arrive dans l’agenda du téléphone avec une alarme. C’est le rappel le plus sûr, même app fermée.
- **Notifications de l’app** (Mon compte › Rappels) : l’app prévient 30 min à 24 h avant chaque cours où l’on est inscrit, quand elle est ouverte ou en arrière-plan. Sur iPhone, il faut d’abord installer l’app sur l’écran d’accueil.
- Pour des notifications envoyées même quand l’app est complètement fermée, il faudrait ajouter Firebase Cloud Messaging et une petite fonction serveur (offre Blaze de Firebase, payante à l’usage mais quasi gratuite pour un club). Possible dans un second temps.

## Mode essai

Tant que `firebase-config.js` vaut `null`, l’app tourne en **mode essai** : des exemples (cours, portée, messages) sont gardés dans le navigateur, et Mon compte permet de changer de rôle pour voir l’app comme un visiteur, un·e adhérent·e, le comité…

## Mise en route de la base de données (Firebase, gratuit)

1. Aller sur https://console.firebase.google.com, **Créer un projet** (par ex. « boxer-club-vaud »). Google Analytics n’est pas nécessaire.
2. **Authentication** › Commencer › activer **Adresse e-mail/Mot de passe**.
3. **Authentication** › Paramètres › **Domaines autorisés** › ajouter `koji-tea.github.io` (ou votre propre domaine).
4. **Firestore Database** › Créer une base de données › emplacement **eur3 (Europe)** › mode production.
5. **Firestore Database** › **Règles** › coller tout le contenu du fichier `firestore.rules` › **Publier**.
6. **Paramètres du projet** (roue dentée) › Vos applications › icône **Web `</>`** › nom « Boxer Club Vaud » (sans Hosting). Copier le bloc `firebaseConfig`.
7. Dans `firebase-config.js`, remplacer `null` par ce bloc (voir l’exemple dans le fichier de Dragon Ball Day). Ce bloc n’est pas secret.
8. Ouvrir l’app, **Créer un compte** : ce premier compte devient administrateur. Puis Réglages › **Importer le contenu de départ** (comité, moniteurs, contacts d’urgence, élevages et wiki repris de boxerclubvaud.ch).

L’offre gratuite (Spark) suffit largement pour un club. Les photos sont réduites et gardées dans la base : pas besoin de Firebase Storage.

## Mettre en ligne (GitHub Pages)

Dépôt GitHub › Settings › Pages › Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
L’app est alors en ligne à `https://koji-tea.github.io/boxer-club-vaud/`. Pour une adresse comme `app.boxerclubvaud.ch`, ajouter un fichier `CNAME` et un enregistrement DNS CNAME `app` → `koji-tea.github.io` chez l’hébergeur du domaine (puis l’ajouter aux domaines autorisés de Firebase).

À chaque modification, changer le numéro de version dans `sw.js` pour que les téléphones prennent la nouvelle version.

## Organisation du code

```
index.html            la page
css/app.css           couleurs (noir du logo, fauve du boxer) et mise en page
firebase-config.js    configuration Firebase (null = mode essai)
firestore.rules       règles d'accès de la base (à garder d'accord avec js/donnees.js)
js/outils.js          petits outils, icônes, fenêtres et formulaires
js/donnees.js         rôles, contenu de départ, stockage Firebase / essai, comptes, inscriptions, tchat
js/rappels.js         rappels avant les cours (agenda .ics et notifications)
js/vues/vitrine.js    accueil, plan d'accès, soutenir, urgences, comité & adhérents
js/vues/cours.js      agenda des cours et moniteurs
js/vues/chiots.js     portées, chiots et élevages
js/vues/wiki.js       questions / réponses
js/vues/membres.js    tchat, mon compte, réglages
js/app.js             navigation et démarrage
sw.js                 hors connexion (changer la version à chaque mise en ligne)
tools/                préparation du logo et des icônes, test complet avec les émulateurs Firebase
```

### Tester les règles de la base

```
python3 -m http.server 8765 &
npx firebase emulators:exec --project demo-bcv --only firestore,auth "node tools/test-e2e.js"
```
Le test crée des comptes, vérifie le premier administrateur, la validation, le tchat, les inscriptions, les portées et que chaque rôle est bien limité.
