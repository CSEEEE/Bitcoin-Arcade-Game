import { Game } from './modules/Game.js';

const FPS = 60;
const interval = 1000 / FPS;
let then;

const ADMIN_KEY = '454bb44fabdf4903ba030c16039995f9';
const BASE_URL = 'https://legend.lnbits.com';
const INVOICE_READ_KEY = '1834215569f74efebeb4c337730d2b2b';

export const game = new Game();

// Define a function to create the invoice
async function createInvoice(amount, memo) {
  const response = await fetch(`${BASE_URL}/api/v1/payments`, {
    method: 'POST',
    headers: {
      'X-Api-Key': INVOICE_READ_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      out: false,
      amount,
      memo
    })
  });

  if (response.ok) {
    const data = await response.json();
    return data;
  } else {
    throw new Error(`Failed to create invoice: ${response.statusText}`);
  }
}

// Define a function to check invoice status
async function checkInvoiceStatus(paymentHash) {
  const response = await fetch(`${BASE_URL}/api/v1/payments/${paymentHash}`, {
    method: 'GET',
    headers: {
      'X-Api-Key': INVOICE_READ_KEY
    }
  });

  if (response.ok) {
    const data = await response.json();
    return data.paid;
  } else {
    throw new Error(`Failed to check invoice status: ${response.statusText}`);
  }
}

// Define a function to create the withdrawal link
async function createWithdrawLink({title, min_withdrawable, max_withdrawable, uses, wait_time, is_unique, webhook_url}) {
  const response = await fetch(`${BASE_URL}/withdraw/api/v1/links`, {
    method: 'POST',
    headers: {
      'X-Api-Key': ADMIN_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title, 
      min_withdrawable, 
      max_withdrawable, 
      uses, 
      wait_time, 
      is_unique, 
      webhook_url
    })
  });

  if (response.ok) {
    const data = await response.json();
    return data.lnurl;
  } else {
    throw new Error(`Failed to create withdraw link: ${response.statusText}`);
  }
}

async function startGame() {
    const invoice = await createInvoice(game.entryFee, 'Game Entry Fee');
    
    // Create QR code with invoice.payment_request
    let QRCode = new QRCode(document.getElementById("qrcode"), {
      text: invoice.payment_request,
      width: 128,
      height: 128,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });
  
    // Show the invoice.payment_request to the user so they can pay
    document.getElementById('lnurl').innerText = invoice.payment_request;
  
    // Poll for invoice status every 10 seconds
    let invoiceCheck = setInterval(async function() {
      let invoicePaid = await checkInvoiceStatus(invoice.payment_hash);
  
      // If the invoice is paid, start the game and clear interval
      if (invoicePaid) {
        clearInterval(invoiceCheck);
        window.requestAnimationFrame(gameloop);
      }
    }, 10000);
  }
  

  async function endGame() {
    if (game.state.over) {
      const withdrawLink = await createWithdrawLink({
        title: 'Game Winnings',
        min_withdrawable: game.points * game.pointValue, 
        max_withdrawable: game.points * game.pointValue, 
        uses: 1,
        wait_time: 0,
        is_unique: true,
        webhook_url: '' 
      });
  
      // Create QR code with withdrawLink
      let QRCode = new QRCode(document.getElementById("qrcodeEnd"), {
        text: withdrawLink,
        width: 128,
        height: 128,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
  
      // Show the withdrawLink to the user so they can withdraw their winnings
      document.getElementById('lnurlEnd').innerText = withdrawLink;
  
      // Show the end screen
      document.getElementById('endScreen').style.display = 'block';
    }
}
  

export function gameloop(timestamp) {
  if (!game.state.paused && !game.state.over) {
    if (then === undefined) {
      then = timestamp;
    }

    const delta = timestamp - then;
    window.requestAnimationFrame(gameloop);
    if (delta > interval) {
      game.draw();
      game.move();
      game.checkCollisions();
      game.refresh();
      then = timestamp - (delta % interval);
      return;
    }
  }
  if (game.state.over) {
    endGame();
    return;
  }
  if (game.state.paused) {
    return game.scene.drawPause();
  }
}

document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('startBtn').addEventListener('click', () => {
      document.getElementById('startScreen').style.display = 'none';
      window.requestAnimationFrame(gameloop);
    });
});  

startGame();
