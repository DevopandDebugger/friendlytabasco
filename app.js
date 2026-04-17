import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc, setDoc, doc, updateDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDt35tIVzzPcp_xeEf4dJxTOpXx0i1tEbs",
  authDomain: "friendlyzapata.firebaseapp.com",
  projectId: "friendlyzapata",
  storageBucket: "friendlyzapata.firebasestorage.app",
  messagingSenderId: "494902793875",
  appId: "1:494902793875:web:af95a5b5ed3527ce155f66",
  measurementId: "G-7FFHD91V2E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const state = {
  currentUser: null,
  verificationCode: null,
  recoveringPhone: null,
  recoveryCode: null,
  activeChatUser: null,
  notificationPermissionGranted: false,
  locationPermissionGranted: false,
  currentLocation: null
};

const screens = {
  permissions: document.getElementById('permissions-screen'),
  consent: document.getElementById('consent-screen'),
  register: document.getElementById('register-screen'),
  verify: document.getElementById('verify-screen'),
  login: document.getElementById('login-screen'),
  recover: document.getElementById('recover-screen'),
  main: document.getElementById('main-screen'),
  account: document.getElementById('account-screen'),
  blocked: document.getElementById('blocked-screen'),
  chats: document.getElementById('chats-screen'),
  chatDetail: document.getElementById('chat-detail-screen')
};

const setActiveScreen = (screenKey) => {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenKey].classList.add('active');
};

const getElement = id => document.getElementById(id);

const sanitizePhone = (phone) => {
  return phone.replace(/[^0-9]/g, '').slice(-10);
};

const showMessage = (id, text, success = true) => {
  const element = getElement(id);
  element.textContent = text;
  element.style.color = success ? 'var(--text)' : 'var(--danger)';
};

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    state.notificationPermissionGranted = false;
    updatePermissionState();
    return false;
  }
  const permission = await Notification.requestPermission();
  state.notificationPermissionGranted = permission === 'granted';
  updatePermissionState();
  return state.notificationPermissionGranted;
};

const requestLocationPermission = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      state.locationPermissionGranted = false;
      updatePermissionState();
      resolve(false);
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      state.locationPermissionGranted = true;
      state.currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      updatePermissionState();
      resolve(true);
    }, () => {
      state.locationPermissionGranted = false;
      updatePermissionState();
      resolve(false);
    });
  });
};

const updatePermissionState = () => {
  const message = getElement('permissions-message');
  if (state.notificationPermissionGranted && state.locationPermissionGranted) {
    message.textContent = 'Permisos concedidos. Continúa con el aviso de edad y privacidad.';
    setActiveScreen('consent');
    return;
  }

  const missing = [];
  if (!state.notificationPermissionGranted) missing.push('notificaciones');
  if (!state.locationPermissionGranted) missing.push('ubicación');
  message.textContent = `Debes activar ${missing.join(' y ')} para continuar.`;
};

const generateRandomCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const askForPermissionsFlow = async () => {
  await requestNotificationPermission();
  await requestLocationPermission();
  setActiveScreen('consent');
};

const canAcceptConsent = () => {
  const age = getElement('consent-age').checked;
  const privacy = getElement('consent-privacy').checked;
  getElement('accept-consent').disabled = !(age && privacy);
};

document.getElementById('request-notifications').addEventListener('click', async () => {
  await requestNotificationPermission();
});
document.getElementById('request-location').addEventListener('click', async () => {
  await requestLocationPermission();
});
document.getElementById('consent-age').addEventListener('change', canAcceptConsent);
document.getElementById('consent-privacy').addEventListener('change', canAcceptConsent);
document.getElementById('accept-consent').addEventListener('click', () => setActiveScreen('register'));

document.getElementById('go-login').addEventListener('click', () => setActiveScreen('login'));
document.getElementById('go-register').addEventListener('click', () => setActiveScreen('register'));

document.getElementById('forgot-password').addEventListener('click', () => setActiveScreen('recover'));

