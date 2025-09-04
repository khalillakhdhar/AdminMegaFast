import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface CloudFunctionResponse {
  success: boolean;
  message: string;
  userId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAdminService {

  constructor(private readonly fns: AngularFireFunctions) { }

  /**
   * Supprimer complètement un utilisateur Firebase Auth via Cloud Function
   * @param userId Firebase User UID
   */
  deleteUserAccount(userId: string): Observable<CloudFunctionResponse> {
    const callable = this.fns.httpsCallable('deleteUserAccount');
    return callable({ userId });
  }

  /**
   * Disable user account in Firebase Auth via Cloud Function
   */
  disableUserAccount(uid: string): Observable<CloudFunctionResponse> {
    const data = { uid };
    return this.fns.httpsCallable('disableUserAccount')(data).pipe(
      map((result: any) => result.data as CloudFunctionResponse),
      catchError((error) => {
        console.error('Erreur lors de la désactivation du compte:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Enable user account in Firebase Auth via Cloud Function
   */
  enableUserAccount(uid: string): Observable<CloudFunctionResponse> {
    const data = { uid };
    return this.fns.httpsCallable('enableUserAccount')(data).pipe(
      map((result: any) => result.data as CloudFunctionResponse),
      catchError((error) => {
        console.error('Erreur lors de la réactivation du compte:', error);
        return throwError(() => error);
      })
    );
  }
}
