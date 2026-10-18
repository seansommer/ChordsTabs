// Public Firebase WEB app configuration only. Never put service-account keys here.
// Keep these values identical in both Music Center repositories.
export const FIREBASE_CONFIG = Object.freeze({
  apiKey: 'AIzaSyB3FHrpxlhhey6BS2fw2z2mF57mUzbwRXE',
  authDomain: 'music-center-1111.firebaseapp.com',
  databaseURL: 'https://music-center-1111-default-rtdb.firebaseio.com',
  projectId: 'music-center-1111',
  storageBucket: 'music-center-1111.firebasestorage.app',
  messagingSenderId: '730268382863',
  appId: '1:730268382863:web:35aede60e5b77dc81562fa'
});
export const SDK_VERSION = '12.18.0';
export const FIREBASE_APP_NAME = 'MUSIC_CENTER_V1';
export const COMMUNITY_PATH = 'musicV1';
export const isConfigured = () => ['apiKey','authDomain','databaseURL','projectId','appId'].every(k => FIREBASE_CONFIG[k]);
export const HUB_URL = new URL('../MusicCenter/', location.href).href;
export const CHORDS_URL = new URL('../ChordsTabs/', location.href).href;
