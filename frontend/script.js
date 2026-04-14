document.addEventListener('DOMContentLoaded', function () {
  const container = document.getElementById('invoice-container');

  fetch('/api/invoice')
    .then(function (resp) {
      if (!resp.ok) throw new Error('Server returned ' + resp.status);
      return resp.json();
    })
    .then(function (data) {
      const invoice = Array.isArray(data) ? data[0] : data;

      if (!invoice || !invoice.items || invoice.items.length === 0) {
        container.innerHTML = '<p class="error-msg">No invoice data found.</p>';
        return;
      }

      const subtotal = invoice.items.reduce(function (sum, i) {
        return sum + i.price * i.quantity;
      }, 0);
      const total = invoice.total || subtotal;

      const dueDate = new Date(invoice.date);
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateStr = dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const issueDateStr = new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      let rows = '';
      invoice.items.forEach(function (item) {
        const lineTotal = (item.price * item.quantity).toFixed(2);
        rows += `
          <tr>
            <td>
              <div class="item-name">${escapeHtml(item.name)}</div>
            </td>
            <td class="center">${item.quantity}</td>
            <td class="right">$${Number(item.price).toFixed(2)}</td>
            <td class="right line-total">$${lineTotal}</td>
          </tr>`;
      });

      container.innerHTML = `
        <div class="inv-header">
          <div>
            <div class="inv-title">Invoice #00${invoice.invoiceId}</div>
            <div class="inv-date">Issued: ${issueDateStr}</div>
          </div>
          <span class="status-badge">${escapeHtml(invoice.status)}</span>
        </div>

        <div class="inv-meta">
          <div>
            <div class="meta-label">Billed to</div>
            <div class="meta-name">${escapeHtml(invoice.customerName)}</div>
          </div>
          <div class="inv-meta-right">
            <div class="meta-label">Amount due</div>
            <div class="meta-amount">$${Number(total).toFixed(2)}</div>
            <div class="meta-due">Due ${dueDateStr}</div>
          </div>
        </div>

        <div class="inv-items">
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="center">Qty</th>
                <th class="right">Unit price</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="inv-totals">
          <div class="totals-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
          <div class="totals-row"><span>Tax (0%)</span><span>$0.00</span></div>
          <div class="grand-total"><span>Total due</span><span>$${Number(total).toFixed(2)}</span></div>
        </div>

        <div class="inv-footer">
          <p>Payment due within 30 days of issue date.</p>
          <button class="btn-print" onclick="window.print()">Print</button>
        </div>`;
    })
    .catch(function (er) {
      console.error('Failed to load invoice:', er);
      container.innerHTML = '<p class="error-msg">Failed to load invoice. Please try again.</p>';
    });
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
