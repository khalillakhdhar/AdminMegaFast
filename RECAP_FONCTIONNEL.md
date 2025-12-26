# Récap fonctionnel — MegaFast Admin / Client / Driver

Ce document résume les écrans et les flux **tels qu’ils sont câblés dans les routes** et implémentés dans les principaux composants.

## 1) Portails & accès

### Auth
- Route: `/auth` (module Account)
- L’application segmente ensuite l’accès selon le rôle via guards:
  - **Admin**: layout admin (backoffice)
  - **Client**: layout client
  - **Driver**: layout driver

### Admin (Backoffice)
- Base route: `/megafast/*`
- Guards: `AuthGuard` + `AdminGuard`

### Client portal
- Base route: `/client/*`
- Guards: `AuthGuard` + `ClientGuard`

### Driver portal
- Base route: `/driver/*`
- Guards: `AuthGuard` + `DriverGuard`

## 2) Backoffice Admin — Écrans (routes /megafast)

### 2.1 Dashboard
- Route: `/megafast/dashboard`
- Objectif: vue synthèse (KPIs / widgets) côté admin.

### 2.2 Colis (Shipments)

#### Liste & gestion
- Route: `/megafast/colis`
- Fonctions principales:
  - Liste paginée des colis
  - Filtres: `barcode`, `clientPhone`, `status`, `assignedTo` (livreur), `dateRange`
  - Actions:
    - Créer un colis (`/megafast/colis/create`)
    - Export Excel / PDF
    - Voir détail, modifier, imprimer
    - Changements rapides d’état (selon le statut): ex. passer « en transit », livrer, annuler, supprimer
    - Assigner à un lot (batch) si non assigné

#### Création / modification (wizard)
- Routes:
  - `/megafast/colis/create`
  - `/megafast/colis/edit/:id`
- Structure: formulaire multi-étapes (wizard)
  1. **Client expéditeur**
     - Mode: client existant (sélection) ou nouveau client
     - Infos: nom, téléphone, email, société
     - Adresse d’enlèvement: adresse + gouvernorat + délégation
  2. **Destinataire**
     - Infos: nom, téléphone, email, société
     - Adresse: ligne 1/2 + gouvernorat + délégation (+ champs complémentaires)
  3. **Produits**
     - FormArray d’items (description, quantité, prix unitaire)
     - Totaux calculés (quantité totale, sous-total)
  4. **Livraison & frais**
     - (Frais/paiement et champs associés selon l’écran)
  5. **Lot & livreur**
     - Sélection lot + assignation livreur (si utilisé)
  6. **Récapitulatif**
     - Résumé final avant enregistrement

#### Détail colis
- Route: `/megafast/colis/:id`
- Contenu:
  - Entête: code-barres + badge statut
  - Menu actions: modifier, imprimer, marquer livré (si autorisé), annuler (si autorisé)
  - Panneaux d’informations:
    - Informations client / expéditeur
    - Détails colis (montant, poids, volume, dates)
    - Notes (si présentes)
  - Historique: timeline d’événements (statut, note, date)
  - Sidebar:
    - Assignations: livreur (affiche `assignedTo` si présent) + bouton d’assignation
    - Localisation (si `geo`)
    - Statistiques simples (jours depuis création, nb événements)

### 2.3 Clients
- Routes:
  - `/megafast/clients` (liste)
  - `/megafast/clients/dashboard` (dashboard client côté admin)
  - `/megafast/clients/:id` (détail)
- Objectif: gestion des comptes/infos clients et vue associée.

### 2.4 Drivers (Livreurs)
- Routes:
  - `/megafast/drivers` (liste)
  - `/megafast/drivers/create` (création)
  - `/megafast/drivers/:id` (détail)
- Objectif: gestion des livreurs et informations liées.

### 2.5 Congés
- Routes:
  - `/megafast/leaves/categories`
  - `/megafast/leaves/requests`
  - `/megafast/leaves/calendar`
- Objectif: catégories, demandes, calendrier.

### 2.6 Modules business
- Routes:
  - `/megafast/facturation`
  - `/megafast/comptabilite`
  - `/megafast/paie`
  - `/megafast/stats`
