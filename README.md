# DecentInvoice
Decent Data on Work Completed for Decent Purposes

## Additive V1 project default (local, unaudited)

`contracts/default/DecentInvoiceV1.sol` now supplies local source for a **new
V1 invoice model**, with a usable [`default/index.html`](default/index.html).
Legacy ABI/browser files and addresses remain unchanged; this is not a
source-verification claim for the old deployment. No consumer, ArtFi, router or
deployed-contract migration is included.

### Terms and lifecycle

- Any issuer calls `issue(payer, asset, amount, due, context)` and is the immutable
  payee. Payer must be a different nonzero address, not the invoice contract.
  The amount must be positive and due must be a future Unix timestamp. Context
  is a public reference of at most 512 UTF-8 bytes, not private invoice data.
- The named payer alone calls `pay(id)` for the **entire** amount while
  `block.timestamp < due`. Native asset is zero address with exact `msg.value`;
  ERC20 requires exact allowance and zero native value. Amounts are raw integer
  units. Collection and payment to the issuer happen atomically, without
  long-lived custody or platform fees.
- Only the issuer/payee can `cancel(id)` while unpaid, including after expiry.
  Paid/canceled are terminal. Expired is **derived from time**, not a fourth
  stored enum value: stored `Open` after due is not payable. The UI shows this.
- Unknown IDs, wrong actors, duplicate/expired/canceled payments, wrong values,
  inadequate allowance and failed transfers revert without marking paid.
  Issuance does not lock payer funds or prove payer consent.
- `Issued`, `Paid`, `Canceled` and `invoices(id)` expose terms and lifecycle.
  **An invoice is a request, not a loan obligation, proof of completed work,
  legal debt enforcement, or a mechanism to unlock confidential CIDs.**

### Local usage

Requires Node 20+ and npm, from this repository/worktree:

```sh
npm ci
npm test
npm run preview
# http://127.0.0.1:4312/default/  (PORT overrides 4312)
```

The loopback preview creates an ephemeral **synthetic** chain only. Actor 1
connects and issues to actor 2; switch to actor 2, load the ID, then pay. The
issuer can instead cancel an unpaid invoice. To exercise ERC20, paste the
displayed mock asset address; each actor has 1,000,000 mock raw units. There
are no real funds or wallet requirements. Restart resets chain state; source
and tests are persistent. Never fund deterministic test accounts or expose
the development RPC.

The interface explicitly shows chain, contract, actor, immutable terms and
current lifecycle, gates controls by role and waits for confirmed receipts.
It validates integer base units, not decimal/fiat conversions. ERC20 approval
is exact per payment (zero-reset when needed); an approval already mined may
remain if payment subsequently fails. Wallet rejection/errors never imply paid.

`npm run build` creates ignored `build/DecentInvoiceV1.json`,
`default/abi.json` and `default/vendor/ethers.js`. For a **separately reviewed**
deployment, serve built `default/` and set `default/config.json` to
`mode: "wallet"`, verified `chainId`, and verified V1 `address`. Empty configuration
disables writes; the preview always uses its own synthetic chain. Wallet mode
checks chain and code presence and invalidates connection on wallet changes;
code presence does not verify ABI or bytecode. No deployment script is supplied.

### Reuse decision and receiving tests

Need: explicit payable/cancelable invoice source and a usable issuer/payer flow.
Canopy's three payment-project leads, actual source/worktrees, remote branches
and open issues/PRs were inspected. Base:
`5da0f1fd2db46eda7891585d93d72ac3419422d0` (latest inspected `origin/main`).
Donor `js/app.js` create-invoice submit handler and `.pay-button` payment
handler at `2e73d8b1f0f759c52a1fe2d68b1613325733acda` (unchanged at base) supply
the issue/payer/asset/amount/expiry and exact approval workflow. **Build-new
contract** was necessary: the inspected public donor had only ABI/JS, no
Solidity implementation. Adapted exact approval and receipt waiting, not the
legacy owner-only issuance or CID confidentiality assumptions. V1 ABI is
intentionally incompatible. `PaymentAsset` is adapted from the explicitly
uncommitted sibling default
`DecentEscrow/contracts/default/PaymentAsset.sol`
(`_collect`, `_send`, `nonReentrant`), not a released dependency. Existing
Apache-2.0/NOTICE attribution is retained; no additional library was extracted.

Validated: `npm test` **11/11 passing**, Solidity 0.8.30, optimizer 200,
Shanghai EVM, Ganache 7.9.2 and ethers 6.15.0. Tests cover native/ERC20,
explicit roles, cancellation, exact expiry, one-time payment, invalid values,
missing allowances, false/no-return tokens, transfer fees including payer
surcharges, failed native payees, reentry attempts and atomic rollback.
`scripts/browser-smoke.mjs` passed native and ERC20 issue→switch actor→pay,
invalid input, receipt display and 375px layout with no uncaught browser errors.
Optional browser validation reuses existing local Playwright tooling:

```sh
mkdir -p .cache
TMPDIR="$PWD/.cache" PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node scripts/browser-smoke.mjs
```

On Node 24/macOS Ganache warns about its optional native uWS binary and uses its
working JavaScript fallback.

### Receipt/router boundary, unsupported cases and deployment gates

