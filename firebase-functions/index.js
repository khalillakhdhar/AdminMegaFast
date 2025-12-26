// Cloud Function pour la gestion des comptes utilisateurs Firebase
// Déployez cette fonction dans Firebase Functions

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// ============================================================================
// CUSTOM CLAIMS - Gestion sécurisée des rôles
// ============================================================================

/**
 * Cloud Function pour définir les custom claims d'un utilisateur
 * Appelée lors de la création d'un compte ou pour modifier un rôle
 *
 * @param {string} userId - L'UID de l'utilisateur
 * @param {string} role - Le rôle: 'admin' | 'client' | 'driver'
 * @param {string} clientId - L'ID du client (si role === 'client')
 * @param {string} driverId - L'ID du driver (si role === 'driver')
 */
exports.setUserRole = functions.https.onCall(async (data, context) => {
  // Vérifier que l'appelant est admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Seuls les administrateurs peuvent définir les rôles utilisateur."
    );
  }

  const { userId, role, clientId, driverId } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId est requis."
    );
  }

  if (!role || !["admin", "client", "driver"].includes(role)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      'role doit être "admin", "client" ou "driver".'
    );
  }

  try {
    // Construire les custom claims
    const customClaims = {
      role: role,
      admin: role === "admin",
      client: role === "client",
      driver: role === "driver",
    };

    if (role === "client" && clientId) {
      customClaims.clientId = clientId;
    }
    if (role === "driver" && driverId) {
      customClaims.driverId = driverId;
    }

    // Définir les custom claims sur le user Firebase Auth
    await admin.auth().setCustomUserClaims(userId, customClaims);

    // Mettre à jour le document Firestore pour cohérence
    await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .update({
        role: role,
        clientId: clientId || null,
        driverId: driverId || null,
        claimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(`Custom claims définis pour ${userId}:`, customClaims);

    return {
      success: true,
      message: `Rôle "${role}" défini avec succès pour l'utilisateur.`,
      userId: userId,
      claims: customClaims,
    };
  } catch (error) {
    console.error("Erreur lors de la définition des claims:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erreur lors de la définition du rôle: " + error.message
    );
  }
});

/**
 * Cloud Function pour initialiser le premier admin
 * À appeler UNE SEULE FOIS pour le setup initial
 * Sécurisée par un secret ou appelée manuellement
 */
exports.initializeFirstAdmin = functions.https.onCall(async (data, context) => {
  // Cette fonction ne peut être appelée que si aucun admin n'existe
  // ou avec un secret de configuration

  const { userId, setupSecret } = data;

  // Vérifier le secret de setup (à définir dans Firebase config)
  const expectedSecret =
    functions.config().setup?.secret || "MEGAFAST_INIT_2024";
  if (setupSecret !== expectedSecret) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Secret de configuration invalide."
    );
  }

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId est requis."
    );
  }

  try {
    // Définir les claims admin
    const customClaims = {
      role: "admin",
      admin: true,
      client: false,
      driver: false,
    };

    await admin.auth().setCustomUserClaims(userId, customClaims);

    // Mettre à jour Firestore
    await admin.firestore().collection("users").doc(userId).set(
      {
        role: "admin",
        isActive: true,
        claimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`Premier admin initialisé: ${userId}`);

    return {
      success: true,
      message: "Premier administrateur initialisé avec succès.",
      userId: userId,
    };
  } catch (error) {
    console.error("Erreur lors de l'initialisation admin:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erreur: " + error.message
    );
  }
});

/**
 * Trigger: définir automatiquement les claims lors de la création d'un document users
 * Cela permet de synchroniser les claims quand un admin crée un user via l'interface
 */
exports.onUserDocumentCreated = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;
    const userData = snap.data();

    if (!userData.role) {
      console.log(`Pas de rôle défini pour ${userId}, skip claims setup`);
      return null;
    }

    try {
      const customClaims = {
        role: userData.role,
        admin: userData.role === "admin",
        client: userData.role === "client",
        driver: userData.role === "driver",
      };

      if (userData.role === "client" && userData.clientId) {
        customClaims.clientId = userData.clientId;
      }
      if (userData.role === "driver" && userData.driverId) {
        customClaims.driverId = userData.driverId;
      }

      await admin.auth().setCustomUserClaims(userId, customClaims);

      // Marquer que les claims ont été définis
      await snap.ref.update({
        claimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `Claims auto-définis pour nouveau user ${userId}:`,
        customClaims
      );
      return { success: true };
    } catch (error) {
      console.error(`Erreur auto-claims pour ${userId}:`, error);
      return { success: false, error: error.message };
    }
  });

/**
 * Trigger: synchroniser les claims si le rôle change dans Firestore
 */
