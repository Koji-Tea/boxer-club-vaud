# Boxer Club Vaud – l’app

Application du **Boxer Club Vaud** (www.boxerclubvaud.ch) : une vitrine du club et un espace pour les membres.
C’est une application web installable (PWA) : on l’ouvre dans le navigateur, puis « Ajouter à l’écran d’accueil » pour l’avoir comme une app, sur iPhone comme sur Android. Elle est construite sur la même base que Dragon Ball Day – Gestion.

| Rubrique | Ce qu’on y fait | Qui la voit |
| --- | --- | --- |
| Accueil | Présentation, annonce du comité, prochains rendez-vous | Tout le monde |
| Agenda des cours | Cours et événements, inscription, rappel avant le cours, ajout à son agenda | Tout le monde ; inscription pour les membres |
| Comité & adhérents | Le comité et ses rôles ; la liste des adhérent·es et leurs chiens (un chien partagé a une seule fiche avec tous ses maîtres ; chaque maître, ou le comité, fusionne les doublons), bouton pour télécharger le QR code de paiement de l’adhésion | Comité : tout le monde. Adhérents : membres. E-mails, téléphones et cotisations : comité |
| Tchat | Fil général et groupes de discussion (créés par le comité, rejoints librement) | Membres validés |
| Moniteurs | Fiche de chaque moniteur·rice : photo, présentation, spécialités, brevets, ses prochains cours | Tout le monde |
| Chiots & portées | Annonces de naissances par élevage : nombre de chiots, mâles/femelles, disponibles ou réservés, contact de l’élevage | Tout le monde |
| Comptabilité | Soldes des comptes Club Boxer Vaud et Cabane, cotisations (70 CHF × payées), recettes et dépenses, factures scannées, notes de frais, archives et export par année | Comité seulement |
| Documents du comité (onglet de Comité & adhérents) | PV, convocations, correspondance : scan ou PDF, classés par année et par type | Comité seulement |
| Gestion cabane | Échéances (gaz, extincteur…), inventaire, travaux et frais, fournisseurs, clés, infos pratiques | Comité seulement |
| Wiki du boxer | Questions / réponses (santé, chaleur, torsion d’estomac, éducation, démarches…), avec recherche | Tout le monde |
| Contacts d’urgence | 144, 117, 118, 112, Tox Info 145, vétérinaire de garde, présidente, Boxer en détresse | Tout le monde |
| Plan d’accès | Adresse, carte, itinéraire Google Maps / Apple Plans / transports publics | Tout le monde |
| Soutenir | Twint, devenir membre (QR code d’adhésion), vêtements du club, Boxer en détresse, bénévolat, réseaux | Tout le monde |
| Réglages | Valider les nouveaux comptes, donner les rôles, QR code d’adhésion, montant de la cotisation, textes de l’app | Comité |
| Mon compte | Pseudo, photo, téléphone, adhésion BCV / BCS, cotisation, fiches de ses chiens (ou se relier à un chien déjà inscrit par un autre maître), rappels | La personne |
| Messages (enveloppe en haut) | Messages privés entre membres et notifications de l’app (note de frais à payer, payée…) | Membres validés |

## Comptes et rôles

Chacun crée son compte avec un **pseudo**, un e-mail et un mot de passe, puis se connecte avec son pseudo (ou son e-mail).
Un nouveau compte est **en attente** : il voit toute la vitrine, mais pas le tchat ni la liste des adhérents, jusqu’à ce que le comité le valide dans Réglages.
**Le tout premier compte créé devient administrateur.** Créez-le vous-même dès la mise en ligne.