const calculateAge = (birthdate) => {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

const saveUserData = async (userData) => {
  const userRef = doc(db, 'users', userData.phone);
  await setDoc(userRef, userData);
};

const createVerificationCode = async (phone) => {
  const code = generateRandomCode();
  state.verificationCode = code;
  const userRef = doc(db, 'users', phone);
  await updateDoc(userRef, { verificationCode: code, verified: false });
  sendPushNotification(phone, 'Tu código de verificación', `Código: ${code}`);
};

const sendPushNotification = (phone, title, message) => {
  console.log('Notificación a:', phone, title, message);
  if (Notification.permission === 'granted') {
    let icon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23ff7a59"/><text x="50" y="60" text-anchor="middle" font-size="60" fill="white" font-weight="bold">FZ</text></svg>';
    
    if (title.includes('mensaje')) {
      icon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%233b82f6"/><path d="M50 30 L70 50 L70 70 L30 70 L30 50 Z" fill="white"/></svg>';
    }
    
    new Notification(title, { 
      body: message, 
      icon,
      tag: title.includes('mensaje') ? 'chat' : 'default',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23ff7a59"/></svg>'
    });
  }
  if (title.includes('código')) {
    alert(`${title}\n${message}`);
  }
};

const registerForm = document.getElementById('register-form');
registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const phone = sanitizePhone(getElement('register-phone').value);
  const password = getElement('register-password').value.trim();
  const passwordConfirm = getElement('register-password-confirm').value.trim();

  if (password !== passwordConfirm) {
    showMessage('verify-message', 'Las contraseñas no coinciden.', false);
    return;
  }

  const userData = {
    name: getElement('register-name').value.trim(),
    birthdate: getElement('register-birthdate').value,
    phone,
    address: getElement('register-address').value.trim(),
    municipio: getElement('register-municipio').value.trim(),
    colonia: getElement('register-colonia').value.trim(),
    password,
    photoUrl: '',
    verified: false,
    blockedUsers: [],
    autoLogin: false,
    location: state.currentLocation || null,
    createdAt: new Date().toISOString()
  };

  await saveUserData(userData);
  await createVerificationCode(phone);
  state.currentUser = userData;
  setActiveScreen('verify');
  showMessage('verify-message', 'Código enviado en notificación. Ingresa el código para continuar.');
});

const verifyButton = document.getElementById('check-verify');
verifyButton.addEventListener('click', async () => {
  const codeInput = getElement('verify-code').value.trim();
  if (codeInput === state.verificationCode) {
    const userRef = doc(db, 'users', state.currentUser.phone);
    await updateDoc(userRef, { verified: true });
    showMessage('verify-message', 'Cuenta verificada exitosamente. Inicia sesión.', true);
    setTimeout(() => setActiveScreen('login'), 1000);
    return;
  }
  showMessage('verify-message', 'El código es inválido. Intenta de nuevo o solicita uno nuevo.', false);
});

const resendButton = document.getElementById('resend-code');
resendButton.addEventListener('click', async () => {
  await createVerificationCode(state.currentUser.phone);
  showMessage('verify-message', 'Se ha enviado un nuevo código.', true);
});

const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const phone = sanitizePhone(getElement('login-phone').value);
  const password = getElement('login-password').value.trim();
  const autoLogin = getElement('login-autologin').checked;

  const userRef = doc(db, 'users', phone);
  const userSnapshot = await getDoc(userRef);
  if (!userSnapshot.exists()) {
    showMessage('verify-message', 'Usuario no encontrado.', false);
    return;
  }

  const user = userSnapshot.data();
  if (user.password !== password) {
    showMessage('verify-message', 'Contraseña incorrecta.', false);
    return;
  }

  if (!user.verified) {
    showMessage('verify-message', 'Tu cuenta no está verificada.', false);
    setActiveScreen('verify');
    return;
  }

  state.currentUser = { ...user, phone };
  state.currentUser.autoLogin = autoLogin;
  if (autoLogin) {
    localStorage.setItem('friendlyZapataAutoLogin', phone);
  }
  await updateDoc(userRef, { autoLogin });
  await enterMainScreen();
});

const recoverForm = document.getElementById('recover-form');
recoverForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const phone = sanitizePhone(getElement('recover-phone').value);
  const userRef = doc(db, 'users', phone);
  const userSnapshot = await getDoc(userRef);
  if (!userSnapshot.exists()) {
    showMessage('recover-message', 'Teléfono no encontrado.', false);
    return;
  }
  state.recoveringPhone = phone;
  state.recoveryCode = generateRandomCode();
  await updateDoc(userRef, { recoveryCode: state.recoveryCode });
  sendPushNotification(phone, 'Código de recuperación', `Código: ${state.recoveryCode}`);
  document.getElementById('recover-code-block').classList.remove('hidden');
  showMessage('recover-message', 'Código enviado por notificación.', true);
});

