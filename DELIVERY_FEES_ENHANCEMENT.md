# Améliorations des Frais de Livraison et Chargement Client

## Nouvelles fonctionnalités ajoutées

### 1. Gestion flexible des frais de livraison

#### Champ ajouté au formulaire :
- `includeFeeInTotal` : booléen pour contrôler l'inclusion des frais dans le total

#### Interface utilisateur :
- Checkbox "Inclure les frais dans le total" dans le Step 4 (Delivery & Fees)
- Affichage adaptatif du total :
  - **Frais inclus** : Affiche "Total (frais inclus)"
  - **Frais exclus** : Affiche "Total (hors frais)" + "Total avec frais" en orange

#### Calculs automatiques :
- `grandTotal` : total avec ou sans frais selon l'option
- `grandTotalWithoutFee` : toujours le sous-total sans frais
- `totalWithFees` : toujours le total incluant les frais

### 2. Amélioration du chargement des coordonnées client

#### Fonctionnalité existante conservée :
La méthode `onClientSelect` charge automatiquement :
- Nom, téléphone, email, société du client
- Adresse de récupération (pickup)
- Gouvernorat et délégation si trouvés dans les données

#### Debug ajouté :
- Logs console pour vérifier le chargement des clients
- Logs console pour les changements de mode client

### 3. Getters ajoutés pour simplifier le template

```typescript
get deliveryFee(): number - Retourne les frais de livraison
get includeFeeInTotal(): boolean - Indique si les frais sont inclus
get totalWithFees(): number - Total avec frais (toujours)
```

## Zones d'affichage mises à jour

### Step 4 - Résumé pendant la création :
- Sous-total produits
- Frais de livraison
- Total (avec indication frais inclus/exclus)
- Total avec frais (si frais exclus uniquement)

### Section impression - Aperçu final :
- Même logique d'affichage que le Step 4
- Cohérence visuelle entre création et impression

## Structure du formulaire

```typescript
// Nouveau champ
includeFeeInTotal: [true], // Par défaut, frais inclus

// Champ existant maintenu
deliveryFee: [0, [Validators.min(0)]]
```

## Tests recommandés

1. **Tester l'option frais inclus** :
   - Cocher/décocher "Inclure les frais dans le total"
   - Vérifier que le total change correctement
   - Vérifier l'affichage conditionnel du "Total avec frais"

2. **Tester la sélection client** :
   - Sélectionner un client existant dans le dropdown
   - Vérifier que les coordonnées se chargent automatiquement
   - Tester avec différents clients ayant des adresses

3. **Tester les calculs** :
   - Modifier les quantités/prix des produits
   - Modifier les frais de livraison
   - Vérifier que tous les totaux se mettent à jour

## Interface utilisateur

L'interface permet maintenant deux modes d'affichage des frais :

**Mode frais inclus (par défaut)** :
```
Sous-total produits: 100.00 TND
Frais de livraison: 15.00 TND
─────────────────────────────
Total (frais inclus): 115.00 TND
```

**Mode frais séparés** :
```
Sous-total produits: 100.00 TND
Frais de livraison: 15.00 TND
─────────────────────────────
Total (hors frais): 100.00 TND
Total avec frais: 115.00 TND
```

Cette approche donne plus de flexibilité à l'utilisateur selon ses besoins de présentation et de facturation.