| Rôle | Ce qu’il peut faire |
| --- | --- |
| Administrateur·rice | Tout, y compris nommer d’autres administrateurs |
| Président·e | Accès complet ; nomme le/la caissier·ère et d’autres président·es |
| Caissier·ère | Comptabilité, notes de frais, cotisations, adhérents. Ne modifie pas les cours ni l’agenda |
| Responsable élevage | Comité : cours et agenda, élevages et portées, cabane. Ne modifie pas la comptabilité ni les adhérents |
| Responsable de la cabane | Comité : cabane, cours et agenda. Ne modifie pas la comptabilité ni les adhérents |
| Responsable membres | Comité : adhérents, comptes et cotisations. Ne modifie pas la comptabilité, les cours ni l’agenda |
| Membre du comité | Comité : voit la comptabilité et la cabane, gère les adhérents. Ne modifie pas la comptabilité, les cours ni l’agenda |
| Responsable éducation | Comité : crée, modifie et annule les cours, gère les fiches moniteurs et répond aux questions du wiki |
| Moniteur·rice | Gère l’agenda des cours, les fiches moniteurs et le wiki |
| Éleveur·euse | Publie et met à jour ses propres élevages et portées |
| Adhérent·e | S’inscrit aux cours, tchat et groupes, messages privés, liste des adhérents |
| En attente | Compte créé, pas encore validé |

Tous les membres du comité voient la comptabilité, la cabane, les contacts des adhérents et les cotisations, et créent leurs notes de frais.
Les cotisations sont cochées par l’admin, le/la président·e, le/la caissier·ère et le/la responsable membres. L’ancien rôle « Membre » a désormais les mêmes droits qu’un·e adhérent·e.

## Fichiers scannés

Factures, tickets et devis sont pris en photo depuis le téléphone (« Scanner avec l’appareil photo ») ou joints en PDF (700 Ko au plus).
Sans service de stockage payant, chaque fichier est enregistré dans la base Firestore : les photos sont réduites automatiquement pour rester légères.

Les droits sont vérifiés par la base elle-même (`firestore.rules`), pas seulement par l’interface.

## Messages vocaux et accusés de lecture

- **Messages vocaux** (tchat, groupes, messages privés) : quand le champ est vide, le bouton Envoyer devient un micro. Maintenir pour enregistrer, relâcher pour envoyer, glisser vers la gauche pour annuler. Un appui court verrouille l’enregistrement (Supprimer / Envoyer). 3 minutes au plus. On écoute directement dans la bulle (barre de progression, toucher la barre pour avancer, bouton de vitesse 1× / 1,5× / 2× retenu sur le téléphone).
- Sans Firebase Storage (offre gratuite), le son est rangé dans Firestore à côté des messages (morceaux de moins de 1 Mo), et téléchargé seulement quand on l’écoute. Supprimer le message supprime aussi le son.
- **Coches** sous ses propres messages : horloge = envoi en cours, ✓✓ grises = envoyé, ✓✓ bleues = vu. Dans le tchat général et les groupes, le chiffre donne combien de personnes l’ont vu ; le toucher affiche leurs noms.

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
js/vues/membres.js    tchat et groupes, mon compte, réglages
js/vues/messages.js   messages privés et notifications (enveloppe)
js/vues/compta.js     comptabilité et notes de frais (comité)
js/vues/cabane.js     gestion de la cabane (comité)
js/app.js             navigation et démarrage
sw.js                 hors connexion (changer la version à chaque mise en ligne)
tools/                préparation du logo et des icônes, test complet avec les émulateurs Firebase
```

### Tester les règles de la base

```
python3 -m http.server 8765 &
npx firebase emulators:exec --project demo-bcv --only firestore,auth "node tools/test-e2e.js"
npx firebase emulators:exec --project demo-bcv --only firestore,auth "node tools/test-vocal.js"   # messages vocaux et coches (micro simulé)
npx firebase emulators:exec --project demo-bcv --only firestore,auth "node tools/test-chiens.js"  # chiens partagés entre plusieurs maîtres, fusion des doublons
```
Le test crée des comptes, vérifie le premier administrateur, la validation, le tchat, les inscriptions, les portées et que chaque rôle est bien limité.
