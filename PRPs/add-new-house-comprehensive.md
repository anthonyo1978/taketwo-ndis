name: "Feature PRP - TXN Batch job
## Purpose
one of the major benefits of the system is that it can automatically tick away creating the transactions required to evidence service delivery. So as a feature of how the SA is set up, the user can choose to have transaction automagically create and just fill up!

## Core Principles
1. Automation of transaction creation NEVER fails and if it does it send a message of failure somewhere, failures are always trapped never silent!
2. For every batch, all transaction create and updates associated contracts and then later by proxy poertfolio position for the company
3. Never overcharge - each batch sets the next run data when it completes, and this next run set data is automatically tested by the system itslef for accuracy


---

## Goal
Simple hands free billing!

## Why
- Automate the creation will save human time!

---

## What

### Entry Points & Navigation
- Contract - as the contract level, whether or not the automation is set is defined here
- Pathways - there are two path ways to create tTXM manually ( on the transactiosn screen) or automated via thi sbatch ( as set in the contract)
- Timing - the batch runs nightly at a time set by the user in the settings tab
- Audit trail - each batch run is well logged in the system by the system, this might make error unpicking easier if errors do occur
- Batch logs can be written into notofocations tab ( later we will define this space)