exports.onUserRoleUpdated = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const userId = context.params.userId;
    const before = change.before.data();
    const after = change.after.data();

    // Ne rien faire si le rôle n'a pas changé
    if (
      before.role === after.role &&
      before.clientId === after.clientId &&
      before.driverId === after.driverId
    ) {
      return null;
    }

    try {
      const customClaims = {
        role: after.role,
        admin: after.role === "admin",
        client: after.role === "client",
        driver: after.role === "driver",
      };

      if (after.role === "client" && after.clientId) {
        customClaims.clientId = after.clientId;
      }
      if (after.role === "driver" && after.driverId) {
        customClaims.driverId = after.driverId;
      }

      await admin.auth().setCustomUserClaims(userId, customClaims);

      await change.after.ref.update({
        claimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Claims mis à jour pour ${userId}:`, customClaims);
      return { success: true };
    } catch (error) {
      console.error(`Erreur mise à jour claims pour ${userId}:`, error);
      return { success: false, error: error.message };
    }
  });

// ============================================================================
// FONCTIONS ADMIN EXISTANTES (mises à jour pour utiliser les claims)
// ============================================================================

/**
 * Cloud Function pour supprimer complètement un utilisateur Firebase Auth
 * Appelée depuis l'application Admin
 */
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  // Vérifier que l'utilisateur appelant est un admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Seuls les administrateurs peuvent supprimer des comptes utilisateur."
    );
  }

  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId est requis."
    );
  }

  try {
    // Supprimer l'utilisateur de Firebase Auth
    await admin.auth().deleteUser(userId);

    // Supprimer le document utilisateur de Firestore
    await admin.firestore().collection("users").doc(userId).delete();

    console.log("Utilisateur supprimé avec succès:", userId);

    return {
      success: true,
      message: "Utilisateur supprimé avec succès",
      userId: userId,
    };
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erreur lors de la suppression de l'utilisateur: " + error.message
    );
  }
});

/**
 * Cloud Function pour désactiver un utilisateur Firebase Auth
 */
exports.disableUserAccount = functions.https.onCall(async (data, context) => {
  // Vérifier que l'utilisateur appelant est un admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Seuls les administrateurs peuvent désactiver des comptes utilisateur."
    );
  }

  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId est requis."
    );
  }

  try {
    // Désactiver l'utilisateur dans Firebase Auth
    await admin.auth().updateUser(userId, {
      disabled: true,
    });

    // Mettre à jour le statut dans Firestore
    await admin.firestore().collection("users").doc(userId).update({
      isActive: false,
      disabledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Utilisateur désactivé avec succès:", userId);

    return {
      success: true,
      message: "Utilisateur désactivé avec succès",
      userId: userId,
    };
  } catch (error) {
    console.error("Erreur lors de la désactivation de l'utilisateur:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erreur lors de la désactivation de l'utilisateur: " + error.message
    );
  }
});

/**
 * Cloud Function pour réactiver un utilisateur Firebase Auth
 */
exports.enableUserAccount = functions.https.onCall(async (data, context) => {
  // Vérifier que l'utilisateur appelant est un admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Seuls les administrateurs peuvent réactiver des comptes utilisateur."
    );
  }

  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId est requis."
    );
  }

  try {
    // Réactiver l'utilisateur dans Firebase Auth
    await admin.auth().updateUser(userId, {
      disabled: false,
    });

    // Mettre à jour le statut dans Firestore
    await admin.firestore().collection("users").doc(userId).update({
      isActive: true,
      enabledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Utilisateur réactivé avec succès:", userId);

    return {
      success: true,
      message: "Utilisateur réactivé avec succès",
      userId: userId,
    };
  } catch (error) {
    console.error("Erreur lors de la réactivation de l'utilisateur:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erreur lors de la réactivation de l'utilisateur: " + error.message
    );
  }
});

/**
 * Trigger pour nettoyer les données quand un utilisateur est supprimé
 */
exports.cleanupUserData = functions.auth.user().onDelete(async (user) => {
  const userId = user.uid;

  try {
    // Supprimer le document utilisateur de Firestore si il existe encore
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    if (userDoc.exists) {
      await userDoc.ref.delete();
      console.log("Document utilisateur supprimé de Firestore:", userId);
    }

    // Mettre à jour le client correspondant pour retirer la référence au compte
    const clientQuery = await admin
      .firestore()
      .collection("clients")
      .where("userId", "==", userId)
      .get();

    if (!clientQuery.empty) {
      const batch = admin.firestore().batch();
      clientQuery.docs.forEach((doc) => {
        batch.update(doc.ref, {
          hasAccount: false,
          userId: admin.firestore.FieldValue.delete(),
          temporaryPassword: admin.firestore.FieldValue.delete(),
          accountCreatedAt: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      console.log("Références client mises à jour pour userId:", userId);
    }
  } catch (error) {
    console.error("Erreur lors du nettoyage des données:", error);
  }
});
