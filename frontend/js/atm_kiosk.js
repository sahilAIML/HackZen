// ============================================================
// CASHROUTEAI - ATM TERMINAL & MULTI-BANK SWITCH CONTROLLER
// Interactive Prototype for Multi-Bank Cash Withdrawal & Real-Time Sync
// ============================================================

class AtmKioskManager {
  constructor(app) {
    this.app = app;
    this.currentAtm = null;
    this.selectedAccount = null;
    this.pinInput = '';
    this.selectedAmount = 2000;
    this.isProcessing = false;

    // Fallback accounts in case API is offline or running standalone
    this.mockAccounts = [
      {
        id: 1,
        card_number: '4591-1234-5678-3456',
        masked_card: '•••• •••• •••• 3456',
        card_type: 'HDFC Millennia Platinum Debit',
        bank_code: 'HDFC',
        bank_name: 'HDFC Bank',
        account_number: 'HDFC00010928374',
        holder_name: 'Aarav Sharma',
        pin: '1234',
        balance: 52400.0,
        daily_limit: 50000.0,
        gradient: 'linear-gradient(135deg, #004c8f 0%, #002244 100%)',
        accent: '#004c8f'
      },
      {
        id: 2,
        card_number: '5044-8765-4321-9012',
        masked_card: '•••• •••• •••• 9012',
        card_type: 'SBI Global International Debit',
        bank_code: 'SBI',
        bank_name: 'State Bank of India',
        account_number: 'SBIN00084729103',
        holder_name: 'Priya Patel',
        pin: '4321',
        balance: 35000.0,
        daily_limit: 40000.0,
        gradient: 'linear-gradient(135deg, #0284c7 0%, #075985 100%)',
        accent: '#0284c7'
      },
      {
        id: 3,
        card_number: '4111-2222-3333-4444',
        masked_card: '•••• •••• •••• 4444',
        card_type: 'ICICI Coral Chip Debit Card',
        bank_code: 'ICICI',
        bank_name: 'ICICI Bank',
        account_number: 'ICIC00055443322',
        holder_name: 'Rohan Verma',
        pin: '1122',
        balance: 88000.0,
        daily_limit: 100000.0,
        gradient: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
        accent: '#b91c1c'
      },
      {
        id: 4,
        card_number: '6011-9988-7766-5544',
        masked_card: '•••• •••• •••• 5544',
        card_type: 'Axis Bank Titanium Rewards',
        bank_code: 'AXIS',
        bank_name: 'Axis Bank',
        account_number: 'UTIB00099887766',
        holder_name: 'Ananya Iyer',
        pin: '9988',
        balance: 19500.0,
        daily_limit: 40000.0,
        gradient: 'linear-gradient(135deg, #9d174d 0%, #701a75 100%)',
        accent: '#9d174d'
      },
      {
        id: 5,
        card_number: '5200-3344-5566-7788',
        masked_card: '•••• •••• •••• 7788',
        card_type: 'PNB RuPay Select Debit',
        bank_code: 'PNB',
        bank_name: 'Punjab National Bank',
        account_number: 'PUNB00012398745',
        holder_name: 'Vikram Singh',
        pin: '2468',
        balance: 8200.0,
        daily_limit: 25000.0,
        gradient: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
        accent: '#b45309'
      },
      {
        id: 6,
        card_number: '6521-7788-9900-1122',
        masked_card: '•••• •••• •••• 1122',
        card_type: 'BOB Baroda World Contactless',
        bank_code: 'BOB',
        bank_name: 'Bank of Baroda',
        account_number: 'BARB00077889900',
        holder_name: 'Sneha Kulkarni',
        pin: '7788',
        balance: 14800.0,
        daily_limit: 30000.0,
        gradient: 'linear-gradient(135deg, #ea580c 0%, #9a3412 100%)',
        accent: '#ea580c'
      }
    ];

    this.recentWithdrawals = [];
  }

  async init() {
    console.log('Initializing ATM Terminal & Multi-Bank Switch Manager...');
    await this.loadBanks();
    this.populateAtmDropdown();
    this.selectAccount(this.mockAccounts[0]);
    this.renderAccountsTable();
    this.setupKeypadListeners();
    this.updateAtmStatusDisplay();
  }

