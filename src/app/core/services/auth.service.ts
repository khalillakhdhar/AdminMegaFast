import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';

import { getFirebaseBackend } from '../../authUtils';
import { User } from 'src/app/store/Authentication/auth.models';
import { from, map, switchMap, of } from 'rxjs';

export interface UserRole {
  uid: string;
  email: string;
  role: 'admin' | 'client' | 'driver';
  isActive: boolean;
  clientId?: string;
  driverId?: string;
  displayName?: string;
}

@Injectable({ providedIn: 'root' })

export class AuthenticationService {

    user: User;

    constructor(
        private readonly afs: AngularFirestore,
        private readonly afAuth: AngularFireAuth
    ) {
    }

    /**
     * Normalize various possible email payloads into a string
     */
    private normalizeEmail(raw: any): string | null {
        if (!raw) return null;
        if (typeof raw === 'string') return raw;
        if (typeof raw === 'object') {
            // common shapes
            if (typeof raw.email === 'string') return raw.email;
            if (typeof raw.value === 'string') return raw.value;
            if (typeof raw.address === 'string') return raw.address;
        }
        return null;
    }

    /**
     * Returns the current user
     */
    public currentUser(): any {
        return getFirebaseBackend().getAuthenticatedUser();
    }

    /**
     * Get user role and details from Firestore
     */
    public getUserRole(uid: string) {
        return this.afs.collection('users').doc(uid).valueChanges().pipe(
            map((userData: any) => {
                if (userData) {
                    return {
                        uid: uid,
                        email: userData.email,
                        role: userData.role || 'admin',
                        isActive: userData.isActive || true,
                        clientId: userData.clientId,
                        driverId: userData.driverId,
                        displayName: userData.displayName
                    } as UserRole;
                }
                // Default to admin if no role found (existing users)
                return {
                    uid: uid,
                    email: '',
                    role: 'admin' as const,
                    isActive: true
                } as UserRole;
            })
        );
    }

    /**
     * Check if current user is admin
     */
    public isAdmin(): boolean {
        const currentUser = this.currentUser();
        if (!currentUser) return false;

        // For now, assume admin if no role is specified (backward compatibility)
        const storedRole = localStorage.getItem('userRole');
        return !storedRole || storedRole === 'admin';
    }

    /**
     * Check if current user is client
     */
    public isClient(): boolean {
        const storedRole = localStorage.getItem('userRole');
        return storedRole === 'client';
    }

    /**
     * Check if current user is driver
     */
    public isDriver(): boolean {
        const storedRole = localStorage.getItem('userRole');
        return storedRole === 'driver';
    }

    /**
     * Get current user's client ID (if client)
     */
    public getCurrentClientId(): string | null {
        if (this.isClient()) {
            return localStorage.getItem('clientId');
        }
        return null;
    }


    /**
     * Performs the auth
     * @param email email of user
     * @param password password of user
     */
    login(email: string, password: string) {
        // getFirebaseBackend().loginUser returns a Promise; convert to Observable
        return from(getFirebaseBackend().loginUser(email, password)).pipe(
            switchMap((user: any) => {
                if (user?.uid) {
                    // Get user role from Firestore
                    return this.getUserRole(user.uid).pipe(
                        map((userRole: UserRole) => {
                            // Store role and additional info in localStorage
                            localStorage.setItem('userRole', userRole.role);
                            if (userRole.clientId) {
                                localStorage.setItem('clientId', userRole.clientId);
                            }
                            if (userRole.driverId) {
                                localStorage.setItem('driverId', userRole.driverId);
                            }
                            return user;
                        })
                    );
                }
                return of(user);
            })
        );
    }

    /**
     * Performs the register
     * @param email email
     * @param password password
     */
    register(user: any) {
        // Defensive: ensure we pass email and password as separate args
        const email = this.normalizeEmail(user) as string | null;
        const password = user?.password || null;
        const displayName = user?.username || user?.displayName || '';

        if (!email || !password) {
            return from(Promise.reject(new Error('Email and password are required for registration')));
        }

        // getFirebaseBackend().registerUser expects (email, password)
        return from(getFirebaseBackend().registerUser(email, password)).pipe(
            switchMap((firebaseUser: any) => {
                if (firebaseUser?.uid) {
                    const uid = firebaseUser.uid;
                    const userDoc: any = {
                        uid,
                        email,
                        role: 'admin',
                        isActive: true,
                        displayName: displayName || firebaseUser.displayName || '',
                        createdAt: new Date()
                    };

                    console.log('Creating Firestore user document for signup:', userDoc);

                    return from(this.afs.collection('users').doc(uid).set(userDoc)).pipe(map(() => firebaseUser));
                }
                return of(firebaseUser);
            })
        );
    }

    /**
     * Reset password
     * @param email email
     */
    resetPassword(email: string) {
        return from(getFirebaseBackend().forgetPassword(email));
    }

    /**
     * Logout the user
     */
    logout() {
        // Clear role information from localStorage
        localStorage.removeItem('userRole');
        localStorage.removeItem('clientId');
        localStorage.removeItem('driverId');
        localStorage.removeItem('currentUser');

        // Clear session storage as well
        sessionStorage.removeItem('authUser');
        sessionStorage.clear();

        // logout the user
        return getFirebaseBackend().logout();
    }
}

