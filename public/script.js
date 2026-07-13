// script.js
let cart = [];

function renderCart() {
  const body = document.getElementById('cartBody');
  const countLabel = document.getElementById('itemCount');
  const submitBtn = document.getElementById('submitBtn');

  countLabel.textContent = `${cart.length} item${cart.length === 1 ? '' : 's'}`;
  submitBtn.disabled = cart.length === 0;

  if (cart.length === 0) {
    body.innerHTML = '<div class="docket-empty">No items yet — try saying "two large Smiths chips"</div>';
    return;
  }

  body.innerHTML = cart.map((item, i) => `
    <div class="docket-row ${item.verified ? '' : 'unverified'}">
      <span class="docket-name">
        ${item.name}
        ${item.verified ? '' : '<span class="docket-flag">verify</span>'}
      </span>
      <span class="docket-size">${item.size || '-'}</span>
      <input class="docket-qty" type="number" value="${item.qty}" onchange="updateQty(${i}, this.value)">
      <button class="docket-remove" onclick="removeItem(${i})">Remove</button>
    </div>
  `).join('');
}

function updateQty(i, val) {
  cart[i].qty = parseInt(val) || 1;
}

function removeItem(i) {
  cart.splice(i, 1);
  renderCart();
}

const micBtn = document.getElementById('micBtn');
const transcriptDiv = document.getElementById('transcript');
const statusDiv = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let listening = false;

if (!SpeechRecognition) {
  micBtn.disabled = true;
  micBtn.textContent = 'Speech recognition not supported in this browser';
  document.getElementById('manualForm').style.display = 'flex';
} else {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-AU';

  micBtn.addEventListener('click', () => {
    if (listening) return;
    recognition.start();
  });

  recognition.onstart = () => {
    listening = true;
    micBtn.classList.add('listening');
    micBtn.textContent = 'Listening…';
    statusDiv.textContent = '';
  };

  recognition.onend = () => {
    listening = false;
    micBtn.classList.remove('listening');
    micBtn.textContent = 'Tap to speak';
  };

  recognition.onerror = (e) => {
    statusDiv.textContent = 'Error: ' + e.error;
  };

  recognition.onresult = async (event) => {
    const text = event.results[0][0].transcript;
    transcriptDiv.textContent = text;
    statusDiv.textContent = 'Parsing with AI…';
    await sendToBackend(text);
  };
}

async function sendToBackend(text) {
  try {
    const response = await fetch('/api/parse-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        currentItems: cart.map(i => ({ name: i.name, size: i.size, qty: i.qty }))
      })
    });

    if (!response.ok) throw new Error('Server responded with an error');

    const data = await response.json();
    cart = data.items;
    renderCart();
    statusDiv.textContent = 'Order updated.';
  } catch (err) {
    statusDiv.textContent = 'Could not parse that — add it manually below, or try again.';
    document.getElementById('manualForm').style.display = 'flex';
    console.error(err);
  }
}

// --- Manual fallback entry ---
const manualToggle = document.getElementById('manualToggle');
const manualForm = document.getElementById('manualForm');
const manualAddBtn = document.getElementById('manualAddBtn');

manualToggle.addEventListener('click', () => {
  const isHidden = manualForm.style.display === 'none';
  manualForm.style.display = isHidden ? 'flex' : 'none';
});

manualAddBtn.addEventListener('click', () => {
  const name = document.getElementById('manualName').value.trim();
  const size = document.getElementById('manualSize').value.trim();
  const qty = parseInt(document.getElementById('manualQty').value) || 1;

  if (!name) {
    statusDiv.textContent = 'Enter an item name before adding.';
    return;
  }

  cart.push({
    name,
    size: size || null,
    qty,
    product_id: null,
    confidence: 1,
    verified: true,
    spoken_name: name
  });

  renderCart();
  statusDiv.textContent = `${name} added manually.`;

  document.getElementById('manualName').value = '';
  document.getElementById('manualSize').value = '';
  document.getElementById('manualQty').value = 1;
});

submitBtn.addEventListener('click', async () => {
  if (cart.length === 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  try {
    const response = await fetch('/api/submit-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart })
    });

    if (!response.ok) throw new Error('Submit failed');

    const data = await response.json();
    statusDiv.textContent = `Order #${data.orderId} submitted.`;
    cart = [];
    renderCart();
  } catch (err) {
    statusDiv.textContent = 'Could not submit order — try again.';
    console.error(err);
  } finally {
    submitBtn.textContent = 'Confirm & Submit Order';
  }
});

// --- CSV export ---
// Runs entirely in the browser — no backend round trip needed, since
// we already have the cart data client-side.
const exportBtn = document.getElementById('exportBtn');

exportBtn.addEventListener('click', () => {
  if (cart.length === 0) {
    statusDiv.textContent = 'Nothing to export yet.';
    return;
  }

  const header = ['Item', 'Size', 'Qty', 'Verified'];
  const rows = cart.map(item => [
    item.name,
    item.size || '',
    item.qty,
    item.verified ? 'Yes' : 'No'
  ]);

  const escapeCsvField = (field) => `"${String(field).replace(/"/g, '""')}"`;

  const csvContent = [header, ...rows]
    .map(row => row.map(escapeCsvField).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `order-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
  statusDiv.textContent = 'Order exported as CSV.';
});

// --- Order history ---
const historyToggle = document.getElementById('historyToggle');
const historySection = document.getElementById('historySection');
const historyBody = document.getElementById('historyBody');

historyToggle.addEventListener('click', async () => {
  const isHidden = historySection.style.display === 'none';

  if (isHidden) {
    historySection.style.display = 'block';
    historyBody.innerHTML = '<div class="docket-empty">Loading…</div>';

    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      renderHistory(data.orders);
    } catch (err) {
      historyBody.innerHTML = '<div class="docket-empty">Could not load history.</div>';
      console.error(err);
    }
  } else {
    historySection.style.display = 'none';
  }
});

function renderHistory(orders) {
  if (!orders || orders.length === 0) {
    historyBody.innerHTML = '<div class="docket-empty">No past orders yet.</div>';
    return;
  }

  historyBody.innerHTML = orders.map(order => {
    const itemsText = order.items
      .map(i => `${i.qty}x ${i.matched_name || i.spoken_name}${i.size ? ' (' + i.size + ')' : ''}`)
      .join(', ');

    return `
      <div class="history-order">
        <div class="history-order-date">Order #${order.id} — ${order.created_at}</div>
        <div class="history-order-items">${itemsText}</div>
      </div>
    `;
  }).join('');
}