- Objectif: écrans métier (facturation/compta/paie/statistiques).

### 2.7 Gestion des utilisateurs
- Route: `/megafast/users`
- Objectif: création/administration de comptes (admin-side).

## 3) Portail Client — Écrans (routes /client)

### 3.1 Dashboard
- Route: `/client/dashboard`
- Contenu:
  - Statistiques (total, en transit, livrés, en attente)
  - “Envoi Express” (création rapide)
  - Derniers colis

### 3.2 Mes colis (liste)
- Route: `/client/shipments`
- Fonctions principales:
  - Recherche par code de suivi
  - Filtre par statut
  - Cartes de colis + actions: voir détails, suivre
  - Détails étendus: produits, adresses, totaux/frais si disponibles

### 3.3 Créer un colis (client)
- Route: `/client/shipments/create`
- Structure (formulaire étapes logiques):
  - Enlèvement: adresse + gouvernorat + délégation
  - Destinataire: nom, téléphone, email, entreprise
  - Livraison: adresses + gouvernorat + délégation
  - Détails: poids/volume + notes
  - Produits: liste avec quantités/prix + sous-totaux
  - Paiement/frais: (selon les champs activés sur l’écran)

### 3.4 Suivre un colis
- Route: `/client/shipments/track`
- Flux:
  - Saisie du code de suivi + recherche
  - Résultat: fiche colis (statut, infos, paiement) + historique timeline
  - Affichage “position actuelle” si `geo` (placeholder UI)

### 3.5 Profil
- Route: `/client/profile`

## 4) Portail Driver — Écrans (routes /driver)

### 4.1 Dashboard
- Route: `/driver/dashboard`
- Contenu:
  - KPIs (total, en attente, en transit, livrés, revenus)
  - Graphiques (répartition statuts, motifs d’échec)
  - Bloc “livraisons d’aujourd’hui” (basé sur livraisons du jour)

### 4.2 Mes colis (driver)
- Route: `/driver/shipments`
- Fonctions principales observées:
  - Liste de colis assignés au livreur
  - Filtres: villes, statut, code-barres, client, date début/fin, montants, délégations…
  - Actions typiques: ouvrir détail, mettre à jour statut, déclarer un échec de livraison (selon modals)

### 4.3 Routes
- Route: `/driver/routes`

### 4.4 Statistiques
- Route: `/driver/statistics`

### 4.5 Profil
- Route: `/driver/profile`

### 4.6 Delivery
- Route: `/driver/delivery`

## 5) Flux end-to-end (vue produit)

### Flux A — Création & traitement admin
1. Admin crée un colis via le wizard `/megafast/colis/create` (expéditeur → destinataire → produits → frais → lot/livreur → récap).
2. Admin consulte la liste `/megafast/colis` et peut filtrer, imprimer, exporter, assigner lot/livreur.
3. Admin suit l’historique via `/megafast/colis/:id`, et peut marquer livré / annuler selon règles UI.

### Flux B — Parcours client
1. Client voit ses statistiques `/client/dashboard`.
2. Client crée un colis `/client/shipments/create`.
3. Client consulte `/client/shipments` et peut “Suivre” ou ouvrir le détail.
4. Client peut faire une recherche directe `/client/shipments/track` par code de suivi.

### Flux C — Parcours livreur
1. Driver voit son dashboard `/driver/dashboard`.
2. Driver ouvre `/driver/shipments` pour consulter les colis assignés, filtrer, et mettre à jour le traitement/livraison.
3. En cas de problème, un échec peut être enregistré (modals dédiés), alimentant les données de suivi.

## 6) Données (niveau fonctionnel)

Collections Firestore identifiées dans le code:
- `shipments` (colis)
- `clients`
- `drivers`
- `users` (comptes/roles)
- `delivery_attempts` (tentatives/échecs)
- `locations`, `tracking_sessions`, `location_history` (tracking)

---

Si tu veux, je peux maintenant:
1) transformer ce récap en “spec” plus formelle (règles métier par statut + permissions), ou
2) produire une checklist QA par portail (scénarios de tests manuels).
