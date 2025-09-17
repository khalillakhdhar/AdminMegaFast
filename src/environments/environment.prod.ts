// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: true,
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
