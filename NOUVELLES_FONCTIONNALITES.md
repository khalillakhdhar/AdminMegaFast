# Nouvelles Fonctionnalités - Admin & Colis

## 1. Création d'Utilisateurs Admin lors du Signup

### Fonctionnalité
Lors de l'inscription, les utilisateurs sont automatiquement créés en tant qu'administrateurs et sauvegardés dans Firestore.

### Détails Techniques
- **Service Modifié**: `src/app/core/services/auth.service.ts`
- **Méthode**: `register()`
- **Base de Données**: Firebase Auth + Firestore
- **Rôle**: Admin par défaut

### Structure des Données Firestore
```typescript
{
  uid: string,
  email: string,
  displayName: string,
  role: 'admin',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 2. Création de Colis Améliorée

### Fonctionnalités Principales
1. **Sélection de Client** : Choisir le client depuis une liste déroulante
2. **Auto-Import d'Adresse** : Import automatique des coordonnées du client
3. **Gouvernorats Tunisiens** : Liste complète des 24 gouvernorats de Tunisie
4. **Délégations** : 264 délégations avec sélection en cascade

### Services Créés
- **Service Locations**: `src/app/core/services/tunisia-locations.service.ts`
- **Données Complètes**: Gouvernorats et délégations avec noms arabes

### Interface Utilisateur
- **Sélection Client**: Dropdown avec ng-select
- **Adresse Auto-Import**: Remplissage automatique depuis le client
- **Sélection Gouvernorat**: Dropdown avec recherche
- **Sélection Délégation**: Dépendante du gouvernorat sélectionné

### Gouvernorats Inclus (24)
1. Tunis, 2. Ariana, 3. Ben Arous, 4. La Manouba, 5. Nabeul, 6. Zaghouan, 7. Bizerte, 8. Béja, 9. Jendouba, 10. Le Kef, 11. Siliana, 12. Kairouan, 13. Kasserine, 14. Sidi Bouzid, 15. Sousse, 16. Monastir, 17. Mahdia, 18. Sfax, 19. Gafsa, 20. Tozeur, 21. Kebili, 22. Gabès, 23. Médenine, 24. Tataouine

### Modèle de Données Étendu
```typescript
export interface Shipment {
  // ... autres champs existants
  clientEmail?: string;
  pickupGeoCoordinates?: {
    latitude: number;
    longitude: number;
  };
  deliveryGeoCoordinates?: {
    latitude: number;
    longitude: number;
  };
}
```

## 3. Fonctionnalités Futures Planifiées

### Coordonnées GPS
- Import automatique des coordonnées GPS des clients
- Géolocalisation automatique
- Intégration avec services de cartographie

### Impression Avancée
- Templates d'impression personnalisés
- QR codes pour suivi
- Étiquettes d'expédition automatiques

## 4. Instructions de Test

### Test Admin Signup
1. Aller sur la page d'inscription
2. Créer un nouveau compte
3. Vérifier dans Firestore que l'utilisateur est créé avec le rôle 'admin'

### Test Création Colis
1. Naviguer vers "Créer Colis"
2. Sélectionner un client dans la liste
3. Vérifier l'auto-import de l'adresse
4. Choisir un gouvernorat et délégation
5. Compléter et sauvegarder le formulaire

## 5. Configuration Requise
- Angular 15+
- Firebase 9+
- ng-select pour les dropdowns
- Connexion Firestore active
