// Le foto con persone sono file cifrati (AES-256-GCM): qui si rifa' la chiave dalla password e si aprono.
// Formato di ogni .bin, scritto da converti.py: 12 byte di vettore, poi il cifrato con l'etichetta in coda.
const striscia = document.getElementById('striscia');
const modulo = document.getElementById('chiave');
const esito = document.getElementById('esito');
const chiuse = [...striscia.querySelectorAll('img[data-cifrata]')];

const daEsa = s => Uint8Array.from(s.match(/../g), b => parseInt(b, 16));

async function apri(password) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.trim()), 'PBKDF2', false, ['deriveKey']);
  const chiave = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: daEsa(striscia.dataset.sale), iterations: +striscia.dataset.giri },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  // una alla volta e in ordine: la prima che non si apre dice che la password e' sbagliata
  for (const img of chiuse) {
    const b = await (await fetch(img.dataset.cifrata)).arrayBuffer();
    const foto = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, chiave, b.slice(12));
    img.src = URL.createObjectURL(new Blob([foto], { type: 'image/jpeg' }));
  }
}

async function prova(password) {
  esito.textContent = 'Apro le foto...';
  try {
    await apri(password);
    sessionStorage.setItem('galleria', password);   // vale per l'altra galleria, finche' la scheda resta aperta
    modulo.hidden = true;
  } catch (e) {
    sessionStorage.removeItem('galleria');
    esito.textContent = e.name === 'OperationError' ? 'Password sbagliata.' : 'Le foto non si aprono: ' + e.message;
  }
}

if (!chiuse.length) modulo.hidden = true;
else if (sessionStorage.getItem('galleria')) prova(sessionStorage.getItem('galleria'));
modulo.addEventListener('submit', e => { e.preventDefault(); prova(modulo.password.value); });
