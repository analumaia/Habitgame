/* ==========================================================
   Configuração do Firebase
   Preencha com os dados do seu app web (veja FIREBASE-SETUP.md, passo 4).
   Estes valores NÃO são segredo: ficam públicos em qualquer site que usa
   Firebase. Quem protege seus dados são as regras do Firestore.
   Enquanto estiver com "COLE_AQUI", a sincronização fica desligada e o app
   funciona normalmente, só neste aparelho.
   ========================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyDpolQAWlsH2STKbGSA2xf_jzKFAnAZ1QU",
  authDomain: "habitgame-ca92c.firebaseapp.com",
  projectId: "habitgame-ca92c",
  storageBucket: "habitgame-ca92c.firebasestorage.app",
  messagingSenderId: "361487516233",
  appId: "1:361487516233:web:4991a1aee607fb2ca87598"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);