getElement('recover-verify-code').addEventListener('click', async () => {
  const code = getElement('recover-code').value.trim();
  if (code !== state.recoveryCode) {
    showMessage('recover-message', 'El código no es correcto. Verifica o genera uno nuevo.', false);
    return;
  }
  document.getElementById('recover-password-block').classList.remove('hidden');
  showMessage('recover-message', 'Código correcto. Ingresa tu nueva contraseña.', true);
});

getElement('recover-save-password').addEventListener('click', async () => {
  const password = getElement('recover-new-password').value.trim();
  const confirm = getElement('recover-new-password-confirm').value.trim();
  if (password !== confirm) {
    showMessage('recover-message', 'Las contraseñas no coinciden.', false);
    return;
  }
  const userRef = doc(db, 'users', state.recoveringPhone);
  await updateDoc(userRef, { password, recoveryCode: null });
  showMessage('recover-message', 'Contraseña actualizada. Regresa al login.', true);
  setTimeout(() => setActiveScreen('login'), 1000);
});

const enterMainScreen = async () => {
  setActiveScreen('main');
  await loadProfiles();
  getElement('account-phone').value = state.currentUser.phone;
  getElement('account-name').value = state.currentUser.name;
  getElement('account-birthdate').value = state.currentUser.birthdate;
  getElement('account-address').value = state.currentUser.address;
  getElement('account-municipio').value = state.currentUser.municipio;
  getElement('account-colonia').value = state.currentUser.colonia;
};

const loadProfiles = async () => {
  const profileList = getElement('profile-list');
  profileList.innerHTML = '';
  const q = query(collection(db, 'users'));
  const snapshot = await getDocs(q);
  const filterAge = getElement('filter-age').value;
  const filterColonia = getElement('filter-colonia').value.trim().toLowerCase();

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const phone = docSnap.id;
    if (phone === state.currentUser.phone) return;
    if (state.currentUser.blockedUsers?.includes(phone)) return;
    if (!data.verified) return;
    const age = calculateAge(data.birthdate);
    if (filterAge !== 'all') {
      const [min, max] = filterAge.split('-').map(Number);
      if (age < min || age > max) return;
    }
    if (filterColonia && !data.colonia.toLowerCase().includes(filterColonia)) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${data.photoUrl || 'https://via.placeholder.com/320x240?text=Sin+Foto'}" alt="Foto de ${data.name}" />
      <h3>${data.name}</h3>
      <p>Edad: ${age}</p>
      <p>Colonia: ${data.colonia}</p>
      <div class="card-actions">
        <button data-phone="${phone}" class="send-tap">Dar toque</button>
        <button data-phone="${phone}" class="send-message">Enviar mensaje</button>
      </div>
    `;
    profileList.appendChild(card);
  });
  attachProfileActions();
};

const attachProfileActions = () => {
  document.querySelectorAll('.send-tap').forEach(button => {
    button.addEventListener('click', async () => {
      const targetPhone = button.dataset.phone;
      await sendTap(targetPhone);
    });
  });
  document.querySelectorAll('.send-message').forEach(button => {
    button.addEventListener('click', async () => {
      const targetPhone = button.dataset.phone;
      await openChatWith(targetPhone);
    });
  });
};

const sendTap = async (targetPhone) => {
  const targetRef = doc(db, 'users', targetPhone);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) return;
  const target = targetSnap.data();
  sendPushNotification(targetPhone, 'Recibiste un toque', `${state.currentUser.name} te ha dado un toque.`);
  alert('Toque enviado.');
};

const openChatWith = async (targetPhone) => {
  const targetRef = doc(db, 'users', targetPhone);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) return;
  const target = targetSnap.data();
  state.activeChatUser = { ...target, phone: targetPhone };
  getElement('chat-with-name').textContent = `${target.name}`;
  getElement('chat-with-age').textContent = `Edad: ${calculateAge(target.birthdate)}`;
  setActiveScreen('chatDetail');
  await loadChatMessages(targetPhone);
};

const loadChatMessages = async (targetPhone) => {
  const chatMessages = getElement('chat-messages');
  chatMessages.innerHTML = '';
  const chatId = [state.currentUser.phone, targetPhone].sort().join('_');
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  const chatData = chatSnap.exists() ? chatSnap.data() : { messages: [] };
  chatData.messages.forEach(message => {
    const messageBlock = document.createElement('div');
    messageBlock.className = `chat-message ${message.from === state.currentUser.phone ? 'self' : 'other'}`;
    messageBlock.textContent = `${message.from === state.currentUser.phone ? 'Tú:' : state.activeChatUser.name + ':'} ${message.text}`;
    chatMessages.appendChild(messageBlock);
  });
};

const sendChatMessage = async () => {
  const text = getElement('chat-input').value.trim();
  if (!text || !state.activeChatUser) return;
  const chatId = [state.currentUser.phone, state.activeChatUser.phone].sort().join('_');
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  const chatData = chatSnap.exists() ? chatSnap.data() : { messages: [] };
  const message = {
    from: state.currentUser.phone,
    text,
    timestamp: new Date().toISOString()
  };
  chatData.messages.push(message);
  await setDoc(chatRef, chatData);
  getElement('chat-input').value = '';
  await loadChatMessages(state.activeChatUser.phone);
  
  const preview = text.length > 40 ? text.substring(0, 40) + '...' : text;
  sendPushNotification(
    state.activeChatUser.phone, 
    `Nuevo mensaje de ${state.currentUser.name}`, 
    preview
  );
};

document.getElementById('send-chat-message').addEventListener('click', sendChatMessage);

document.getElementById('share-location').addEventListener('click', async () => {
  if (!state.activeChatUser) return;
  await requestLocationPermission();
  if (!state.currentLocation) return;
  const locationText = `Mi ubicación: https://maps.google.com/?q=${state.currentLocation.latitude},${state.currentLocation.longitude}`;
  getElement('chat-input').value = locationText;
});

