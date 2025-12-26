# Roadmap Tickets P0–P3 — MegaFast

Format: **Ticket** (Priorité) → Objectif → Périmètre → Critères d’acceptation.

> Note: cette liste est orientée “exécution”. Elle reprend les risques déjà identifiés (sécurité, cohérence de données, scalabilité) et les convertit en tickets actionnables.

---

## P0 — Bloquants / sécurité / risques élevés

### T0.1 — Sécuriser les rôles côté serveur (Custom Claims + guards fiables)
- Objectif: ne plus “faire confiance” à un rôle stocké côté client.
- Périmètre:
  - Ajout/gestion de **custom claims** Firebase Auth (admin/client/driver).
  - Durcir les guards (`AdminGuard`, `ClientGuard`, `DriverGuard`) pour vérifier un token/claim.
  - Mise à jour des flows de création d’utilisateurs (admin crée driver/client) pour set claims.
- Critères d’acceptation:
  - Un utilisateur sans claim `admin` ne peut pas accéder à `/megafast/*` même si le localStorage est modifié.
  - Les guards bloquent correctement et redirigent proprement.
  - Les claims sont visibles après refresh token.

### T0.2 — Revoir/poser les Firestore Security Rules (shipments, users, clients, drivers)
- Objectif: empêcher lecture/écriture non autorisée via accès direct Firestore.
- Périmètre:
  - Rules pour collections: `shipments`, `users`, `clients`, `drivers`, `delivery_attempts`, `locations`, `tracking_sessions`, `location_history`.
  - Règles minimales attendues:
    - **Admin**: accès complet.
    - **Client**: accès limité à ses colis (`clientId == auth.uid` ou mapping équivalent).
    - **Driver**: accès limité aux colis assignés (`assignedTo == driverId`/mapping).
- Critères d’acceptation:
  - Les opérations interdites échouent en émulateur / tests manuels.
  - Les portails Client/Driver continuent de fonctionner pour leurs données.

### T0.3 — Corriger la incohérence de statut `picked_up`
- Objectif: éviter états “fantômes” (UI driver utilise `picked_up` mais modèle/labels peuvent diverger).
- Périmètre:
  - Décision produit: **ajouter** `picked_up` au modèle global OU remplacer par un statut existant.
  - Alignement: labels, badges, transitions autorisées, filtres.
- Critères d’acceptation:
  - Un statut unique, normalisé, est utilisé sur Admin/Client/Driver.
  - Aucune référence à un statut non déclaré n’existe dans le code.

### T0.4 — Normaliser la source de vérité “profil driver/client”
- Objectif: éviter que `assignedTo`, `driverId`, `clientId` se basent sur des valeurs incohérentes (id doc vs uid auth).
- Périmètre:
  - Clarifier mapping: `auth.uid` ↔ doc `drivers/{id}` / `clients/{id}`.
  - Unifier: comment on récupère “current driver/client id” dans les services.
- Critères d’acceptation:
  - Les requêtes Firestore (driver/client) ne cassent pas selon la façon dont les comptes ont été créés.

---

## P1 — Cohérence data & robustesse (fort ROI)

### T1.1 — Remplacer `notes` “META: {json}” par des champs structurés
- Objectif: arrêter de stocker des données structurées dans une chaîne de texte.
- Périmètre:
  - Introduire un champ `meta`/`orderMeta` (items, fees, totals, etc.).
  - Migration progressive: lecture rétrocompatible (si META existe) + écriture vers champs.
- Critères d’acceptation:
  - Les écrans Client (liste/détails) affichent produits/frais via champs structurés.
  - Les nouveaux colis ne génèrent plus de `META:` dans `notes`.

### T1.2 — Encadrer les transitions de statut (state machine légère)
- Objectif: éviter des transitions incohérentes (ex: delivered → in_transit).
- Périmètre:
  - Définir transitions autorisées (admin & driver).
  - Appliquer côté UI et côté service (validation avant update).
