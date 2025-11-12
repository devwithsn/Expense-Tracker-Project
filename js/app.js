// Expense Tracker JS - uses localStorage
const STORAGE_KEY = 'expense_tracker_v1';
let txns = [];

const txnForm = document.getElementById('txnForm');
const amountEl = document.getElementById('amount');
const typeEl = document.getElementById('type');
const categoryEl = document.getElementById('category');
const dateEl = document.getElementById('date');
const noteEl = document.getElementById('note');
const txnList = document.getElementById('txnList');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const balanceEl = document.getElementById('balance');
const filterMonth = document.getElementById('filterMonth');
const searchText = document.getElementById('searchText');
const exportCsvBtn = document.getElementById('exportCsv');
const clearAllBtn = document.getElementById('clearAll');

let categoryChart = null;

function uid() { return 't_' + Math.random().toString(36).slice(2,9); }

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(txns)); }
function load(){ try{ txns = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }catch(e){ txns = []; } }

function addTxn(txn){
  txns.push(txn);
  save();
  render();
}

function deleteTxn(id){
  txns = txns.filter(t => t.id !== id);
  save();
  render();
}

function clearAll(){
  if(confirm('Clear all transactions?')){ txns = []; save(); render(); }
}

function exportCSV(){
  if(txns.length === 0){ alert('No transactions to export.'); return; }
  const rows = [['id','type','amount','category','date','note']];
  txns.forEach(t => rows.push([t.id,t.type,t.amount,t.category,t.date,t.note]));
  const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function filterAndSort(){
  let list = [...txns];
  const month = filterMonth.value;
  const q = (searchText.value || '').toLowerCase();
  if(month){
    // month format yyyy-mm
    list = list.filter(t => t.date.startsWith(month));
  }
  if(q){
    list = list.filter(t => t.note.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }
  // newest first
  list.sort((a,b) => new Date(b.date) - new Date(a.date));
  return list;
}

function render(){
  const list = filterAndSort();
  txnList.innerHTML = '';
  if(list.length === 0){
    txnList.innerHTML = '<li class="txn-item">No transactions yet.</li>';
  } else {
    list.forEach(t => {
      const li = document.createElement('li');
      li.className = 'txn-item';
      const left = document.createElement('div');
      left.className = 'txn-left';
      const dot = document.createElement('div');
      dot.className = 'txn-type ' + (t.type === 'income' ? 'income' : 'expense');
      const meta = document.createElement('div');
      meta.className = 'txn-meta';
      meta.innerHTML = '<div>' + t.category + ' • ' + t.date + '</div><div style="color:#6b7280;font-size:0.85rem">' + (t.note||'') + '</div>';
      left.appendChild(dot);
      left.appendChild(meta);

      const right = document.createElement('div');
      right.innerHTML = '<div class="txn-amount">' + (t.type==='income'?'+ ':'- ') + '₹' + Number(t.amount).toFixed(2) + '</div><div style="margin-top:6px"><button class="small-btn" data-id="' + t.id + '">Delete</button></div>';

      li.appendChild(left);
      li.appendChild(right);
      txnList.appendChild(li);

      // delete handler
      right.querySelector('button').addEventListener('click', () => deleteTxn(t.id));
    });
  }

  // totals (respecting filters)
  const totals = list.reduce((acc, t) => {
    if(t.type === 'income') acc.income += Number(t.amount);
    else acc.expense += Number(t.amount);
    return acc;
  }, {income:0, expense:0});

  totalIncomeEl.textContent = '₹' + totals.income.toFixed(2);
  totalExpenseEl.textContent = '₹' + totals.expense.toFixed(2);
  balanceEl.textContent = '₹' + (totals.income - totals.expense).toFixed(2);

  renderChart(list);
}

function renderChart(list){
  // category breakdown (expenses only) for visible list
  const map = {};
  list.forEach(t => {
    const key = t.category;
    if(!(key in map)) map[key] = 0;
    if(t.type === 'expense') map[key] += Number(t.amount);
  });
  const labels = Object.keys(map);
  const data = labels.map(k => map[k]);
  const ctx = document.getElementById('categoryChart').getContext('2d');
  if(categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        // colors optional - Chart.js will assign defaults if not provided
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  // set default date to today
  const today = new Date().toISOString().slice(0,10);
  dateEl.value = today;

  load();
  render();

  txnForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amt = parseFloat(amountEl.value);
    if(isNaN(amt) || amt <= 0) { alert('Enter a valid amount'); return; }
    const txn = {
      id: uid(),
      type: typeEl.value,
      amount: amt,
      category: categoryEl.value,
      date: dateEl.value,
      note: noteEl.value || ''
    };
    addTxn(txn);
    txnForm.reset();
    dateEl.value = today;
  });

  filterMonth.addEventListener('change', render);
  searchText.addEventListener('input', render);
  exportCsvBtn.addEventListener('click', exportCSV);
  clearAllBtn.addEventListener('click', clearAll);
});