document.getElementById('block-chat-user').addEventListener('click', async () => {
  if (!state.activeChatUser) return;
  const confirmed = confirm(`¿Deseas bloquear a ${state.activeChatUser.name}?`);
  if (!confirmed) return;
  const userRef = doc(db, 'users', state.currentUser.phone);
  const updatedBlocked = [...(state.currentUser.blockedUsers || []), state.activeChatUser.phone];
  await updateDoc(userRef, { blockedUsers: updatedBlocked });
  state.currentUser.blockedUsers = updatedBlocked;
  alert('Usuario bloqueado.');
  setActiveScreen('chats');
  await loadChats();
});

document.getElementById('close-chat').addEventListener('click', () => setActiveScreen('chats'));
document.getElementById('back-from-chat').addEventListener('click', () => setActiveScreen('chats'));

document.getElementById('open-account').addEventListener('click', () => setActiveScreen('account'));
document.getElementById('open-chats').addEventListener('click', async () => {
  await loadChats();
  setActiveScreen('chats');
});
document.getElementById('open-blocked').addEventListener('click', async () => {
  await loadBlocked();
  setActiveScreen('blocked');
});

document.getElementById('back-to-main').addEventListener('click', () => setActiveScreen('main'));
document.getElementById('back-from-blocked').addEventListener('click', () => setActiveScreen('main'));

document.getElementById('logout').addEventListener('click', async () => {
  localStorage.removeItem('friendlyZapataAutoLogin');
  state.currentUser = null;
  setActiveScreen('login');
});

getElement('apply-filters').addEventListener('click', loadProfiles);

const loadBlocked = async () => {
  const blockedList = getElement('blocked-list');
  blockedList.innerHTML = '';
  const blockedUsers = state.currentUser.blockedUsers || [];
  for (const phone of blockedUsers) {
    const blockedRef = doc(db, 'users', phone);
    const blockedSnap = await getDoc(blockedRef);
    if (!blockedSnap.exists()) continue;
    const data = blockedSnap.data();
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${data.name}</h3>
      <p>Colonia: ${data.colonia}</p>
      <p>Teléfono: ${phone}</p>
    `;
    blockedList.appendChild(card);
  }
};

const loadChats = async () => {
  const chatsList = getElement('chats-list');
  chatsList.innerHTML = '';
  const q = query(collection(db, 'chats'));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    const chatId = docSnap.id;
    if (!chatId.includes(state.currentUser.phone)) return;
    const otherPhone = chatId.split('_').find(phone => phone !== state.currentUser.phone);
    if (!otherPhone) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>Chat con ${otherPhone}</h3>
      <button data-phone="${otherPhone}" class="open-chat-item">Abrir chat</button>
    `;
    chatsList.appendChild(card);
  });
  document.querySelectorAll('.open-chat-item').forEach(button => {
    button.addEventListener('click', () => openChatWith(button.dataset.phone));
  });
};

