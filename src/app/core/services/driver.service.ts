import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Driver, DriverUser } from '../models/driver.model';
import { map } from 'rxjs/operators';
import { Observable, firstValueFrom } from 'rxjs';
import { EmailService } from './email.service';
import { ToastrService } from 'ngx-toastr';
import { FirebaseAdminService } from './firebase-admin.service';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private readonly col = this.afs.collection<Driver>('drivers');
  private readonly usersCol = this.afs.collection<DriverUser>('users');

  private normalizeEmail(raw: any): string {
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object') return (raw.email && typeof raw.email === 'string') ? raw.email : (raw.value && typeof raw.value === 'string' ? raw.value : '');
    return '';
  }

  constructor(
    private readonly afs: AngularFirestore,
    private readonly afAuth: AngularFireAuth,
    private readonly emailService: EmailService,
    private readonly toastr: ToastrService,
    private readonly firebaseAdmin: FirebaseAdminService
  ) {}

  getAll() {
    return this.col.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data();
        data.id = a.payload.doc.id;
        return data;
      }))
    );
  }

  getById(id: string): Observable<Driver | undefined> {
    return this.col.doc(id).valueChanges({ idField: 'id' });
  }

  create(driver: Driver) {
    const now = new Date();
    driver.createdAt = now;
    driver.updatedAt = now;
    driver.active = driver.active !== false; // Default to true
    driver.isActive = driver.isActive !== false; // Default to true
    return this.col.add(driver);
  }

  /**
   * Create driver with user account
   * @param driver Driver data
   * @param createAccount Whether to create user account
   * @returns Promise with driver creation result
   */
  async createWithAccount(driver: Driver, createAccount: boolean = false): Promise<any> {
    try {
      const now = new Date();
      driver.createdAt = now;
      driver.updatedAt = now;
      driver.active = driver.active !== false;
      driver.isActive = driver.isActive !== false;

      if (createAccount && driver.email) {
        // Generate temporary password
        const temporaryPassword = this.emailService.generateTemporaryPassword();

        // Create Firebase user account
        const userCredential = await this.afAuth.createUserWithEmailAndPassword(
          driver.email,
          temporaryPassword
        );

        if (userCredential.user) {
          // Update user profile
          await userCredential.user.updateProfile({
            displayName: driver.displayName || driver.name
          });

          // Store driver user data
          const driverUser: DriverUser = {
            uid: userCredential.user.uid,
            email: this.normalizeEmail(driver?.email),
            password: '', // Don't store password in plaintext
            displayName: driver.displayName || driver.name,
            role: 'driver',
            isActive: true,
            createdAt: now
          };

          // Update driver data with account info
          driver.hasAccount = true;
          driver.userId = userCredential.user.uid;
          driver.uid = userCredential.user.uid; // For backward compatibility
          driver.temporaryPassword = temporaryPassword; // Keep for admin verification
          driver.accountCreatedAt = now;

          // Save driver to Firestore
          const driverRef = await this.col.add(driver);

          // Update driver user with driver ID
          driverUser.driverId = driverRef.id;
          await this.usersCol.doc(userCredential.user.uid).set(driverUser);

          // Send password reset email automatically
          try {
            await this.afAuth.sendPasswordResetEmail(driver.email);
            this.toastr.success(`Livreur créé avec compte utilisateur. Email de réinitialisation envoyé à ${driver.email}`);
            console.log('🔑 Compte créé et email envoyé pour:', driver.email);
          } catch (emailError) {
            console.error('Erreur envoi email:', emailError);
            this.toastr.success(`Livreur créé avec compte utilisateur. Mot de passe temporaire: ${temporaryPassword}`);
            this.toastr.warning('Impossible d\'envoyer l\'email de réinitialisation automatiquement');
          }

          return { driverRef, userCredential, temporaryPassword };
        }
      } else {
        // Create driver without account
        driver.hasAccount = false;
        const driverRef = await this.col.add(driver);
        this.toastr.success('Livreur créé avec succès!');
        return { driverRef };
      }
    } catch (error) {
      console.error('Erreur lors de la création du livreur:', error);
      throw error;
    }
  }  update(id: string, data: Partial<Driver>) {
    data.updatedAt = new Date();
    return this.col.doc(id).update(data);
  }

  delete(id: string) {
    return this.deleteDriverWithAccount(id);
  }

  /**
   * Delete driver and associated user account
   * @param driverId Driver ID
   */
  async deleteDriverWithAccount(driverId: string): Promise<void> {
    try {
      const driverDocSnapshot = await firstValueFrom(this.col.doc(driverId).get());

      if (!driverDocSnapshot?.exists) {
        throw new Error('Livreur non trouvé');
      }

      const driver = { id: driverDocSnapshot.id, ...driverDocSnapshot.data() };

      // If driver has an account, we need to delete it from Firebase Auth
      if (driver.hasAccount && driver.userId) {
        try {
          // Delete user document from Firestore
          await this.usersCol.doc(driver.userId).delete();

          console.log('🗑️ Compte utilisateur supprimé de Firestore:', driver.email, 'UID:', driver.userId);
          console.warn('⚠️ Pour supprimer complètement de Firebase Auth, utilisez une Cloud Function avec Admin SDK');

        } catch (authError) {
          console.error('Erreur lors de la suppression du compte:', authError);
          // Continue with driver deletion even if auth deletion fails
        }
      }

      // Delete driver document
      await this.col.doc(driverId).delete();

      this.toastr.success('Livreur supprimé avec succès');
      console.log('✅ Livreur supprimé:', driver.name, driver.email);

    } catch (error) {
      console.error('Erreur lors de la suppression du livreur:', error);
      throw error;
    }
  }

  /**
   * Create user account for existing driver
   * @param driverId Driver ID
   * @returns Promise with account creation result
   */
  async createAccountForDriver(driverId: string): Promise<any> {
    try {
      const driverDocSnapshot = await firstValueFrom(this.col.doc(driverId).get());

      if (!driverDocSnapshot?.exists) {
        throw new Error('Livreur non trouvé');
      }

      const driver = { id: driverDocSnapshot.id, ...driverDocSnapshot.data() };

      if (!driver.email) {
        throw new Error('L\'email du livreur est requis pour créer un compte');
      }

      if (driver.hasAccount) {
        throw new Error('Ce livreur a déjà un compte utilisateur');
      }

      // Generate temporary password
      const temporaryPassword = this.emailService.generateTemporaryPassword();

      // Create Firebase user account
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(
        driver.email,
        temporaryPassword
      );

      if (userCredential.user) {
        // Update user profile
        await userCredential.user.updateProfile({
          displayName: driver.displayName || driver.name
        });

        // Store driver user data
    const driverUser: DriverUser = {
      uid: userCredential.user.uid,
      email: this.normalizeEmail(driver?.email),
      password: '', // Don't store password in plaintext
      displayName: driver.displayName || driver.name,
      role: 'driver',
      isActive: true,
      createdAt: new Date(),
      driverId: driver.id || ''
    };

        // Update driver data with account info
        const updateData = {
          hasAccount: true,
          userId: userCredential.user.uid,
          uid: userCredential.user.uid,
          temporaryPassword: temporaryPassword,
          accountCreatedAt: new Date(),
          isActive: true,
          updatedAt: new Date()
        };

        // Update driver document
        await this.col.doc(driverId).update(updateData);

        // Set driver user document
        await this.usersCol.doc(userCredential.user.uid).set(driverUser);

        // Send password reset email automatically
        try {
          await this.afAuth.sendPasswordResetEmail(driver.email);
          this.toastr.success(`Compte créé pour ${driver.name}. Email de réinitialisation envoyé à ${driver.email}`);
          console.log('🔑 Compte ajouté et email envoyé pour:', driver.email);
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
          this.toastr.success(`Compte créé pour ${driver.name}. Mot de passe temporaire: ${temporaryPassword}`);
          this.toastr.warning('Impossible d\'envoyer l\'email de réinitialisation automatiquement');
        }

        return { userCredential, temporaryPassword };
      }
    } catch (error) {
      console.error('Erreur lors de la création du compte:', error);
      if (error.code === 'auth/email-already-in-use') {
        this.toastr.error('Cette adresse email est déjà utilisée par un autre compte');
      } else if (error.code === 'auth/invalid-email') {
        this.toastr.error('Adresse email invalide');
      } else if (error.code === 'auth/weak-password') {
        this.toastr.error('Le mot de passe est trop faible');
      } else {
        this.toastr.error('Erreur lors de la création du compte: ' + error.message);
      }
      throw error;
    }
  }

  /**
   * Disable driver account
   * @param driverId Driver ID
   */
  async disableAccount(driverId: string): Promise<void> {
    try {
      const driverDocSnapshot = await firstValueFrom(this.col.doc(driverId).get());

      if (!driverDocSnapshot?.exists) {
        throw new Error('Livreur non trouvé');
      }

      const driver = { id: driverDocSnapshot.id, ...driverDocSnapshot.data() };

      if (!driver.hasAccount || !driver.userId) {
        throw new Error('Ce livreur n\'a pas de compte utilisateur');
      }

      // Update driver status in Firestore
      await this.col.doc(driverId).update({
        isActive: false,
        active: false,
        updatedAt: new Date()
      });

      // Update user status in users collection
      await this.usersCol.doc(driver.userId).update({
        isActive: false,
        updatedAt: new Date()
      });

      this.toastr.success('Compte livreur désactivé avec succès');
      console.log('🚫 Compte désactivé pour:', driver.email, 'UID:', driver.userId);
    } catch (error) {
      console.error('Erreur lors de la désactivation du compte:', error);
      throw error;
    }
  }

  /**
   * Enable driver account using Cloud Function
   * @param driverId Driver ID
   */
  async enableAccount(driverId: string): Promise<void> {
    try {
      const driverDocSnapshot = await firstValueFrom(this.col.doc(driverId).get());

      if (!driverDocSnapshot?.exists) {
        throw new Error('Livreur non trouvé');
      }

      const driver = { id: driverDocSnapshot.id, ...driverDocSnapshot.data() };

      if (!driver.hasAccount || !driver.userId) {
        throw new Error('Ce livreur n\'a pas de compte utilisateur');
      }

      // Update driver status in Firestore
      await this.col.doc(driverId).update({
        isActive: true,
        active: true,
        updatedAt: new Date()
      });

      // Update user status in users collection
      await this.usersCol.doc(driver.userId).update({
        isActive: true,
        updatedAt: new Date()
      });

      this.toastr.success('Compte livreur réactivé avec succès');
      console.log('✅ Compte réactivé pour:', driver.email, 'UID:', driver.userId);
    } catch (error) {
      console.error('Erreur lors de la réactivation du compte:', error);
      throw error;
    }
  }

  /**
   * Reset driver password
   * @param driverId Driver ID
   */
  async resetDriverPassword(driverId: string): Promise<void> {
    try {
      const driverDocSnapshot = await firstValueFrom(this.col.doc(driverId).get());

      if (!driverDocSnapshot?.exists) {
        throw new Error('Livreur non trouvé');
      }

      const driver = { id: driverDocSnapshot.id, ...driverDocSnapshot.data() };

      if (!driver.hasAccount || !driver.email) {
        throw new Error('Ce livreur n\'a pas de compte utilisateur ou d\'email');
      }

      // Send password reset email using Firebase Auth
      await this.afAuth.sendPasswordResetEmail(driver.email);

      this.toastr.success('Email de réinitialisation envoyé avec succès');
      console.log('🔄 Reset password envoyé pour:', driver.email);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', error);
      throw error;
    }
  }

  /**
   * Get driver by user ID
   * @param userId Firebase User ID
   */
  getDriverByUserId(userId: string): Observable<Driver | undefined> {
    return this.afs.collection<Driver>('drivers', ref =>
      ref.where('userId', '==', userId).limit(1)
    ).valueChanges({ idField: 'id' }).pipe(
      map(drivers => drivers.length > 0 ? drivers[0] : undefined)
    );
  }

  /**
   * Stats livreur sur période : total, livrés, taux, COD total.
   * Requiert collection 'shipments' avec:
   * - assignedTo: driverId
   * - status: 'delivered' (ou ancien: 'livre') / 'returned'...
   * - updatedAt: Date
   * - amount: number (COD)
   */
  async getStats(driverId: string, start: Date, end: Date) {
    const qRef = this.afs.collection('shipments', ref =>
      ref.where('assignedTo', '==', driverId)
         .where('updatedAt', '>=', start)
         .where('updatedAt', '<=', end)
    ).ref;

    const snap = await qRef.get();
    let total = 0, delivered = 0, cod = 0;
    snap.forEach(doc => {
      const s: any = doc.data();
      total++;
      // Supporte l'ancien statut 'livre' et le nouveau 'delivered'
      if (s.status === 'delivered' || s.status === 'livre') {
        delivered++;
        cod += s.amount || 0;
      }
    });
    const rate = total ? (delivered / total) : 0;
    return { total, delivered, rate, cod };
  }
}
