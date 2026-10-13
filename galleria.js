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
    img.parentElement.classList.remove('chiusa');
  }
}

async function prova(password) {
  esito.textContent = 'Apro le foto...';
  try {
    await apri(password);
    sessionStorage.setItem('galleria', password);   // vale per l'altra galleria, finche' la scheda resta aperta
    modulo.hidden = true;
    mostra(0, false);          // le foto aperte si sono infilate in mezzo alle altre: si riparte dalla prima
    aggiorna();
  } catch (e) {
    sessionStorage.removeItem('galleria');
    esito.textContent = e.name === 'OperationError' ? 'Password sbagliata.' : 'Le foto non si aprono: ' + e.message;
  }
}

// La presentazione: una foto per volta. La striscia scorre in orizzontale a scatti (cosi' sul telefono
// si sfoglia col dito senza una riga di codice), frecce, tastiera e scorrimento automatico la spostano.
const comandi = document.getElementById('comandi');
const conta = document.getElementById('conta');
const pausa = document.getElementById('pausa');
const visibili = () => striscia.querySelectorAll('.foto:not(.chiusa)').length;
const indice = () => Math.round(striscia.scrollLeft / striscia.clientWidth);
let giro = null;

function mostra(i, dolce = true) {
  striscia.scrollTo({ left: i * striscia.clientWidth, behavior: dolce ? 'smooth' : 'auto' });
}
function passo(d) {
  const n = visibili(), i = indice() + d;
  if (i < 0 || i >= n) mostra((i + n) % n, false);   // dall'ultima alla prima senza ripassarle tutte
  else mostra(i);
}
function aggiorna() {
  const n = visibili();
  comandi.hidden = striscia.hidden = !n;
  conta.textContent = n ? `${Math.min(indice(), n - 1) + 1} / ${n}` : '';
}
function scorri(acceso) {
  clearInterval(giro);
  giro = acceso ? setInterval(() => passo(1), 6000) : null;    // 6 secondi: il displayTime dell'AutoViewer
  pausa.textContent = acceso ? '\u275A\u275A' : '\u25B6';
  pausa.setAttribute('aria-label', acceso ? 'Ferma lo scorrimento' : 'Fai scorrere le foto');
}
// chi sfoglia a mano ferma lo scorrimento automatico: lo riaccende col pulsante
const aMano = d => { scorri(false); passo(d); };
document.getElementById('prima').addEventListener('click', () => aMano(-1));
document.getElementById('dopo').addEventListener('click', () => aMano(1));
striscia.addEventListener('click', () => aMano(1));
striscia.addEventListener('touchstart', () => scorri(false), { passive: true });
pausa.addEventListener('click', () => scorri(!giro));
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft') aMano(-1);
  if (e.key === 'ArrowRight') aMano(1);
});
striscia.addEventListener('scroll', aggiorna, { passive: true });
aggiorna();
scorri(!matchMedia('(prefers-reduced-motion: reduce)').matches);

if (!chiuse.length) modulo.hidden = true;
else if (sessionStorage.getItem('galleria')) prova(sessionStorage.getItem('galleria'));
modulo.addEventListener('submit', e => { e.preventDefault(); prova(modulo.password.value); });
