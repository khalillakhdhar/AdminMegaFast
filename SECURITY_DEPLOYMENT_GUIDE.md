# Guide de déploiement — Sécurité Custom Claims + Firestore Rules

Ce guide explique comment déployer les améliorations de sécurité pour MegaFast.

---

## 1. Prérequis

- Firebase CLI installé: `npm install -g firebase-tools`
- Connecté à Firebase: `firebase login`
- Projet Firebase configuré: `firebase use livraison-97b8b`

---

## 2. Déployer les Cloud Functions

Les Cloud Functions gèrent les Custom Claims (rôles sécurisés côté serveur).

### 2.1 Installer les dépendances

```bash
cd firebase-functions
npm install
```

### 2.2 Configurer le secret d'initialisation (optionnel)

```bash
firebase functions:config:set setup.secret="VOTRE_SECRET_SECURISE"
```

### 2.3 Déployer les fonctions

```bash
firebase deploy --only functions
```

### Fonctions déployées:

| Fonction | Description |
|----------|-------------|
| `setUserRole` | Définit le rôle d'un utilisateur (admin → user) |
| `initializeFirstAdmin` | Initialise le premier admin (setup initial) |
| `onUserDocumentCreated` | Trigger: définit auto les claims quand un user est créé |
| `onUserRoleUpdated` | Trigger: sync les claims quand le rôle change |
| `deleteUserAccount` | Supprime un compte utilisateur |
| `disableUserAccount` | Désactive un compte utilisateur |
| `enableUserAccount` | Réactive un compte utilisateur |
| `cleanupUserData` | Trigger: nettoie les données quand un user est supprimé |

---

## 3. Déployer les Firestore Security Rules

### 3.1 Déployer les rules

```bash
firebase deploy --only firestore:rules
```

### 3.2 Vérifier les rules

Allez dans la console Firebase > Firestore > Rules et vérifiez que les nouvelles règles sont actives.

---

## 4. Initialiser le premier administrateur

### Option A: Via la console Firebase

1. Allez dans Firebase Console > Authentication > Users
2. Notez l'UID de l'utilisateur à promouvoir admin
3. Ouvrez un terminal et exécutez:

```bash
# Avec firebase-admin (Node.js)
node -e "
const admin = require('firebase-admin');
admin.initializeApp();
admin.auth().setCustomUserClaims('UID_DE_LADMIN', {
  role: 'admin',
  admin: true,
  client: false,
  driver: false
}).then(() => console.log('Admin claims set!'));
"
```

### Option B: Via l'application (Cloud Function)

```typescript
// Dans l'app Angular, après login du premier utilisateur
import { CustomClaimsService } from './core/services/custom-claims.service';

// Appeler avec le secret configuré
await customClaimsService.initializeFirstAdmin(
  'UID_DE_LADMIN',
  'VOTRE_SECRET_SECURISE'
);
```

### Option C: Via le shell Firebase Functions

```bash
firebase functions:shell
> initializeFirstAdmin({userId: 'UID_ICI', setupSecret: 'MEGAFAST_INIT_2024'})
```

---

## 5. Tester la sécurité

### 5.1 Vérifier les claims d'un utilisateur

Dans la console Firebase > Authentication > Users > Cliquez sur un user > Custom Claims

Vous devriez voir:
```json
{
  "role": "admin",
  "admin": true,
  "client": false,
  "driver": false
}
```

### 5.2 Tester les guards Angular

1. Connectez-vous avec un compte admin → devrait accéder à `/megafast`
2. Connectez-vous avec un compte client → devrait être redirigé vers `/client`
3. Connectez-vous avec un compte driver → devrait être redirigé vers `/driver`

### 5.3 Tester les Firestore Rules

Utilisez l'émulateur ou le Firestore Rules Playground:

```bash
firebase emulators:start --only firestore
```

Ou dans la console Firebase > Firestore > Rules > Rules Playground

---

## 6. Migration des utilisateurs existants

Les utilisateurs existants n'ont pas encore de Custom Claims. Options:

### Option A: Migration automatique via trigger

Modifiez légèrement le document `users/{uid}` de chaque utilisateur existant:

```javascript
// Script Node.js
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function migrateUsers() {
  const users = await db.collection('users').get();
  
  for (const doc of users.docs) {
    const userData = doc.data();
    // Trigger onUserRoleUpdated en touchant le document
    await doc.ref.update({
      migratedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Migrated: ${doc.id} (${userData.role})`);
  }
}

migrateUsers();
```

### Option B: Script de migration directe

```javascript
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function setClaimsForAllUsers() {
  const users = await db.collection('users').get();
  
  for (const doc of users.docs) {
    const userData = doc.data();
    const claims = {
      role: userData.role || 'admin',
      admin: userData.role === 'admin' || !userData.role,
      client: userData.role === 'client',
      driver: userData.role === 'driver'
    };
    
    if (userData.clientId) claims.clientId = userData.clientId;
    if (userData.driverId) claims.driverId = userData.driverId;
    
    await admin.auth().setCustomUserClaims(doc.id, claims);
    console.log(`Claims set for ${doc.id}:`, claims);
  }
}

setClaimsForAllUsers();
```

---

## 7. Rollback en cas de problème

### Restaurer les anciennes rules

```bash
# Les anciennes rules sont sauvegardées automatiquement par Firebase
# Allez dans Console > Firestore > Rules > History
```

### Désactiver les guards async

Si les guards async posent problème, vous pouvez temporairement revenir aux vérifications sync en modifiant les guards pour utiliser `authService.isAdmin()` au lieu de `authService.getTokenClaims()`.

---

## 8. Checklist de vérification post-déploiement

- [ ] Cloud Functions déployées et actives
- [ ] Firestore Rules déployées
- [ ] Premier admin initialisé avec custom claims
- [ ] Login admin fonctionne → accès `/megafast`
- [ ] Login client fonctionne → accès `/client` uniquement
- [ ] Login driver fonctionne → accès `/driver` uniquement
- [ ] Client ne peut pas accéder aux colis d'un autre client
- [ ] Driver ne peut pas modifier un colis non assigné
- [ ] Création d'un nouveau driver → claims auto-définis
- [ ] Création d'un nouveau client → claims auto-définis

---

## Support

En cas de problème:
1. Vérifiez les logs Cloud Functions: `firebase functions:log`
2. Vérifiez les erreurs dans la console navigateur
3. Testez les rules dans le Rules Playground

