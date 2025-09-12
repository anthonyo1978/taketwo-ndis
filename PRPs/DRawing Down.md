🎯 Purpose

The “Drawing Down” mechanism enables the recording of billable transactions at the point of service. Its purpose is to track spend precisely as it occurs — ensuring cost recovery from a participant’s agreement or contract.

🧠 Core Principles

Each transaction should be:

Small and atomic: Records a specific point in time, for a specific support item, with a defined cost.

Traceable: Linked directly to a participant, agreement, service code, and timestamp.

Deductive: It reduces the balance of an associated service agreement or contract.

Immutable: Once created, it must serve as a permanent receipt-of-service for audit and financial traceability.

🏆 Goal

Enable organisations to never lose sight of a single billable event, even when managing thousands of transactions across clients. These transactions become breadcrumbs for financial accountability, audit readiness, and compliance with funding obligations (e.g., NDIA).

💡 Why It Matters

In our context, money isn’t earned when services are planned or delivered — it's only claimed when proof of service is recorded in the correct format. That format is a transaction.

The investment to onboard clients and deliver services is significant — but no revenue is realised until a transaction is logged and claimed. Drawing down is the moment of truth for providers to recover costs — retroactively — based on real services delivered.

✅ Success Criteria

A successful implementation must ensure:

Every transaction includes:

A date

A non-zero dollar value

A valid service item code

A participant link

A support agreement/contract reference

Contracts are automatically reduced when transactions are created.

Balances reflect all historical deductions.

Full traceability is maintained from the participant through to the contract, item code, timestamp, and cost.

Supports various shapes and sizes of transactions (single events, recurring, grouped).

📄 Functionality & Rules
Rule	Description
💳 Mandatory Drawdown	Creating a transaction must reduce contract funds.
📉 Balance Updates	Contract balances must reflect deductions in real-time.
📅 Timestamp Required	Each transaction must include a valid date.
💵 Non-zero Value	No transaction may have a $0 cost.
📦 Item Code Required	Must include a valid support item code.
👤 Participant Linking	Must be tied to a specific participant.
📚 References & Documentation

Everything You Need to Know About NDIS Service Agreements – TeamDSC

NDIS – Understanding Your Plan

Plan Budgets and Rules – NDIS

NDIS 101 – Avivo

How NDIS Funding Works – My Plan Manager

NDIS Funding Options – Benevolent Society

How NDIS Funding Works – Endeavour Foundation


Status transation - to be determined later, but there will be a state tyransition for these to gon on in a subsequent feature!