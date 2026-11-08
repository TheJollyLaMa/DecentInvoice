import { before, after, beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { ZeroAddress } from 'ethers';
import { setup, mined } from './helpers.mjs';

let f, snapshot;
before(async () => { f = await setup('DecentInvoiceV1'); });
after(async () => f?.close());
beforeEach(async () => { snapshot = await f.provider.send('evm_snapshot', []); });
afterEach(async () => { await f.provider.send('evm_revert', [snapshot]); });
const issue = async (asset = ZeroAddress, amount = 100n) =>
  mined(f.contract.issue(f.addresses[1], asset, amount, (await f.now()) + 100, 'invoice:public-hash'));
const pay = () => mined(f.contract.connect(f.signers[1]).pay(1, { value: 100n }));

test('native invoice records terms and only pays once', async () => {
  const receipt = await issue();
  assert.equal(f.contract.interface.parseLog(receipt.logs[0]).name, 'Issued');
  const invoice = await f.contract.invoices(1);
  assert.equal(invoice.payee, f.addresses[0]);
  assert.equal(invoice.payer, f.addresses[1]);
  await pay();
  assert.equal((await f.contract.invoices(1)).state, 1n);
  await assert.rejects(pay);
  assert.equal(await f.provider.send('eth_getBalance', [f.contract.target, 'latest']), '0x0');
});

test('only explicit payer can pay; only issuer/payee can cancel', async () => {
  await issue();
  await assert.rejects(() => f.contract.pay(1, { value: 100 }));
  await assert.rejects(() => f.contract.connect(f.signers[1]).cancel(1));
  await mined(f.contract.cancel(1));
  await assert.rejects(pay);
  await assert.rejects(() => f.contract.cancel(1));
});

test('expiry is derived, payment stops at due timestamp; issuer may close expired invoice', async () => {
  await issue();
  await f.advance(100);
  await assert.rejects(pay);
  assert.equal((await f.contract.invoices(1)).state, 0n);
  await mined(f.contract.cancel(1));
});

test('ERC20 exact payment directly credits issuer', async () => {
  await issue(f.token.target);
  await mined(f.contract.connect(f.signers[1]).pay(1));
  assert.equal(await f.token.balanceOf(f.addresses[0]), 1000100n);
  assert.equal(await f.token.balanceOf(f.addresses[1]), 999900n);
  assert.equal(await f.token.balanceOf(f.contract.target), 0n);
});

test('invalid payer, asset, amount, due, unknown id, and wrong native value reject', async () => {
  await assert.rejects(() => f.contract.issue(ZeroAddress, ZeroAddress, 100, 9999999999, ''));
  await assert.rejects(() => f.contract.issue(f.addresses[0], ZeroAddress, 100, 9999999999, ''));
  await assert.rejects(() => issue(f.addresses[2]));
  await assert.rejects(() => issue(ZeroAddress, 0n));
  await assert.rejects(() => f.contract.issue(f.addresses[1], ZeroAddress, 100, 1, ''));
  await assert.rejects(() => f.contract.connect(f.signers[1]).pay(999));
  await issue();
  await assert.rejects(() => f.contract.connect(f.signers[1]).pay(1, { value: 99 }));
});

test('token failure, missing allowance, fee input and unexpected native value do not mark paid', async () => {
  await issue(f.token.target);
  const payer = f.contract.connect(f.signers[1]);
  await mined(f.token.connect(f.signers[1]).approve(f.contract.target, 0));
  await assert.rejects(() => payer.pay(1));
  await mined(f.token.connect(f.signers[1]).approve(f.contract.target, 1000));
  await mined(f.token.configure(true, false));
  await assert.rejects(() => payer.pay(1));
  await mined(f.token.configure(false, true));
  await assert.rejects(() => payer.pay(1));
  await assert.rejects(() => payer.pay(1, { value: 1 }));
  assert.equal((await f.contract.invoices(1)).state, 0n);
  assert.equal(await f.token.balanceOf(f.addresses[1]), 1000000n);
});

test('non-returning token exact transfers work', async () => {
  const token = await f.deploy('NoReturnToken');
  await mined(token.mint(f.addresses[1], 100));
  await mined(token.connect(f.signers[1]).approve(f.contract.target, 100));
  await issue(token.target);
  await mined(f.contract.connect(f.signers[1]).pay(1));
  assert.equal(await token.balanceOf(f.addresses[0]), 100n);
});

test('sender-side token fee rolls payment back without overcharging', async () => {
  await issue(f.token.target);
  await mined(f.token.configureSenderFee(true));
  await assert.rejects(() => f.contract.connect(f.signers[1]).pay(1));
  assert.equal((await f.contract.invoices(1)).state, 0n);
  assert.equal(await f.token.balanceOf(f.addresses[1]), 1000000n);
});

test('rejecting payee restores unpaid state; receiver reentry cannot pay twice', async () => {
  const receiver = await f.deploy('Receiver');
  await mined(receiver.execute(f.contract.target, f.contract.interface.encodeFunctionData('issue', [
    f.addresses[1], ZeroAddress, 100, (await f.now()) + 100, 'public'
  ])));
  await mined(receiver.configure(true, ZeroAddress, '0x'));
  await assert.rejects(pay);
  assert.equal((await f.contract.invoices(1)).state, 0n);
  await mined(receiver.configure(false, f.contract.target, f.contract.interface.encodeFunctionData('pay', [1])));
  await pay();
  assert.equal(await receiver.callbackSucceeded(), false);
  assert.equal((await f.contract.invoices(1)).state, 1n);
});