const accountForm = document.getElementById('account-form');
accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const userRef = doc(db, 'users', state.currentUser.phone);
  const updates = {
    name: getElement('account-name').value.trim(),
    birthdate: getElement('account-birthdate').value,
    address: getElement('account-address').value.trim(),
    municipio: getElement('account-municipio').value.trim(),
    colonia: getElement('account-colonia').value.trim()
  };
  await updateDoc(userRef, updates);
  state.currentUser = { ...state.currentUser, ...updates };
  showMessage('account-message', 'Tus datos se han actualizado.', true);
  await loadProfiles();
});

getElement('delete-account').addEventListener('click', async () => {
  const confirmed = confirm('¿Deseas eliminar tu cuenta permanentemente?');
  if (!confirmed) return;
  const userRef = doc(db, 'users', state.currentUser.phone);
  await deleteDoc(userRef);
  localStorage.removeItem('friendlyZapataAutoLogin');
  state.currentUser = null;
  setActiveScreen('login');
});

const tryAutoLogin = async () => {
  const phone = localStorage.getItem('friendlyZapataAutoLogin');
  if (!phone) return false;
  const userRef = doc(db, 'users', phone);
  const userSnapshot = await getDoc(userRef);
  if (!userSnapshot.exists()) return false;
  const user = userSnapshot.data();
  if (!user.verified) return false;
  state.currentUser = { ...user, phone };
  await enterMainScreen();
  return true;
};

const checkExistingPermissions = async () => {
  if (Notification.permission === 'granted') {
    state.notificationPermissionGranted = true;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.locationPermissionGranted = true;
        state.currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        resolve();
      },
      () => {
        state.locationPermissionGranted = false;
        resolve();
      }
    );
  });
};

const initOneSignal = async () => {
  // Esperar a que OneSignal esté disponible
  const waitForOneSignal = () => {
    return new Promise((resolve) => {
      if (window.OneSignal && window.OneSignal.init) {
        resolve();
      } else {
        const checkOneSignal = () => {
          if (window.OneSignal && window.OneSignal.init) {
            resolve();
          } else {
            setTimeout(checkOneSignal, 100);
          }
        };
        checkOneSignal();
      }
    });
  };

  try {
    await waitForOneSignal();
    console.log('✓ OneSignal SDK cargado');

    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes('ServiceWorker')) {
        event.preventDefault();
        console.log('ServiceWorker error suprimido');
      }
    });

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      console.log('Modo desarrollo: OneSignal no disponible en localhost');
      console.log('✓ Notificaciones locales disponibles');
      return;
    }

    await OneSignal.init({
      appId: "7119fde0-b643-4a77-8efc-124fd69ea0bd",
      allowLocalhostAsSecureOrigin: false,
      notifyButton: { enable: false },
      serviceWorkerUpdaterParam: { enabled: false },
      serviceWorkerParam: { enabled: false },
      autoResubscribe: true,
      autoRegister: true,
      promptOptions: {
        slidedown: {
          enabled: true,
          autoPrompt: true,
          actionMessage: "Te gustaría recibir notificaciones de nuevos mensajes?",
          acceptButtonText: "Sí, activar",
          cancelButtonText: "Ahora no"
        }
      }
    });

    // Mostrar el prompt después de inicializar
    setTimeout(() => {
      OneSignal.showSlidedownPrompt();
    }, 3000);

    console.log('✓ OneSignal inicializado correctamente');
  } catch (error) {
    console.log('✗ Error en inicialización de OneSignal:', error.message);
    console.log('OneSignal (modo sin service worker)');
  }
};

const initApp = async () => {
  await checkExistingPermissions();
  await initOneSignal();
  const autoLogged = await tryAutoLogin();
  if (autoLogged) return;
  if (state.notificationPermissionGranted && state.locationPermissionGranted) {
    setActiveScreen('consent');
  } else {
    setActiveScreen('permissions');
  }
};

window.addEventListener('load', initApp);
