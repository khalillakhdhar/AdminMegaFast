# Client Authentication System - Guide d'utilisation

## Vue d'ensemble

Le système d'authentification pour les clients permet aux administrateurs de créer des comptes utilisateurs pour les clients et de gérer ces comptes via l'interface d'administration. Le système utilise Firebase Auth avec des Cloud Functions pour la gestion sécurisée des comptes.

## Fonctionnalités

### 1. Création de compte client
- L'administrateur peut créer un compte utilisateur pour un client existant
- Un mot de passe temporaire est généré automatiquement
- Le mot de passe est affiché dans la console et via toastr (pas d'email automatique)
- L'administrateur doit communiquer manuellement les détails du compte au client

### 2. Gestion des comptes
- **Réinitialisation de mot de passe** : Envoie un email de réinitialisation Firebase Auth
- **Désactivation de compte** : Désactive le compte dans Firebase Auth (via Cloud Function)
- **Réactivation de compte** : Réactive un compte désactivé (via Cloud Function)
- **Suppression de compte** : Supprime complètement le compte de Firebase Auth (via Cloud Function)

### 3. Cloud Functions pour Firebase Auth

#### Fonctions disponibles:
- `deleteUserAccount(uid)` - Supprime complètement un utilisateur Firebase Auth
- `disableUserAccount(uid)` - Désactive un utilisateur Firebase Auth
- `enableUserAccount(uid)` - Réactive un utilisateur Firebase Auth
- `cleanupUserData` - Trigger automatique qui nettoie les données lors de suppression d'utilisateur

#### Déploiement des Cloud Functions:
```bash
cd firebase-functions
npm install
firebase deploy --only functions
```

## Structure des fichiers

### Services Angular
- `ClientService` - Service principal pour la gestion des clients et authentification
- `FirebaseAdminService` - Interface pour appeler les Cloud Functions
- `EmailService` - Service pour les modèles d'email (optionnel)

### Modèles
- `Client` - Modèle client avec champs d'authentification (`hasAccount`, `userId`, `temporaryPassword`)
- `ClientUser` - Interface pour les documents utilisateurs Firebase

### Composants
- `ListComponent` - Interface de liste des clients avec contrôles d'authentification

### Cloud Functions
- `firebase-functions/index.js` - Fonctions Firebase pour la gestion réelle des comptes Auth

## Workflow d'authentification

### 1. Créer un compte pour un client
1. Aller dans la liste des clients
2. Cocher "Créer un compte utilisateur" lors de la création d'un client, OU
3. Cliquer sur le bouton "+" (user-plus) pour un client existant sans compte
4. Le système génère un mot de passe temporaire
5. Le mot de passe s'affiche dans la console et via notification toastr
6. L'administrateur communique manuellement les détails au client

### 2. Gérer un compte existant
- **Réinitialiser mot de passe** : Bouton "🔄" - Envoie un email Firebase Auth
- **Désactiver compte** : Bouton "❌" - Désactive dans Firebase Auth
- **Réactiver compte** : Bouton "✅" - Réactive dans Firebase Auth (visible sur comptes désactivés)

### 3. Statuts de compte
- **Pas de compte** : Client sans compte utilisateur
- **Compte actif** : Compte Firebase Auth actif
- **Compte désactivé** : Compte Firebase Auth désactivé

## Configuration requise

### 1. Firebase Configuration
```typescript
// Dans environment.ts
export const environment = {
  firebase: {
    projectId: 'your-project-id',
    // ... autres configs
  }
};
```

### 2. Modules Angular nécessaires
```typescript
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireFunctionsModule } from '@angular/fire/compat/functions';
```

### 3. Cloud Functions Setup
```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Initialiser les functions (si pas déjà fait)
firebase init functions

# Déployer
firebase deploy --only functions
```

## Sécurité

### 1. Cloud Functions
- Utilisent Firebase Admin SDK pour les opérations privilégiées
- Authentification obligatoire pour appeler les fonctions
- Validation des paramètres côté serveur

### 2. Permissions
- Seuls les administrateurs peuvent créer/gérer les comptes clients
- Les clients ne peuvent pas modifier leurs propres comptes via cette interface

## Dépannage

### Erreurs communes

1. **Cloud Function indisponible**
   - Le système utilise un fallback pour les opérations locales
   - Vérifier le déploiement des Cloud Functions

2. **Email invalide**
   - Vérifier que le client a une adresse email valide
   - Firebase Auth requiert un email valide

3. **Permissions Firebase**
   - Vérifier les règles Firestore
   - Vérifier les permissions Firebase Auth

### Logs utiles
- Console navigateur : Affiche les mots de passe temporaires
- Firebase Console : Logs des Cloud Functions
- Firestore Console : État des documents clients/utilisateurs

## Migration depuis l'ancien système

Si vous migrez depuis un système sans authentification :
1. Les champs `hasAccount`, `userId`, `temporaryPassword` sont optionnels
2. Les clients existants sans compte continuent de fonctionner
3. Ajouter progressivement des comptes selon les besoins

## Notes importantes

1. **Mots de passe temporaires** : Affichés uniquement lors de la création, non stockés de façon permanente
2. **Communication manuelle** : L'administrateur doit communiquer les détails de connexion au client
3. **Cloud Functions obligatoires** : Pour les vraies opérations Firebase Auth (disable/enable/delete)
4. **Backup recommandé** : Toujours tester sur un environnement de développement d'abord

Pour les clients déjà créés sans compte, il est possible de créer un compte utilisateur ultérieurement.

**Processus :**
1. Dans la liste des clients, identifier un client sans compte (badge "Pas de compte")
2. Cliquer sur le bouton vert avec l'icône "user-plus"
3. Confirmer la création du compte
4. Le système génère le compte et envoie l'email de bienvenue

### 3. Gestion des comptes existants

Pour les clients ayant déjà un compte, plusieurs actions sont disponibles :

#### Réinitialisation du mot de passe
- Bouton orange avec icône "reset"
- Envoie un email de réinitialisation de mot de passe via Firebase Auth
- Le client peut définir un nouveau mot de passe en toute sécurité

#### Désactivation du compte
- Bouton gris avec icône "user-x"
- Désactive le compte utilisateur et le client dans la base de données
- Le client ne peut plus se connecter

## Statuts des comptes

Le tableau des clients affiche une nouvelle colonne "Compte" avec les statuts suivants :

- **Badge gris "Pas de compte"** : Le client n'a pas de compte utilisateur
- **Badge vert "Compte actif"** : Le client a un compte actif avec date de création
- **Badge orange "Compte désactivé"** : Le compte du client a été désactivé

## Email de création de compte

Lorsqu'un compte est créé, le client reçoit un email contenant :

- Message de bienvenue personnalisé
- Adresse email de connexion
- Mot de passe temporaire généré automatiquement
- Lien direct vers la page de connexion
- Instructions de sécurité pour changer le mot de passe
- Liste des fonctionnalités disponibles dans le portail client

### Exemple d'email

```
Sujet: Votre compte MegaFast a été créé - Informations de connexion

Bonjour [Nom du client],

Votre compte client MegaFast a été créé avec succès par notre équipe administrative.

Vos informations de connexion :
Email : client@example.com
Mot de passe temporaire : Xy9#mK8pL2

Important : Pour des raisons de sécurité, nous vous recommandons fortement 
de changer ce mot de passe temporaire lors de votre première connexion.

[Bouton: Se connecter maintenant]

Que pouvez-vous faire avec votre compte ?
• Consulter vos commandes et factures
• Suivre le statut de vos demandes
• Mettre à jour vos informations de contact
• Accéder à l'historique de vos transactions
```

## Sécurité

### Génération des mots de passe temporaires
- Longueur de 12 caractères
- Inclusion obligatoire de : majuscules, minuscules, chiffres, caractères spéciaux
- Algorithme de mélange aléatoire
- Pas de stockage en texte clair dans la base de données

### Authentification Firebase
- Utilisation de Firebase Authentication pour la gestion sécurisée des comptes
- Hashage automatique des mots de passe
- Fonctionnalités de récupération de mot de passe intégrées
- Gestion des sessions sécurisées

### Données stockées
- **Clients** : informations client avec références au compte utilisateur
- **Users** : données utilisateur Firebase avec rôle "client"
- **Audit** : dates de création et dernière connexion trackées

## API et Services

### EmailService
- `generateTemporaryPassword()` : Génère un mot de passe sécurisé
- `createAccountCreationTemplate()` : Crée le template d'email HTML/text
- `simulateEmailSending()` : Simule l'envoi d'email (à remplacer par vraie intégration)

### ClientService (Nouvelles méthodes)
- `createWithAccount()` : Crée un client avec option de compte utilisateur
- `createAccountForClient()` : Crée un compte pour un client existant
- `resetClientPassword()` : Réinitialise le mot de passe via Firebase
- `disableAccount()` : Désactive un compte client
- `getClientByUserId()` : Récupère un client par son ID utilisateur Firebase

## Intégration Email (À configurer)

Actuellement, le système simule l'envoi d'emails. Pour une implémentation complète, intégrer avec :

### Services recommandés
- **SendGrid** : API simple, bonne délivrabilité
- **AWS SES** : Économique, intégration AWS
- **Mailgun** : Robuste, bonnes analytics
- **Nodemailer** : Solution backend Node.js

### Configuration type
```typescript
// Exemple avec SendGrid
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: client.email,
  from: 'noreply@megafast.com',
  subject: 'Votre compte MegaFast a été créé',
  html: emailTemplate.html,
  text: emailTemplate.text
};

await sgMail.send(msg);
```

## Interface utilisateur

### Nouvelle colonne "Compte"
- Affichage du statut du compte
- Date de création du compte si applicable
- Badges colorés pour identification rapide

### Boutons d'action améliorés
- **Vert** : Créer un compte (visible si pas de compte et email présent)
- **Orange** : Réinitialiser mot de passe (visible si compte actif)
- **Gris** : Désactiver compte (visible si compte actif)

### Modal de création enrichi
- Checkbox "Créer un compte utilisateur"
- Message informatif sur les prérequis (email obligatoire)
- Validation améliorée pour la création de compte

## Workflow complet

```
1. Admin crée nouveau client
   ↓
2. Coche "Créer un compte utilisateur"
   ↓
3. Système génère mot de passe temporaire
   ↓
4. Création compte Firebase
   ↓
5. Sauvegarde client avec référence compte
   ↓
6. Envoi email de bienvenue
   ↓
7. Client reçoit email avec identifiants
   ↓
8. Client se connecte et change mot de passe
```

## Prochaines étapes

1. **Intégration email réelle** : Remplacer la simulation par un vrai service
2. **Portail client** : Créer l'interface client pour la connexion
3. **Notifications avancées** : SMS, notifications push
4. **Audit trail** : Logging détaillé des actions d'authentification
5. **Permissions avancées** : Gestion granulaire des droits clients

Cette implémentation fournit une base solide pour un système d'authentification client sécurisé et évolutif.
