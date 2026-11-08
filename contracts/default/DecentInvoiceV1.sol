// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "./PaymentAsset.sol";

/// @notice Payment requests only; an invoice does not create an enforceable debt.
contract DecentInvoiceV1 is PaymentAsset {
    enum State { Open, Paid, Canceled }
    struct Invoice {
        address payee;
        address payer;
        address asset;
        uint256 amount;
        uint256 due;
        State state;
        string context;
    }
    uint256 public invoiceCount;
    mapping(uint256 => Invoice) public invoices;

    event Issued(uint256 indexed id, address indexed payee, address indexed payer, address asset, uint256 amount, uint256 due, string context);
    event Paid(uint256 indexed id, address indexed payer);
    event Canceled(uint256 indexed id);

    function issue(address payer, address asset, uint256 amount, uint256 due, string calldata context) external returns (uint256 id) {
        require(payer != address(0) && payer != address(this) && payer != msg.sender, "Invalid payer");
        require(amount > 0 && due > block.timestamp, "Invalid terms");
        require(bytes(context).length <= 512, "Reference too long");
        _asset(asset);
        id = ++invoiceCount;
        invoices[id] = Invoice(msg.sender, payer, asset, amount, due, State.Open, context);
        emit Issued(id, msg.sender, payer, asset, amount, due, context);
    }

    function pay(uint256 id) external payable nonReentrant {
        Invoice storage invoice = invoices[id];
        require(invoice.amount > 0 && invoice.state == State.Open, "Not open");
        require(msg.sender == invoice.payer, "Only payer");
        require(block.timestamp < invoice.due, "Invoice expired");
        invoice.state = State.Paid;
        _collect(invoice.asset, invoice.amount);
        _send(invoice.asset, invoice.payee, invoice.amount);
        emit Paid(id, msg.sender);
    }

    function cancel(uint256 id) external {
        Invoice storage invoice = invoices[id];
        require(msg.sender == invoice.payee, "Only payee");
        require(invoice.state == State.Open, "Not open");
        invoice.state = State.Canceled;
        emit Canceled(id);
    }
}