  async loadBanks() {
    try {
      const res = await fetch('/api/atm/banks');
      if (res.ok) {
        const data = await res.json();
        if (data.accounts && data.accounts.length > 0) {
          // Merge gradients
          this.mockAccounts = data.accounts.map((acc, idx) => {
            const fallback = this.mockAccounts[idx % this.mockAccounts.length];
            return {
              ...acc,
              gradient: fallback.gradient,
              accent: fallback.accent
            };
          });
        }
      }
    } catch (e) {
      console.log('Using local multi-bank accounts simulation.');
    }
  }

  populateAtmDropdown() {
    const select = document.getElementById('kioskAtmSelect');
    if (!select) return;

    select.innerHTML = '';
    const atmsList = (this.app.atms && this.app.atms.atmsData) ? this.app.atms.atmsData : [];

    if (atmsList.length > 0) {
      atmsList.slice(0, 30).forEach(atm => {
        const opt = document.createElement('option');
        opt.value = atm.atm_code;
        opt.textContent = `${atm.atm_code} - ${atm.name} (Cash: ₹${(atm.current_cash || 0).toLocaleString('en-IN')})`;
        select.appendChild(opt);
      });
      this.currentAtm = atmsList[0];
    } else {
      // Default fallback
      const opt = document.createElement('option');
      opt.value = 'ATM-101';
      opt.textContent = 'ATM-101 - Central Financial District (Cash: ₹35,000)';
      select.appendChild(opt);
      this.currentAtm = {
        atm_code: 'ATM-101',
        name: 'Central Financial District ATM',
        city: 'Izmir',
        capacity: 100000,
        current_cash: 35000,
        criticality: 'LOW',
        predicted_demand: 18000,
        shortage: 0
      };
    }

    select.addEventListener('change', (e) => {
      this.onAtmChanged(e.target.value);
    });
  }

