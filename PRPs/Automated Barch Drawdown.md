🎯 Purpose

The automation mechanism enables the automatic generation of billable transactions, based on predefined contract settings. Its purpose is to track spend accurately and autonomously, by running in the background and simulating the same logic as manual transaction creation — without manual input.

This mechanism supports predictable billing cycles (e.g. weekly support), improving operational efficiency and ensuring timely cost recovery.

🧠 Core Principles

Out-of-Hours Execution: Automation runs during off-peak hours (e.g. 2 AM) to avoid performance impact.

Rigorous Dependency Handling: Transactions are created based on contract metadata with full traceability and validation.

Failure Resilience:

All errors are trapped

No retries occur during the run

Detailed logging captures any issue

Named admins are alerted

State Awareness: The system remembers its last run and ensures the next billing point is never lost.

Manual Compatibility: Manually created transactions co-exist with automated ones — both draw down from the same participant contract.

🏆 Goal

When users create a funding contract, they can toggle on automated transaction creation.

This is ideal for services with predictable billing patterns (e.g. weekly SIL support). Instead of staff entering transactions manually, the system generates them using settings from the contract: rate, service code, frequency, units, participant, etc.

💡 Why It Matters

Reduces Admin Work
Eliminates repetitive data entry for standardised support.

Ensures Claim Coverage
Avoids the risk of missed claims due to human error.

Supports Scale
Vital for high-volume service providers — e.g. SIL, community access, transport.

Speeds Up Revenue
Quicker transaction creation = faster invoicing and claiming.

✅ Success Criteria
✅ Metric	Description
Auto Creation	Transactions are reliably created based on contract rules
Scheduled Execution	Automation runs on a set cadence (e.g. nightly)
No Duplicates	No transaction is created twice for the same window
Logged Failures	All errors are trapped and logged per participant
Admin Alerts	Email notifications sent to assigned admins upon failure
No Partial Handling	If the billing period is partial or funds are insufficient, the run is skipped and logged
Manual + Auto Compatible	Manual transactions and auto transactions share the same balance pool
Draft Mode	All auto-created transactions land in Draft status and require approval

📄 Functionality & Rules

Setting up automation

* within the Settings tab of the system there is a setting called "Automation" When you get to that, it open anoyther screen that shows different automated things - in this case Billing Automation, is the first item we are building!
* when you click in billing item you can swicth on the automation and choose some settings like " Run Time", error handlling ( email for logs errors), fail and retry behavior (on off for now)

Automation Engine Behaviour

Runs nightly

Scans contracts with automation enabled. and looks at the contract set up and a few other rules to decide whether or not to bill.

Rules - Active client, in an active house, active contract, contract has automation enabled, and contract sets the run frequency and run amount ( we may have to start but cliening up contract fileds that feed this behavior)

Skips contracts: where rulles arent met or rundate is Outside start/end dates
With insufficient funds to cover the full transaction
Where billing window is partial, like say that bill run is a friday, bu the contract finished thursday


For valid entries, creates a new transaction in Draft that is the same as the transactions that are created manaually.


Error Handling Rules

* If the job fails for one or more participants:
* All errors are logged (reason + affected contract)
* No retries for that client, move onto the next
* logs fill up and at the end and Email sent to configured admin(s)
* Job continues running for other unaffected participants

This batching engine, must log really well, the log should be human readable and to helpo provide an example may run something like this...

* job started 01/01/2025 at 02:00 AM
* detected 100 clients in the org
* of these 100, 3 were ignored, here are the three ignores and the reason why ignores

xx
xx
xx

The ramining 97 were valie, of these 97 only 8 had scheduled payments for today, each was executed as follows

xx
x
x
x
x
x
x
xx

---- this is verbose human readable logging style that will help if there are problems>


✅ Example User Story

As an admin, I want to turn on automation for my contracts, so that transactions are automatically created for each participant. I want to receive an email if something goes wrong (e.g., no funds or missing config). These transactions should always land in Draft so I can review before approval.


Run frequency & setting next run date!

the system can run daily, weekly or fortnightly only at this stage
when a job runs successfully, it looks at the ferquency and sets the next run data based on the contract frequency


