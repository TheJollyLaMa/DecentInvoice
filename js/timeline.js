// js/timeline.js
import { formatAddress } from "./wallet.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

export async function fetchOpenInvoices(contract, userAddress, viewType) {
  let openInvoices = [];
  try {
    const count = await contract.invoiceCount();
    const invoiceCountNumber = count.toNumber();
    for (let i = 1; i <= invoiceCountNumber; i++) {
      const invoice = await contract.invoices(i);
      if (!invoice.paid && !invoice.cancelled) {
        if (viewType === "client" && invoice.client.toLowerCase() !== userAddress.toLowerCase()) continue;
        openInvoices.push({ invoiceId: i, ...invoice });
      }
    }
  } catch (error) {
    console.error("Error fetching invoices:", error);
  }
  return openInvoices;
}

export async function displayOpenInvoices(contract, userAddress, viewType) {
  const container = document.getElementById("timeline-container");
  container.innerHTML = "";

  const openInvoices = await fetchOpenInvoices(contract, userAddress, viewType);
  if (openInvoices.length === 0) {
    container.innerHTML = `<p style="color: gold; font-size: 1.5rem; text-align: center; text-shadow: 0 0 10px gold;">No open invoices.</p>`;
    return;
  }

  openInvoices.forEach(invoice => {
    const isExpired = Date.now() / 1000 > invoice.expiry;
    const isPaid = invoice.paid;
    const isActive = !isPaid && !isExpired;
  
    const formattedClient = formatAddress(invoice.client);
    const formattedAmount = ethers.utils.formatUnits(invoice.amount, 18);
    const preview = invoice.previewCid
      ? `<a href="https://ipfs.io/ipfs/${invoice.previewCid}" target="_blank">🧪 Preview</a>`
      : "None";
    const solution = invoice.solutionCid
      ? `<a href="https://ipfs.io/ipfs/${invoice.solutionCid}" target="_blank">🧩 Solution</a>`
      : "None";
    const issueLink = `<a href="${invoice.issueUrl}" target="_blank">Github Issue</a>`;
  
    const showPayButton = viewType === "client" && isActive;
  
    const card = document.createElement("div");
    card.className = `invoice-card ${isPaid ? "paid" : isExpired ? "expired" : "active"}`;
    card.innerHTML = `
      <div class="card-title">🧾 Invoice #${invoice.invoiceId}</div>
      <div class="card-details">
        <p><strong>Client:</strong> ${formattedClient}</p>
        <p><strong>Amount:</strong> <img src="./img/SHT.png" class="inline-favicon"> ${formattedAmount}</p>
        <p><strong>Issue:</strong> ${issueLink}</p>
        <p><strong>Expires:</strong> ${new Date(invoice.expiry * 1000).toLocaleString()}</p>
        <p><strong>Preview:</strong> ${preview}</p> 
        <p><strong>Solution:</strong> ${solution}</p>
        ${showPayButton ? `<button class="pay-button" data-invoice-id="${invoice.invoiceId}">💸 Pay</button>` : ""}
      </div>
    `;
    container.appendChild(card);
  });

  setupObserver("timeline-container");
}

export function setupObserver(containerId) {
  const container = document.getElementById(containerId);
  const cards = container.querySelectorAll(".invoice-card");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("focused");
      } else {
        entry.target.classList.remove("focused");
      }
    });
  }, { root: container, threshold: 0.5 });

  cards.forEach(card => observer.observe(card));
}