// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  defaultauth: 'firebase',
  firebaseConfig: {
    apiKey: "AIzaSyA711jTxygDNfbUOBBclSnDukkKWA22oRA",
    authDomain: "livraison-97b8b.firebaseapp.com",
    databaseURL: "",
    projectId: "livraison-97b8b",
    storageBucket: "livraison-97b8b.firebasestorage.app",
    messagingSenderId: "535657116969",
    appId: "1:535657116969:web:de3524e26a40f00268f338",
    measurementId: "G-NGQ9YDJ5TS"
  },
  googleMaps: {
    apiKey: "AIzaSyAWbWm5NFe9mE9LL8KmSHAfngMtfe0tt0g",
    libraries: ['places', 'geometry', 'drawing'],
    language: 'fr',
    region: 'TN' // Tunisie
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