- Critères d’acceptation:
  - Une transition interdite est bloquée avec message clair.
  - Historique (`history`) reflète uniquement transitions valides.

### T1.3 — Réduire le filtrage “client-side” et sécuriser les indexes Firestore
- Objectif: performance/scalabilité en production (volumes de `shipments`).
- Périmètre:
  - Requêtes driver/client/admin: privilégier filtres Firestore (where/orderBy/limit).
  - Documenter/ajouter indexes nécessaires (Firestore index suggestions).
- Critères d’acceptation:
  - Les pages principales restent rapides avec >10k shipments (au moins en approche).
  - Les erreurs d’index (Firestore) sont résolues/documentées.

### T1.4 — Centraliser la gestion des erreurs Firestore/Auth (UX + logs)
- Objectif: messages utilisateur cohérents + logs exploitables.
- Périmètre:
  - Harmoniser `GlobalErrorHandler` / toastr.
  - Normaliser messages sur erreurs fréquentes (permission-denied, unauthenticated, unavailable).
- Critères d’acceptation:
  - Les erreurs de rules (permission) affichent un message “accès refusé” propre.

---

## P2 — Qualité / maintenabilité / dette technique

### T2.1 — Migrer progressivement AngularFire compat vers API modulaire
- Objectif: réduire dette et améliorer tree-shaking/perfs.
- Périmètre:
  - Services critiques d’abord (`ShipmentService`, `ClientShipmentService`, `DriverPortalService`).
- Critères d’acceptation:
  - Aucun comportement fonctionnel régressif sur les écrans principaux.

### T2.2 — Typage strict des modèles et payloads Firestore
- Objectif: réduire les `any`, clarifier champs optionnels, sécuriser refactors.
- Périmètre:
  - `Shipment`, `DeliveryAttempt`, `Driver`, `Client`.
  - Utilitaires de parsing `Timestamp` / dates.
- Critères d’acceptation:
  - Réduction mesurable des `any` dans core/services/models.

### T2.3 — Nettoyage des composants inline-template (driver portal)
- Objectif: lisibilité, séparation HTML/TS, meilleurs tests.
- Périmètre:
  - Extraire `template` inline vers `.html` au moins pour `DriverShipmentsComponent` (et éventuellement dashboard).
- Critères d’acceptation:
  - Build OK, styles inchangés, pas de regression.

### T2.4 — Standardiser la nomenclature des champs d’adresse
- Objectif: éviter duplications (`address` vs `recipientAddressLine1`, `city` vs `pickupCity`, etc.).
- Périmètre:
  - Définir une structure d’adresse (pickup/delivery).
  - Adapter UI + services progressivement.
- Critères d’acceptation:
  - Un nouveau colis stocke pickup/delivery de façon consistante.

---

## P3 — Améliorations produit / UX (non critiques)

### T3.1 — Spéc fonctionnelle “Statuts” + “Permissions” (doc)
- Objectif: documenter clairement qui peut faire quoi selon le statut.
- Périmètre:
  - Tableau: statuts, transitions, rôles autorisés, effets (history, timestamps).
- Critères d’acceptation:
  - Document validé et utilisé comme référence pour dev.

### T3.2 — Checklist QA par portail + scénarios de test
- Objectif: répétabilité des tests manuels avant release.
- Périmètre:
  - Admin: create/edit/list/detail/export
  - Client: create/list/track
  - Driver: list/update/failure
- Critères d’acceptation:
  - Checklist exécutable en 20–30 min, couvrant les flows critiques.

---

## Recommandation d’ordre d’exécution
1. P0.1 + P0.2 (sécurité)
2. P0.3 + P0.4 (cohérence statuts/identités)
3. P1.1 (meta structuré) + P1.2 (transitions)
4. P1.3 (requêtes/index)

Si tu me dis ton choix Firebase (claims via Cloud Functions, ou via panneau admin + fonction callable), je peux ensuite découper **T0.1/T0.2** en sous-tickets techniques ultra précis (fichiers, étapes, critères).
