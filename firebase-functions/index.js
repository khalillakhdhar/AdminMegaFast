// Cloud Function pour la gestion des comptes utilisateurs Firebase
// Déployez cette fonction dans Firebase Functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function pour supprimer complètement un utilisateur Firebase Auth
 * Appelée depuis l'application Admin
 */
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  // Vérifier que l'utilisateur appelant est un admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Seuls les administrateurs peuvent supprimer des comptes utilisateur.'
    );
  }

  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId est requis.'
    );
  }

  try {
    // Supprimer l'utilisateur de Firebase Auth
    await admin.auth().deleteUser(userId);
    
    // Supprimer le document utilisateur de Firestore
    await admin.firestore().collection('users').doc(userId).delete();
    
    console.log('Utilisateur supprimé avec succès:', userId);
    
    return { 
      success: true, 
      message: 'Utilisateur supprimé avec succès',
      userId: userId
    };
    
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Erreur lors de la suppression de l\'utilisateur: ' + error.message
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
      'permission-denied',
      'Seuls les administrateurs peuvent désactiver des comptes utilisateur.'
    );
  }

  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId est requis.'
    );
  }

  try {
    // Désactiver l'utilisateur dans Firebase Auth
    await admin.auth().updateUser(userId, {
      disabled: true
    });
    
    // Mettre à jour le statut dans Firestore
    await admin.firestore().collection('users').doc(userId).update({
      isActive: false,
      disabledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Utilisateur désactivé avec succès:', userId);
    
    return { 
      success: true, 
      message: 'Utilisateur désactivé avec succès',
      userId: userId
    };
    
  } catch (error) {
    console.error('Erreur lors de la désactivation de l\'utilisateur:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Erreur lors de la désactivation de l\'utilisateur: ' + error.message
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
      'permission-denied',
      'Seuls les administrateurs peuvent réactiver des comptes utilisateur.'
    );
  }

  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId est requis.'
    );
  }

  try {
    // Réactiver l'utilisateur dans Firebase Auth
    await admin.auth().updateUser(userId, {
      disabled: false
    });
    
    // Mettre à jour le statut dans Firestore
    await admin.firestore().collection('users').doc(userId).update({
      isActive: true,
      enabledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Utilisateur réactivé avec succès:', userId);
    
    return { 
      success: true, 
      message: 'Utilisateur réactivé avec succès',
      userId: userId
    };
    
  } catch (error) {
    console.error('Erreur lors de la réactivation de l\'utilisateur:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Erreur lors de la réactivation de l\'utilisateur: ' + error.message
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
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (userDoc.exists) {
      await userDoc.ref.delete();
      console.log('Document utilisateur supprimé de Firestore:', userId);
    }
    
    // Mettre à jour le client correspondant pour retirer la référence au compte
    const clientQuery = await admin.firestore()
      .collection('clients')
      .where('userId', '==', userId)
      .get();
    
    if (!clientQuery.empty) {
      const batch = admin.firestore().batch();
      clientQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          hasAccount: false,
          userId: admin.firestore.FieldValue.delete(),
          temporaryPassword: admin.firestore.FieldValue.delete(),
          accountCreatedAt: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      console.log('Références client mises à jour pour userId:', userId);
    }
    
  } catch (error) {
    console.error('Erreur lors du nettoyage des données:', error);
  }
});
