// js/contract.js
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

export const contractAddress = "0xAD9dC418CcA5A9ebC9185f62Dea520b9d615A068"; //3rd "0xD8D71371bB4968e979d31084EBa069716C43eEa4"; //2nd: "0x9Fdc2285D282d70027Ab086b4Da7D0e8F3fECcC9";// first try:"0x9Fceb22477Be43445139dC856b1d99C29499825d";
let contractABI = null;

export async function loadABI() {
  try {
    const response = await fetch('./abis/DecentInvoice_ABI.json');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    contractABI = await response.json();
    console.log("Invoice ABI loaded:", contractABI);
    return contractABI;
  } catch (error) {
    console.error("Failed to load ABI:", error);
    throw error;
  }
}

export async function initContract(signer) {
  if (!contractABI) await loadABI();
  return new ethers.Contract(contractAddress, contractABI, signer);
}