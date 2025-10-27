import { initializeApp } from "firebase/app";
import { getDatabase , ref, get, update,set,remove,push} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAVssazudqS82vTsQPNdc7uiHVGjDdyT0k",
  authDomain: "quizapp-733d4.firebaseapp.com",
  databaseURL: "https://quizapp-733d4-default-rtdb.firebaseio.com",
  projectId: "quizapp-733d4",
  storageBucket: "quizapp-733d4.appspot.com",
  messagingSenderId: "1017686265383",
  appId: "1:1017686265383:web:f236f21352b94abfc04802"
};

// Initialise Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
export {ref,get, set, push, remove, update };