The interface presents chain ID, V1 address, transaction hash, block and decoded
events. A future receipt consumer must verify the configured chain/contract,
receipt status, event log index, original immutable terms and finality. No
invoice is converted to a loan, escrow, router action, credential or delivery
attestation. Office/Academy can link the local `/default/` preview for synthetic
exercises; no public hosting or Academy integration is claimed.

Unsupported: partial payments, discounts/taxes, payer delegation/signatures,
third-party payment, paid-invoice refunds, automatic collections, private data
storage, NFT/rebasing/reflection/fee assets, cross-chain routing, upgrades and
admin rescue. Exact balance checks reject common transfer-fee tokens, not
arbitrary malicious-token behavior. Mistaken/forced deposits have no recovery
function. Gate real use on independent audit/review, approved asset policy,
legal/accounting terms, chain-specific tests, source/bytecode verification,
wallet configuration and separate receipt integration tests. Context-specific
invoicing remains a new version/adapter, not an alteration of legacy contracts.

## Local DecentHeader integration

Entries: `index.html` and `default/index.html`. The native themed header provides
one click-only wallet session, explicit Pinata/Kubo verification and project
About; no DBusk widget. Default wallet mode shares the header BrowserProvider
without another account request, verifies the configured chain and bytecode,
and invalidates actions on account/chain/disconnect. Synthetic preview actors
remain separate from actual wallet identity. **Legacy invoice operations are
unavailable:** its fixed address has no independently configured deployment
chain here. Use the V1 workspace with reviewed configuration or local preview;
the header never guesses a chain for that old contract.
That unavailable state is visible below the header, with a link to the existing
default workspace; it is not buried inside the replaced hidden toolbar.

Reuse/adapt: DecentHead `00691c4fe93fd280f5aec780bdc4fac651bfcdb1`,
`js/main.js:DecentHead`, `js/wallet.js:WalletSession`, `Header.js`,
`Header/{WalletConnect,IPFSControls,IPFSStatus,AboutModal}.js`, and the
`docs/ADOPTING.md` manifest. LICENSE/NOTICE/artwork/ethers attribution is preserved
under `vendor/decent-head/2.0.0`; `provenance.json` records exact files.
Incompatibilities: legacy ethers v5 needs a module-local v6 UMD wrapper; nullable
chain observation needs wallet/display guards; horizontal orbit paint needs
clipping at 375px. No shared framework or speculative contract migration.

The explicit read-only probe is **uncommitted** shared
`_wt/header-provider-connect` source based on that commit:
`IPFSSession.verifyConnection()` and `IPFSControls`' verify-provider handler.
IPFSStatus is ready only after a verified authentication/version response.
Selection, credentials or connectivity never imply an invoice backup, retention
or payment. Credentials remain header-session only; all invoice backup,
replication and reward capabilities and unsafe generic controls are unavailable.
Canopy agency-map leads and current receiving worktrees/issues/PRs were inspected
read-only; saved invoice work was integrated, not reset.

Validation: `npm test`, `node scripts/browser-smoke.mjs` and
`node scripts/header-browser-smoke.mjs` with an existing `PLAYWRIGHT_MODULE`.
The browser tests cover both entries at 375px, wallet rejection/lifecycle,
shared-session/no-code/wrong-chain gates, explicit unconfigured/401/network/
Pinata-ready/Kubo-ready probes without uploads, and About Escape/focus.
Synthetic native/ERC20 invoice lifecycle regression is retained. Helpers stop
after verification; no deployment, funds, announcements or router changes.

Daily recovery verification (2026-11-08): preserved the authorized uncommitted
V1/header work; `npm test` passed **24 tests**, and both self-starting browser
harnesses passed (legacy + default headers and synthetic native/ERC20 lifecycle).
The header harness now asserts inert mount, no upload/pin/sign/switch requests,
disabled unavailable storage actions, customized About keyboard open/Tab/Escape
and 375px bounds. Browser launch failure also closes its loopback server.
Use `PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs`
for existing local browser tooling; no dependency was added.
The stricter browser test first exposed hidden legacy failure text, now fixed.
Ganache reports an unavailable native µWS binary on this Node/macOS combination
and successfully uses its existing JavaScript fallback. Pinata and Kubo ready
states use synthetic endpoint responses, not live credentials/nodes; legacy
ethers resources are mocked/blocked, not deployment verification. The fixed
legacy invoice address remains gated until its deployment chain is verified.
Provenance tests verify exact donor UMD bytes under the module-local wrapper and
the shared uncommitted `js/ipfs.js`/`IPFSControls.js` hashes (the latter differs
only by receiver pin-action disabling). The bounded reuse search covered Canopy
Head/Escrow/Invoice leads, receiving worktrees and the shared provider worktree;
current Head/Escrow/Invoice PR lists were empty. Their open language-adapter/
Supporter-workflow issues are separate from this acceptance test.

## License

Code: [Apache-2.0](LICENSE) · Art and docs: [CC BY 4.0](LICENSES/CC-BY-4.0.txt) · Please keep the [NOTICE](NOTICE) and give The Jolly LaMa / A Decent Agency a head nod when you reuse this work.
Support the work with a [Supporter DNFT](https://thejollylama.github.io/DecentMarket/).
