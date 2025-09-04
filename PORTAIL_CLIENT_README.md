# Portail Client - Documentation

## 🎯 Vue d'ensemble

Le portail client a été créé avec succès dans votre application Angular/Firebase. Il permet aux clients de:

1. **Se connecter** avec leur compte client
2. **Voir uniquement leurs propres colis** dans un tableau de bord simple 
3. **Ajouter de nouveaux colis**
4. **Suivre l'état et la position** de leurs colis

## 📁 Structure des fichiers créés

### 1. **Architecture du portail client**
```
src/app/features/client-portal/
├── client-portal.routes.ts           # Routes du portail client
├── dashboard/
│   └── dashboard.component.ts        # Tableau de bord client
├── shipments/
│   ├── list/
│   │   └── list.component.ts         # Liste des colis du client
│   ├── create/
│   │   └── create.component.ts       # Création de nouveaux colis
│   └── track/
│       └── track.component.ts        # Suivi de colis
└── profile/
    └── profile.component.ts          # Profil client
```

### 2. **Layout client séparé**
```
src/app/layouts/client-layout/
├── client-layout.component.ts        # Layout principal client
├── client-sidebar/
│   └── client-sidebar.component.ts   # Menu latéral simplifié
└── client-topbar/
    └── client-topbar.component.ts    # Barre de navigation
```

### 3. **Services et sécurité**
```
src/app/core/
├── services/
│   ├── auth.service.ts               # Service d'authentification mis à jour
│   └── client-shipment.service.ts   # Service de gestion des colis clients
└── guards/
    ├── admin.guard.ts                # Protection des routes admin
    └── client.guard.ts               # Protection des routes client
```

## 🔐 Gestion des rôles

### Service d'authentification mis à jour
- **Détection automatique du rôle** lors de la connexion
- **Stockage sécurisé** des informations utilisateur
- **Méthodes utilitaires**: `isAdmin()`, `isClient()`, `isDriver()`
- **Client ID** automatiquement récupéré pour les clients

### Guards de sécurité
- **AdminGuard**: Protège les routes administrateur
- **ClientGuard**: Protège les routes client
- **Redirection automatique** selon le rôle

## 🚀 Fonctionnalités du portail client

### 1. **Dashboard Client**
- **Statistiques** personnalisées (total colis, en transit, livrés, etc.)
- **Derniers colis** avec statut et détails
- **Actions rapides** (nouveau colis, suivi, liste)

### 2. **Gestion des Colis**
- **Liste filtrée** par client automatiquement
- **Recherche** par code de suivi
- **Filtrage** par statut
- **Création** avec formulaire complet
- **Suivi détaillé** avec historique

### 3. **Suivi de Colis**
- **Recherche** par code de suivi
- **Historique complet** avec timeline
- **Informations détaillées** du colis
- **Position géographique** (si disponible)

### 4. **Profil Client**
- **Modification** des informations personnelles
- **Gestion de l'adresse**
- **Informations du compte**
- **Sécurité** (changement de mot de passe)

## 🔧 Configuration technique

### Routes principales mises à jour
```typescript
// app.routes.ts
{
  path: 'client',
  component: ClientLayoutComponent,
  canActivate: [AuthGuard, ClientGuard],
  children: CLIENT_PORTAL_ROUTES,
}
```

### Service de filtrage des données
```typescript
// ClientShipmentService
- getClientShipments(): Récupère uniquement les colis du client connecté
- createShipment(): Crée un colis avec clientId automatique
- searchByBarcode(): Recherche dans les colis du client
- getClientStats(): Statistiques personnalisées
```

### Menu client simplifié
- **Mon Espace Client**
- **Mes Colis** (liste, création, suivi)
- **Mon Compte** (profil)

## 🎨 Interface utilisateur

### Design cohérent
- **Même thème** que l'interface admin
- **Menu simplifié** pour les clients
- **Navigation intuitive**
- **Responsive design**

### Composants réutilisables
- **Badges de statut** colorés
- **Timeline** pour l'historique
- **Cartes statistiques**
- **Formulaires validés**

## 🔄 Workflow client typique

1. **Connexion** → Redirection automatique vers `/client`
2. **Dashboard** → Vue d'ensemble des colis
3. **Nouveau colis** → Formulaire de création
4. **Suivi** → Recherche et historique détaillé
5. **Profil** → Gestion des informations

## 🚦 Prochaines étapes recommandées

### Immédiat
1. **Tester** la connexion avec un compte client
2. **Créer** quelques colis de test
3. **Vérifier** le filtrage des données

### Améliorations futures
1. **Notifications** en temps réel
2. **API de géolocalisation** pour le suivi
3. **Export PDF** des colis
4. **Historique des factures**
5. **Chat support** intégré

## 📝 Notes importantes

- **Sécurité**: Tous les données sont filtrées par clientId
- **Performance**: Requêtes optimisées avec limits
- **Évolutivité**: Architecture modulaire et extensible
- **Maintenance**: Code documenté et structuré

Le portail client est maintenant prêt à être utilisé et peut être facilement étendu selon vos besoins !
