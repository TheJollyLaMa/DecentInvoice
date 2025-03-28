// js/app.js
import { formatAddress } from "./wallet.js";
import { loadABI, initContract, contractAddress } from "./contract.js";
import { displayOpenInvoices } from "./timeline.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

let provider;
let invoiceContract;
let userAddress;
let isOwner = false;

/**
 * Connects the user's wallet, initializes the contract, and sets up the UI.
 */
async function connectWallet() {
  const walletButton = document.getElementById("connect-wallet");
    console.log("Wallet Button: ", walletButton);
  if (!window.ethereum) {
    alert("MetaMask is not installed!");
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];

    const providerInstance = new ethers.providers.Web3Provider(window.ethereum);
    provider = providerInstance;
    const network = await provider.getNetwork();
    console.log("Connected to network:", network);

    await displayContractAddress();

    walletButton.classList.add("connected");
    walletButton.classList.remove("disconnected");

    const formattedWallet = formatAddress(userAddress);
    document.getElementById("account").innerHTML = formattedWallet;

    console.log("Wallet Connected:", userAddress);

    invoiceContract = await initContract(provider.getSigner());

    const ownerAddress = await invoiceContract.owner();
    isOwner = (userAddress.toLowerCase() === ownerAddress.toLowerCase());

    const ownerFormsContainer = document.getElementById("invoice-form-section");
    if (isOwner) {
        displayOpenInvoices(invoiceContract, userAddress, "all");
        const ownerFormsContainer = document.getElementById("invoice-form-section");
        ownerFormsContainer.classList.remove("hidden");
      
        // ----------------- Owner Form: Create Invoice ----------------- //
        // 🧾 Add form event listener after showing the form
        document.getElementById("createInvoiceForm").addEventListener("submit", async (e) => {
          e.preventDefault();
      
          const client = document.getElementById("client").value;
          const token = document.getElementById("token").value;
          const amount = document.getElementById("amount").value;
          const expiry = document.getElementById("expiry").value;
          console.log("expiry: ", expiry);
          const issueUrl = document.getElementById("issueUrl").value;
          const previewCid = document.getElementById("previewCid").value;
          const solutionCid = document.getElementById("solutionCid").value;
      
          try {
      
            const tx = await invoiceContract.createInvoice(
              client, token, amount, expiry, issueUrl, previewCid, solutionCid
            );
      
            document.getElementById("createResult").innerText = "Submitting invoice...";
            const receipt = await tx.wait();
            document.getElementById("createResult").innerText = `Invoice created in tx: ${receipt.transactionHash}`;
            await displayOpenInvoices(invoiceContract, userAddress, "all");

          } catch (err) {
            console.error(err);
            document.getElementById("createResult").innerText = "Error: " + err.message;
          }
        });
      } else {
        displayOpenInvoices(invoiceContract, userAddress, "client");
      }


      document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("pay-button")) {
          const invoiceId = e.target.getAttribute("data-invoice-id");
          console.log(`Paying invoice #${invoiceId}...`);

          try {            
            // approve token transfer
            const invoice = await invoiceContract.invoices(invoiceId); // ✅ FIXED: get invoice
            const tokenAddress = invoice.token;
            const amount = invoice.amount;
      
            const tokenContract = new ethers.Contract(
              tokenAddress,
              ["function approve(address spender, uint256 amount) returns (bool)"],
              provider.getSigner()
            );
      
            const approvalTx = await tokenContract.approve(contractAddress, amount);
            await approvalTx.wait();

            const tx = await invoiceContract.payInvoice(invoiceId);
            e.target.innerText = "⏳ Confirming...";
            await tx.wait();
            e.target.innerText = "✅ Paid!";
            e.target.disabled = true;
      
            // Refresh to update paid state
            await displayOpenInvoices(invoiceContract, userAddress, "client");
          } catch (err) {
            console.error("Payment failed:", err);
            e.target.innerText = "❌ Failed";
          }
        }
      });

  } catch (error) {
    console.error("Error connecting wallet:", error);
    walletButton.classList.remove("connected");
    walletButton.classList.add("disconnected");
  }
}

document.getElementById("connect-wallet").addEventListener("click", connectWallet);

/**
 * Displays the contract address in the footer.
 */
async function displayContractAddress() {
  const contractAddressDisplay = document.getElementById("contract-address-display");
  const network = await provider.getNetwork();
  const chainId = network.chainId;

  const BLOCK_EXPLORERS = {
    1: "https://etherscan.io/",
    10: "https://optimistic.etherscan.io/",
    137: "https://polygonscan.com/",
    42161: "https://arbiscan.io/",
    24734: "https://www.mintme.com/explorer/"
  };
  const CONTRACT_ADDRESSES = {
    137: contractAddress,
    1: "?",
    10: "?",
    42161: "?",
    24734: "?"
  };

  const explorerBase = BLOCK_EXPLORERS[chainId] || "#";
  const addr = CONTRACT_ADDRESSES[chainId] || contractAddress;
  const shortStart = addr.slice(0, 6);
  const shortEnd = addr.slice(-4);
  const chainIcons = {
    1: "./img/Ethereum.png",
    10: "./img/Optimism.png",
    137: "./img/Polygon.png",
    24734: "./img/MintMe.png"
  };
  const chainIcon = chainIcons[chainId] || "./img/Eth.gif";

  contractAddressDisplay.innerHTML = `
    <div id="contract-address-display">
      <a href="${explorerBase + "address/" + addr}" target="_blank" class="contract-link">
        <span id="contract-address-start">${shortStart}</span>
        <span class="icons">
          <img src="./img/Eth.gif" alt="Chain Icon" class="icon">
          <img src="${chainIcon}" alt="Chain Icon" class="icon">
          <img src="./img/SecretPyramid.png" alt="Pyramid Icon" class="icon">
          <img src="${chainIcon}" alt="Chain Icon" class="icon">
          <img src="./img/Eth.gif" alt="Chain Icon" class="icon">
        </span>
        <span id="contract-address-end">${shortEnd}</span>
      </a>
    </div>
  `;
}
