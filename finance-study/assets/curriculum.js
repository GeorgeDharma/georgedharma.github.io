'use strict';
(() => {
  const query = document.getElementById('review-find');
  if (query) {
    const cards = Array.from(document.querySelectorAll('[data-review-item]'));
    const groups = document.querySelectorAll('[data-review-group]');
    const count = document.getElementById('review-count');
    query.addEventListener('input', () => {
      const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      for (const card of cards) card.hidden = !words.every(word => card.dataset.filter.includes(word));
      for (const group of groups) group.hidden = !group.querySelector('[data-review-item]:not([hidden])');
      const found = cards.filter(card => !card.hidden).length;
      count.textContent = found ? found + (found === 1 ? ' subject review' : ' subject reviews') : 'No matching subject. Try a shorter topic or university name.';
    });
  }
  const form = document.getElementById('ipo-controls');
  if (!form) return;
  const terms = JSON.parse(document.getElementById('ipo-assumptions').textContent);
  const cash = number => '€' + number.toFixed(2) + 'm';
  const qty = number => number.toFixed(2) + 'm';
  const pct = number => (number * 100).toFixed(2) + '%';
  const rows = Array.from(document.querySelectorAll('#ipo-grid tbody tr'));
  const decide = (price, issued, sold, withdrawal) => {
    const offered = issued + sold;
    const eligible = terms.orders.reduce((sum, [limit, quantity]) => sum + (limit >= price ? quantity : 0), 0);
    const after = Math.max(0, eligible - withdrawal);
    const issuer = price * issued * (1 - terms.fee) - terms.expenses;
    const seller = price * sold * (1 - terms.fee);
    const dilution = issued / (terms.old + issued);
    const retained = (terms.founder - sold) / (terms.old + issued);
    const misses = [];
    if (issuer + 1e-9 < terms.cashFloor) misses.push('Issuer cash');
    if (seller + 1e-9 < terms.sellerFloor) misses.push('Founder cash');
    if (dilution > terms.dilutionCap + 1e-9) misses.push('Dilution');
    if (after + 1e-9 < offered) misses.push('Order book');
    return {offered, after, issuer, seller, dilution, retained, misses};
  };
  function render() {
    const [price, issued, sold, withdrawal] = ['price', 'new', 'sold', 'stress'].map(k => Number(form.elements[k].value));
    const current = decide(price, issued, sold, withdrawal);
    const displays = {issuer: cash, seller: cash, dilution: pct, retained: pct, after: qty, offered: qty};
    for (const field of Object.keys(displays)) {
      document.querySelector('[data-ipo-result="' + field + '"]').textContent = displays[field](current[field]);
    }
    const verdict = document.getElementById('ipo-verdict');
    if (current.misses.length) {
      verdict.textContent = 'Revise the offer. Failed tests: ' + current.misses.join(', ') + '.';
    } else {
      const buffer = current.after - current.offered;
      verdict.textContent = buffer < 1e-9 ? 'All four tests pass. The stressed book exactly covers the offer.' :
        'All four tests pass. The stressed book has ' + qty(buffer) + ' more orders than shares offered.';
    }
    verdict.classList.toggle('reprice', Boolean(current.misses.length));
    for (const [index, row] of rows.entries()) {
      const candidate = terms.prices[index];
      const result = decide(candidate, issued, sold, withdrawal);
      const values = ['€' + candidate.toFixed(2), cash(result.issuer), cash(result.seller), pct(result.dilution), qty(result.after), result.misses.join(', ') || 'Pass'];
      Array.from(row.cells).forEach((cell, col) => { cell.textContent = values[col]; });
      row.classList.toggle('chosen-offer', candidate === price);
    }
  }
  form.addEventListener('change', render);
  form.addEventListener('reset', () => setTimeout(render, 0));
  render();
})();
