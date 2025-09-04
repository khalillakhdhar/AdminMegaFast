import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Client, ClientUser } from '../models/client.model';
import { map, take } from 'rxjs/operators';
import { Observable, firstValueFrom } from 'rxjs';
import { EmailService } from './email.service';
import { ToastrService } from 'ngx-toastr';
import { FirebaseAdminService } from './firebase-admin.service';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly col = this.afs.collection<Client>('clients');
  private readonly usersCol = this.afs.collection<ClientUser>('users');

  constructor(
    private readonly afs: AngularFirestore,
    private readonly afAuth: AngularFireAuth,
    private readonly emailService: EmailService,
    private readonly toastr: ToastrService,
    private readonly firebaseAdmin: FirebaseAdminService
  ) {}

  getById(id: string): Observable<Client | undefined> {
    return this.col.doc(id).valueChanges({ idField: 'id' });
  }

  list(opts?: { limit?: number; orderBy?: 'createdAt' | 'name'; dir?: 'asc' | 'desc' }): Observable<Client[]> {
    const orderBy = opts?.orderBy || 'createdAt';
    const dir = opts?.dir || 'desc';
    const limit = opts?.limit || 50;

    return this.afs.collection<Client>('clients', ref =>
      ref.orderBy(orderBy, dir).limit(limit)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Client;
        return { id: a.payload.doc.id, ...data };
      }))
    );
  }

  /**
   * Recherche simple par égalité sur phone ou par "startsWith" sur name (via where + >= + <)
   */
  search(term: string): Observable<Client[]> {
    const trimmed = (term || '').trim();
    if (!trimmed) return this.list({ limit: 50 });

    // Priorité au phone exact si numérique
    const isPhone = /^\+?[0-9\s-]+$/.test(trimmed);
    if (isPhone) {
      return this.afs.collection<Client>('clients', ref =>
        ref.where('phone', '==', trimmed).limit(20)
      ).valueChanges({ idField: 'id' }) as Observable<Client[]>;
    }

    // startsWith sur name (nécessite index)
    const end = trimmed.replace(/.$/, c => String.fromCharCode(c.charCodeAt(0) + 1));
    return this.afs.collection<Client>('clients', ref =>
      ref.where('name', '>=', trimmed).where('name', '<', end).limit(20)
    ).valueChanges({ idField: 'id' }) as Observable<Client[]>;
  }

  create(client: Client) {
    const now = new Date();
    client.createdAt = now;
    client.updatedAt = now;
    client.isActive = true;
    return this.col.add(client);
  }

  /**
   * Create client with user account
   * @param client Client data
   * @param createAccount Whether to create user account
   * @returns Promise with client creation result
   */
  async createWithAccount(client: Client, createAccount: boolean = false): Promise<any> {
    try {
      const now = new Date();
      client.createdAt = now;
      client.updatedAt = now;
      client.isActive = true;

      if (createAccount && client.email) {
        // Generate temporary password
        const temporaryPassword = this.emailService.generateTemporaryPassword();
        
        // Create Firebase user account
        const userCredential = await this.afAuth.createUserWithEmailAndPassword(
          client.email,
          temporaryPassword
        );

        if (userCredential.user) {
          // Update user profile
          await userCredential.user.updateProfile({
            displayName: client.name
          });

          // Store client user data
          const clientUser: ClientUser = {
            uid: userCredential.user.uid,
            email: client.email,
            password: '', // Don't store password in plaintext
            displayName: client.name,
            role: 'client',
            isActive: true,
            createdAt: now
          };

          // Update client data with account info
          client.hasAccount = true;
          client.userId = userCredential.user.uid;
          client.temporaryPassword = temporaryPassword; // Keep for admin verification
          client.accountCreatedAt = now;

          // Save client to Firestore
          const clientRef = await this.col.add(client);
          
          // Update client user with client ID
          clientUser.clientId = clientRef.id;
          await this.usersCol.doc(userCredential.user.uid).set(clientUser);

          this.toastr.success(`Client créé avec compte utilisateur. Mot de passe temporaire: ${temporaryPassword}`);
          console.log('🔑 Compte créé pour:', client.email, 'Mot de passe:', temporaryPassword);

          return { clientRef, userCredential, temporaryPassword };
        }
      } else {
        // Create client without account
        client.hasAccount = false;
        const clientRef = await this.col.add(client);
        this.toastr.success('Client créé avec succès!');
        return { clientRef };
      }
    } catch (error) {
      console.error('Erreur lors de la création du client:', error);
      throw error;
    }
  }

  update(id: string, patch: Partial<Client>) {
    patch.updatedAt = new Date();
    return this.col.doc(id).update(patch);
  }

  delete(id: string) {
    return this.deleteClientWithAccount(id);
  }

  /**
   * Delete client and associated user account
   * @param clientId Client ID
   */
  async deleteClientWithAccount(clientId: string): Promise<void> {
    try {
      const clientDocSnapshot = await this.col.doc(clientId).get().pipe(take(1)).toPromise();
      
      if (!clientDocSnapshot?.exists) {
        throw new Error('Client non trouvé');
      }

      const client = { id: clientDocSnapshot.id, ...clientDocSnapshot.data() };

      // If client has an account, we need to delete it from Firebase Auth
      if (client.hasAccount && client.userId) {
        try {
          // Delete user document from Firestore
          await this.usersCol.doc(client.userId).delete();
          
          // Note: Pour supprimer complètement un utilisateur Firebase Auth, 
          // il faut utiliser l'Admin SDK côté backend
          // Créez une Cloud Function pour cela
          console.log('🗑️ Compte utilisateur supprimé de Firestore:', client.email, 'UID:', client.userId);
          console.warn('⚠️ Pour supprimer complètement de Firebase Auth, utilisez une Cloud Function avec Admin SDK');
          
        } catch (authError) {
          console.error('Erreur lors de la suppression du compte:', authError);
          // Continue with client deletion even if auth deletion fails
        }
      }

      // Delete client document
      await this.col.doc(clientId).delete();
      
      this.toastr.success('Client supprimé avec succès');
      console.log('✅ Client supprimé:', client.name, client.email);
      
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error);
      throw error;
    }
  }

  /**
   * Create user account for existing client
   * @param clientId Client ID
   * @returns Promise with account creation result
   */
  async createAccountForClient(clientId: string): Promise<any> {
    try {
      const clientDocSnapshot = await this.col.doc(clientId).get().pipe(take(1)).toPromise();
      
      if (!clientDocSnapshot?.exists) {
        throw new Error('Client non trouvé');
      }

      const client = { id: clientDocSnapshot.id, ...clientDocSnapshot.data() };

      if (!client.email) {
        throw new Error('L\'email du client est requis pour créer un compte');
      }

      if (client.hasAccount) {
        throw new Error('Ce client a déjà un compte utilisateur');
      }

      // Generate temporary password
      const temporaryPassword = this.emailService.generateTemporaryPassword();
      
      // Create Firebase user account
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(
        client.email,
        temporaryPassword
      );

      if (userCredential.user) {
        // Update user profile
        await userCredential.user.updateProfile({
          displayName: client.name
        });

        // Store client user data
        const clientUser: ClientUser = {
          uid: userCredential.user.uid,
          email: client.email,
          password: '', // Don't store password in plaintext
          displayName: client.name,
          clientId: clientId,
          role: 'client',
          isActive: true,
          createdAt: new Date()
        };

        await this.usersCol.doc(userCredential.user.uid).set(clientUser);

        // Update client data
        await this.col.doc(clientId).update({
          hasAccount: true,
          userId: userCredential.user.uid,
          temporaryPassword: temporaryPassword,
          accountCreatedAt: new Date(),
          updatedAt: new Date()
        });

        this.toastr.success(`Compte créé! Mot de passe temporaire: ${temporaryPassword}`);
        console.log('🔑 Compte créé pour:', client.email, 'Mot de passe:', temporaryPassword);

        return { userCredential, temporaryPassword };
      }
    } catch (error) {
      console.error('Erreur lors de la création du compte:', error);
      throw error;
    }
  }

  /**
   * Disable client account using Cloud Function
   * @param clientId Client ID
   */
  async disableAccount(clientId: string): Promise<void> {
    try {
      const clientDocSnapshot = await firstValueFrom(this.col.doc(clientId).get());
      
      if (!clientDocSnapshot?.exists) {
        throw new Error('Client non trouvé');
      }

      const client = { id: clientDocSnapshot.id, ...clientDocSnapshot.data() };

      if (!client.hasAccount || !client.userId) {
        throw new Error('Ce client n\'a pas de compte utilisateur');
      }

      // Use Cloud Function to disable user in Firebase Auth
      try {
        await firstValueFrom(this.firebaseAdmin.disableUserAccount(client.userId));
        this.toastr.success('Compte client désactivé avec succès dans Firebase Auth');
      } catch (cloudFunctionError) {
        console.error('Erreur Cloud Function:', cloudFunctionError);
        // Fallback: disable only in Firestore
        await this.usersCol.doc(client.userId).update({
          isActive: false,
          updatedAt: new Date()
        });

        await this.col.doc(clientId).update({
          isActive: false,
          updatedAt: new Date()
        });

        this.toastr.warning('Compte désactivé localement seulement (Cloud Function indisponible)');
      }

      console.log('⚠️ Compte désactivé pour:', client.email, 'UID:', client.userId);
    } catch (error) {
      console.error('Erreur lors de la désactivation du compte:', error);
      throw error;
    }
  }

  /**
   * Enable client account using Cloud Function
   * @param clientId Client ID
   */
  async enableAccount(clientId: string): Promise<void> {
    try {
      const clientDocSnapshot = await firstValueFrom(this.col.doc(clientId).get());
      
      if (!clientDocSnapshot?.exists) {
        throw new Error('Client non trouvé');
      }

      const client = { id: clientDocSnapshot.id, ...clientDocSnapshot.data() };

      if (!client.hasAccount || !client.userId) {
        throw new Error('Ce client n\'a pas de compte utilisateur');
      }

      // Use Cloud Function to enable user in Firebase Auth
      try {
        await firstValueFrom(this.firebaseAdmin.enableUserAccount(client.userId));
        
        // Update local data to reflect enabled status
        await this.usersCol.doc(client.userId).update({
          isActive: true,
          updatedAt: new Date()
        });

        await this.col.doc(clientId).update({
          isActive: true,
          updatedAt: new Date()
        });

        this.toastr.success('Compte client réactivé avec succès dans Firebase Auth');
      } catch (cloudFunctionError) {
        console.error('Erreur Cloud Function:', cloudFunctionError);
        // Fallback: enable only in Firestore
        await this.usersCol.doc(client.userId).update({
          isActive: true,
          updatedAt: new Date()
        });

        await this.col.doc(clientId).update({
          isActive: true,
          updatedAt: new Date()
        });

        this.toastr.warning('Compte réactivé localement seulement (Cloud Function indisponible)');
      }

      console.log('✅ Compte réactivé pour:', client.email, 'UID:', client.userId);
    } catch (error) {
      console.error('Erreur lors de la réactivation du compte:', error);
      throw error;
    }
  }

  /**
   * Reset client password
   * @param clientId Client ID
   */
  async resetClientPassword(clientId: string): Promise<void> {
    try {
      const clientDocSnapshot = await firstValueFrom(this.col.doc(clientId).get());
      
      if (!clientDocSnapshot?.exists) {
        throw new Error('Client non trouvé');
      }

      const client = { id: clientDocSnapshot.id, ...clientDocSnapshot.data() };

      if (!client.hasAccount || !client.email) {
        throw new Error('Ce client n\'a pas de compte utilisateur ou d\'email');
      }

      // Send password reset email using Firebase Auth
      await this.afAuth.sendPasswordResetEmail(client.email);
      
      this.toastr.success('Email de réinitialisation envoyé avec succès');
      console.log('🔄 Reset password envoyé pour:', client.email);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', error);
      throw error;
    }
  }

  /**
   * Get client by user ID
   * @param userId Firebase User ID
   */
  getClientByUserId(userId: string): Observable<Client | undefined> {
    return this.afs.collection<Client>('clients', ref =>
      ref.where('userId', '==', userId).limit(1)
    ).valueChanges({ idField: 'id' }).pipe(
      map(clients => clients.length > 0 ? clients[0] : undefined)
    );
  }
}