  async onAtmChanged(atmCode) {
    try {
      const res = await fetch(`/api/atm/terminal/${encodeURIComponent(atmCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.atm) {
          this.currentAtm = data.atm;
          this.updateAtmStatusDisplay();
          return;
        }
      }
    } catch (e) {}

    const atmsList = (this.app.atms && this.app.atms.atmsData) ? this.app.atms.atmsData : [];
    const found = atmsList.find(a => a.atm_code === atmCode);
    if (found) {
      this.currentAtm = found;
    } else {
      this.currentAtm = { ...this.currentAtm, atm_code: atmCode };
    }
    this.updateAtmStatusDisplay();
  }

  async refillCurrentAtm() {
    if (!this.currentAtm) return;
    const atmCode = this.currentAtm.atm_code;
    const btn = document.getElementById('btnRefillCassette');
    const statusText = document.getElementById('kioskRefillStatusText');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Refilling...';
    }

    try {
      const res = await fetch('/api/atm/refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atm_code: atmCode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.currentAtm.current_cash = data.current_cash;
        this.currentAtm.capacity = data.capacity;
        this.currentAtm.criticality = 'LOW';
        this.currentAtm.shortage = 0;
        this.updateAtmStatusDisplay();
        this.app.showToast(`Vault for ${atmCode} refilled to ₹${data.current_cash.toLocaleString('en-IN')}!`, 'success');
        if (statusText) {
          statusText.textContent = '✓ Refilled to 100% capacity';
          setTimeout(() => { if (statusText) statusText.textContent = ''; }, 4000);
        }
      } else {
        this.app.showToast(data.error || 'Failed to refill ATM cassette.', 'danger');
      }
    } catch (e) {
      this.currentAtm.current_cash = this.currentAtm.capacity || 100000;
      this.currentAtm.criticality = 'LOW';
      this.currentAtm.shortage = 0;
      this.updateAtmStatusDisplay();
      this.app.showToast(`Vault for ${atmCode} refilled locally.`, 'success');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '⚡ Refill Vault';
      }
    }
  }

  selectAccount(acc) {
    this.selectedAccount = acc;
    this.pinInput = '';
    this.updatePinDisplay();
    this.renderDebitCardGraphic();
    this.renderAccountsTable();
    this.resetDispenserView();
  }

  renderDebitCardGraphic() {
    const cardEl = document.getElementById('kioskCardGraphic');
    if (!cardEl || !this.selectedAccount) return;

    cardEl.style.background = this.selectedAccount.gradient;
    document.getElementById('cardBankNameDisplay').textContent = this.selectedAccount.bank_name;
    document.getElementById('cardNumberDisplay').textContent = this.selectedAccount.card_number;
    document.getElementById('cardHolderDisplay').textContent = this.selectedAccount.holder_name.toUpperCase();
    document.getElementById('cardTypeDisplay').textContent = this.selectedAccount.card_type;
    document.getElementById('cardBalanceBadge').textContent = `Bal: ₹${this.selectedAccount.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }

  renderAccountsTable() {
    const tbody = document.getElementById('kioskAccountsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    this.mockAccounts.forEach(acc => {
      const isSelected = this.selectedAccount && this.selectedAccount.card_number === acc.card_number;
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.style.background = isSelected ? 'rgba(79, 70, 229, 0.08)' : 'transparent';
      tr.onclick = () => this.selectAccount(acc);

      tr.innerHTML = `
        <td style="padding: 10px 12px; font-weight: 700; color: #1e293b;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${acc.accent};"></span>
            ${acc.bank_name}
          </div>
        </td>
        <td style="padding: 10px 12px; font-size: 0.84rem; color: #475569;">${acc.holder_name}</td>
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 0.8rem; color: #64748b;">${acc.masked_card}</td>
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 0.8rem; color: #4f46e5; font-weight: 700;">${acc.pin}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: #059669; font-family: var(--font-mono);">
          ₹${acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <button class="clay-button clay-button-sm ${isSelected ? 'clay-button-primary' : 'clay-button-secondary'}" style="padding: 4px 10px; font-size: 0.72rem;">
            ${isSelected ? '✓ Inserted' : 'Insert Card'}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  setupKeypadListeners() {
    const keys = document.querySelectorAll('.atm-keypad-btn');
    keys.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        this.handleKeypadInput(val);
      });
    });

    // Preset amounts
    const presetBtns = document.querySelectorAll('.atm-preset-amt');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const amt = parseInt(btn.getAttribute('data-amt'), 10);
        this.selectedAmount = amt;
        const customInput = document.getElementById('kioskCustomAmount');
        if (customInput) customInput.value = amt;
      });
    });

    const customInput = document.getElementById('kioskCustomAmount');
    if (customInput) {
      customInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val > 0) {
          this.selectedAmount = val;
          presetBtns.forEach(b => b.classList.remove('active'));
        }
      });
    }
  }

  handleKeypadInput(val) {
    if (this.isProcessing) return;

    if (val === 'CLEAR') {
      this.pinInput = '';
    } else if (val === 'BACK') {
      this.pinInput = this.pinInput.slice(0, -1);
    } else if (val === 'ENTER') {
      this.triggerWithdrawal();
      return;
    } else if (val === 'AUTOFILL') {
      if (this.selectedAccount) {
        this.pinInput = this.selectedAccount.pin;
      }
    } else {
      if (this.pinInput.length < 4) {
        this.pinInput += val;
      }
    }
    this.updatePinDisplay();
  }

  updatePinDisplay() {
    const dots = document.querySelectorAll('.atm-pin-dot');
    dots.forEach((dot, idx) => {
      if (idx < this.pinInput.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });

    const pinText = document.getElementById('kioskPinText');
    if (pinText) {
      pinText.textContent = this.pinInput.length > 0 ? '● '.repeat(this.pinInput.length).trim() : 'ENTER 4-DIGIT PIN';
    }
  }

  updateAtmStatusDisplay() {
    if (!this.currentAtm) return;

    const codeSpan = document.getElementById('kioskAtmCodeSpan');
    const cashSpan = document.getElementById('kioskAtmCashSpan');
    const capSpan = document.getElementById('kioskAtmCapSpan');
    const riskBadge = document.getElementById('kioskAtmRiskBadge');
    const progressBar = document.getElementById('kioskAtmCashBar');

    const cash = parseFloat(this.currentAtm.current_cash || 0);
    const cap = parseFloat(this.currentAtm.capacity || 100000);
    const pct = Math.min(100, Math.max(0, (cash / cap) * 100));

    if (codeSpan) codeSpan.textContent = this.currentAtm.atm_code;
    if (cashSpan) cashSpan.textContent = `₹${cash.toLocaleString('en-IN')}`;
    if (capSpan) capSpan.textContent = `₹${cap.toLocaleString('en-IN')}`;
    if (progressBar) {
      progressBar.style.width = `${pct}%`;
      progressBar.style.background = pct < 25 ? '#ef4444' : pct < 50 ? '#f59e0b' : '#10b981';
    }

    if (riskBadge) {
      const crit = this.currentAtm.criticality || 'LOW';
      riskBadge.textContent = crit;
      riskBadge.className = `clay-badge ${
        crit === 'CRITICAL' ? 'badge-critical' : crit === 'HIGH' ? 'badge-high' : crit === 'MEDIUM' ? 'badge-medium' : 'badge-low'
      }`;
    }
  }

  resetDispenserView() {
    const tray = document.getElementById('kioskCashTray');
    if (tray) tray.innerHTML = '<span style="color: #94a3b8; font-size: 0.82rem;">Cash dispenser tray ready. Notes will dispense here upon authorization.</span>';

    const receipt = document.getElementById('kioskReceiptPaper');
    if (receipt) receipt.style.display = 'none';

    const statusBanner = document.getElementById('kioskScreenStatus');
    if (statusBanner) {
      statusBanner.innerHTML = `
        <div style="font-size: 0.78rem; color: #10b981; font-weight: 700;">● SYSTEM READY</div>
        <div style="font-size: 0.72rem; color: #64748b;">NFS Interbank Network Connected &bull; ISO 8583 Active</div>
      `;
    }

    this.resetSwitchTrace();
  }

  resetSwitchTrace() {
    for (let i = 1; i <= 4; i++) {
      const node = document.getElementById(`traceStep${i}`);
      if (node) {
        node.classList.remove('active', 'completed', 'failed');
      }
    }
  }

  setSwitchTraceStep(step, status = 'active') {
    const node = document.getElementById(`traceStep${step}`);
    if (!node) return;
    node.classList.remove('active', 'completed', 'failed');
    node.classList.add(status);
  }

  async triggerWithdrawal() {
    if (this.isProcessing) return;

    if (!this.selectedAccount) {
      this.app.showToast('Please insert a bank card first.', 'warning');
      return;
    }

    if (this.pinInput.length !== 4) {
      this.app.showToast('Please enter complete 4-digit ATM PIN.', 'warning');
      return;
    }

    const amount = this.selectedAmount;
    if (!amount || amount <= 0 || amount % 100 !== 0) {
      this.app.showToast('Amount must be in multiples of ₹100.', 'warning');
      return;
    }

    this.isProcessing = true;
    const btn = document.getElementById('kioskWithdrawBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="live-pulse"></span> Processing via NFS Switch...';
    }

    // Step 1: Read Card
    this.setSwitchTraceStep(1, 'active');
    this.updateScreenStatus('Reading EMV Chip & Validating PIN...', '#4f46e5');
    await new Promise(r => setTimeout(r, 450));
    this.setSwitchTraceStep(1, 'completed');

    // Step 2: Routing to NFS Switch
    this.setSwitchTraceStep(2, 'active');
    this.updateScreenStatus(`Routing to NPCI / NFS Interbank Switch (BIN: ${this.selectedAccount.card_number.slice(0, 4)})...`, '#2563eb');
    await new Promise(r => setTimeout(r, 550));
    this.setSwitchTraceStep(2, 'completed');

    // Step 3: Issuer Core Banking
    this.setSwitchTraceStep(3, 'active');
    this.updateScreenStatus(`Contacting ${this.selectedAccount.bank_name} Core Banking Solution (CBS)...`, '#7c3aed');

    try {
      // Call Backend API
      const res = await fetch('/api/atm/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atm_code: this.currentAtm.atm_code,
          card_number: this.selectedAccount.card_number,
          pin: this.pinInput,
          amount: amount
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        this.setSwitchTraceStep(3, 'completed');
        this.setSwitchTraceStep(4, 'active');
        this.updateScreenStatus('Authorization Approved (00) &bull; Dispensing Banknotes...', '#059669');

        // Apply deduction to local account
        this.selectedAccount.balance = data.account_balance_after;

        // Apply deduction to local ATM
        this.currentAtm.current_cash = data.atm_cash_after;
        this.currentAtm.criticality = data.atm_risk_level;
        this.currentAtm.shortage = data.atm_shortage;

        await this.handleSuccessfulWithdrawal(data);
      } else {
        this.setSwitchTraceStep(3, 'failed');
        const errMsg = data.error || 'Transaction Declined by Issuer Bank.';
        this.updateScreenStatus(`DECLINED: ${errMsg}`, '#ef4444');
        this.app.showToast(errMsg, 'danger');
      }
    } catch (err) {
      // Seamless client-side fallback execution
      console.warn('Backend API request failed, executing client-side switch simulation:', err);
      await this.executeClientSideFallback(amount);
    } finally {
      this.isProcessing = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '💸 Withdraw & Dispense Cash';
      }
    }
  }

  async executeClientSideFallback(amount) {
    if (this.pinInput !== this.selectedAccount.pin) {
      this.setSwitchTraceStep(3, 'failed');
      this.updateScreenStatus('DECLINED: Incorrect PIN (Authorization 55)', '#ef4444');
      this.app.showToast('Incorrect PIN! Rejection code: 55', 'danger');
      return;
    }

    if (this.selectedAccount.balance < amount) {
      this.setSwitchTraceStep(3, 'failed');
      this.updateScreenStatus(`DECLINED: Insufficient Funds in ${this.selectedAccount.bank_name}`, '#ef4444');
      this.app.showToast(`Insufficient Funds! Available: ₹${this.selectedAccount.balance.toLocaleString('en-IN')}`, 'danger');
      return;
    }

    const currentAtmCash = parseFloat(this.currentAtm.current_cash || 0);
    if (currentAtmCash < amount) {
      this.setSwitchTraceStep(4, 'failed');
      this.updateScreenStatus('DECLINED: ATM Cassette Reserve Depleted', '#ef4444');
      this.app.showToast('ATM has insufficient cash reserve to dispense.', 'danger');
      return;
    }

    this.setSwitchTraceStep(3, 'completed');
    this.setSwitchTraceStep(4, 'active');
    this.updateScreenStatus('Authorization Approved (00) &bull; Dispensing Banknotes...', '#059669');

    // Calculate deductions
    const newAccountBal = this.selectedAccount.balance - amount;
    const newAtmCash = currentAtmCash - amount;
    this.selectedAccount.balance = newAccountBal;
    this.currentAtm.current_cash = newAtmCash;

    // Recalculate risk
    const req = parseFloat(this.currentAtm.required_cash || 25000);
    const shortage = Math.max(0, req - newAtmCash);
    let crit = 'LOW';
    if (shortage > 0) {
      const riskPct = (shortage / req) * 100;
      crit = riskPct >= 50 ? 'CRITICAL' : riskPct >= 25 ? 'HIGH' : 'MEDIUM';
    }
    this.currentAtm.criticality = crit;
    this.currentAtm.shortage = shortage;

    // Denominations
    let rem = amount;
    const notes_500 = Math.floor(rem / 500);
    rem %= 500;
    const notes_200 = Math.floor(rem / 200);
    rem %= 200;
    const notes_100 = Math.floor(rem / 100);

    const fallbackResult = {
      success: true,
      withdrawal_id: Date.now() % 100000,
      atm_code: this.currentAtm.atm_code,
      atm_name: this.currentAtm.name || `ATM ${this.currentAtm.atm_code}`,
      atm_city: this.currentAtm.city || 'Izmir',
      bank_code: this.selectedAccount.bank_code,
      bank_name: this.selectedAccount.bank_name,
      card_number_masked: this.selectedAccount.masked_card,
      holder_name: this.selectedAccount.holder_name,
      amount: amount,
      dispensed_notes: {
        '500': notes_500,
        '200': notes_200,
        '100': notes_100,
        total_notes: notes_500 + notes_200 + notes_100
      },
      switch_reference: `NFS-${this.selectedAccount.bank_code}-${Date.now().toString().slice(-8)}`,
      auth_code: `AUTH${Math.floor(100000 + Math.random() * 900000)}`,
      interbank_switch: 'National Financial Switch (NFS / NPCI)',
      account_balance_after: newAccountBal,
      atm_cash_after: newAtmCash,
      atm_risk_level: crit,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    await this.handleSuccessfulWithdrawal(fallbackResult);
  }

  async handleSuccessfulWithdrawal(data) {
    this.setSwitchTraceStep(4, 'completed');
    this.updateScreenStatus('✓ Cash Dispensed Successfully! Please take your cash and receipt.', '#059669');

    // Render physical cash notes in tray
    this.renderDispensedNotes(data.dispensed_notes);

    // Render thermal printed receipt
    this.renderReceipt(data);

    // Update displays
    this.updateAtmStatusDisplay();
    this.renderDebitCardGraphic();
    this.renderAccountsTable();

    // Add to recent withdrawal logs
    this.recentWithdrawals.unshift(data);
    this.renderWithdrawalsLog();

    // Clear PIN
    this.pinInput = '';
    this.updatePinDisplay();

    // Show system toast
    this.app.showToast(
      `Successfully dispensed ₹${data.amount.toLocaleString('en-IN')}! ATM ${data.atm_code} cash updated to ₹${data.atm_cash_after.toLocaleString('en-IN')} (${data.atm_risk_level} Risk).`,
      'success'
    );

    // Refresh master app data so Command Center and ATM table immediately reflect new balances
    if (this.app && typeof this.app.refreshAll === 'function') {
      try {
        await this.app.refreshAll();
      } catch (e) {
        console.log('App soft sync complete.');
      }
    }
  }

  updateScreenStatus(msg, color) {
    const statusBanner = document.getElementById('kioskScreenStatus');
    if (statusBanner) {
      statusBanner.innerHTML = `
        <div style="font-size: 0.84rem; color: ${color}; font-weight: 800;">${msg}</div>
      `;
    }
  }

  renderDispensedNotes(notes) {
    const tray = document.getElementById('kioskCashTray');
    if (!tray) return;

    tray.innerHTML = '';
    const noteItems = [];

    if (notes['500'] > 0) {
      noteItems.push({ val: 500, count: notes['500'], color: '#a855f7', bg: 'linear-gradient(135deg, #7e22ce, #a855f7)' });
    }
    if (notes['200'] > 0) {
      noteItems.push({ val: 200, count: notes['200'], color: '#f59e0b', bg: 'linear-gradient(135deg, #d97706, #fbbf24)' });
    }
    if (notes['100'] > 0) {
      noteItems.push({ val: 100, count: notes['100'], color: '#06b6d4', bg: 'linear-gradient(135deg, #0891b2, #22d3ee)' });
    }

    if (noteItems.length === 0) {
      tray.innerHTML = '<span style="color: #94a3b8; font-size: 0.8rem;">No notes dispensed.</span>';
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '12px';
    wrapper.style.flexWrap = 'wrap';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.width = '100%';

    noteItems.forEach(item => {
      const noteEl = document.createElement('div');
      noteEl.className = 'dispensed-banknote-bundle';
      noteEl.style.background = item.bg;
      noteEl.innerHTML = `
        <div style="font-size: 0.68rem; opacity: 0.9; text-transform: uppercase;">Reserve Bank</div>
        <div style="font-size: 1.15rem; font-weight: 800; letter-spacing: 0.05em;">₹${item.val}</div>
        <div style="font-size: 0.72rem; font-weight: 700; background: rgba(0,0,0,0.25); padding: 2px 8px; border-radius: 6px;">
          ${item.count} Notes (₹${(item.val * item.count).toLocaleString('en-IN')})
        </div>
      `;
      wrapper.appendChild(noteEl);
    });

    tray.appendChild(wrapper);
  }

  renderReceipt(data) {
    const receipt = document.getElementById('kioskReceiptPaper');
    if (!receipt) return;

    receipt.style.display = 'block';

    let notesSummary = [];
    if (data.dispensed_notes['500']) notesSummary.push(`₹500 x ${data.dispensed_notes['500']}`);
    if (data.dispensed_notes['200']) notesSummary.push(`₹200 x ${data.dispensed_notes['200']}`);
    if (data.dispensed_notes['100']) notesSummary.push(`₹100 x ${data.dispensed_notes['100']}`);

    receipt.innerHTML = `
      <div style="text-align: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 8px;">
        <strong style="font-size: 0.95rem; color: #0f172a; letter-spacing: 0.04em;">${data.bank_name.toUpperCase()}</strong>
        <div style="font-size: 0.7rem; color: #64748b;">NATIONAL FINANCIAL SWITCH (NFS)</div>
        <div style="font-size: 0.7rem; color: #64748b;">ATM TRANSACTION RECORD</div>
      </div>

      <div style="font-size: 0.76rem; font-family: var(--font-mono); color: #334155; line-height: 1.6;">
        <div style="display: flex; justify-content: space-between;">
          <span>DATE/TIME:</span>
          <span>${data.timestamp}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>TERMINAL ID:</span>
          <strong>${data.atm_code}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>LOCATION:</span>
          <span>${data.atm_name || 'Central District'}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>CARD NUMBER:</span>
          <span>${data.card_number_masked}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>CARDHOLDER:</span>
          <span>${data.holder_name}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>AUTH CODE:</span>
          <strong>${data.auth_code}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>SWITCH REF:</span>
          <span>${data.switch_reference}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>RESPONSE:</span>
          <span style="color: #059669; font-weight: 700;">00 - APPROVED</span>
        </div>

        <div style="border-top: 1px dashed #cbd5e1; margin: 8px 0; padding-top: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 800; color: #0f172a;">
            <span>WITHDRAWAL:</span>
            <span>₹${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #64748b; margin-top: 2px;">
            <span>NOTES BREAKDOWN:</span>
            <span>${notesSummary.join(', ')}</span>
          </div>
        </div>

        <div style="border-top: 1px dashed #cbd5e1; margin: 8px 0; padding-top: 8px;">
          <div style="display: flex; justify-content: space-between; font-weight: 700; color: #059669;">
            <span>AVAILABLE BALANCE:</span>
            <span>₹${data.account_balance_after.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #64748b;">
            <span>ATM CASH REMAINING:</span>
            <span>₹${data.atm_cash_after.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px; font-size: 0.68rem; color: #94a3b8;">
        THANK YOU FOR BANKING WITH US &bull; 24x7 TOLL FREE: 1800-425-0000
      </div>
    `;
  }

  renderWithdrawalsLog() {
    const tbody = document.getElementById('kioskRecentWithdrawalsBody');
    if (!tbody) return;

    if (this.recentWithdrawals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 18px; color: #94a3b8;">No recent withdrawals yet. Complete a transaction above to view live audit entries.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    this.recentWithdrawals.slice(0, 10).forEach(tx => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 8px 12px; font-size: 0.76rem; font-family: var(--font-mono); color: #64748b;">${tx.timestamp.slice(11)}</td>
        <td style="padding: 8px 12px; font-weight: 700; color: #1e293b;">${tx.atm_code}</td>
        <td style="padding: 8px 12px; font-size: 0.8rem;">
          <strong>${tx.bank_code}</strong> &bull; ${tx.holder_name}
        </td>
        <td style="padding: 8px 12px; font-family: var(--font-mono); font-weight: 800; color: #059669;">
          ₹${tx.amount.toLocaleString('en-IN')}
        </td>
        <td style="padding: 8px 12px; font-size: 0.74rem; font-family: var(--font-mono); color: #64748b;">${tx.auth_code}</td>
        <td style="padding: 8px 12px;">
          <span class="clay-badge badge-low" style="font-size: 0.7rem; padding: 2px 8px;">SUCCESS</span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Make accessible to app
window.AtmKioskManager = AtmKioskManager;
