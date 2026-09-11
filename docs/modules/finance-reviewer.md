M & P Shelter Monitoring System

Finance Module Reviewer & Refresher

Purpose: a practical reviewer for understanding, refreshing, and explaining the Finance module in interviews or while maintaining the project.

1. Big Picture

The Finance module is not just CRUD.

It handles:

Donations

Expenses

Expense funding

Split funding

Shelter cash usage

Personal advances

Reimbursements

Reimbursement reversals

Reversal corrections

Immutable audit history

Idempotency

Transactions

Row locking

Derived balances

The core flow is:

request
↓
validation
↓
service business rules
↓
transaction / row locks
↓
repository queries
↓
cash ledger / financial tables
↓
COMMIT or ROLLBACK

The main design rule is:

Repository
→ fetches/calculates database facts

Service
→ decides what is allowed

Controller
→ receives HTTP request and sends HTTP response

Route
→ defines endpoint + middleware

2. What You Should Understand vs Memorize

You do not need to memorize:

Long SQL CTEs

Every INSERT column

Every UUID

Exact repository syntax

Every JOIN

You should understand:

Why a transaction is needed

Why FOR UPDATE is used

Why financial history is not deleted

Why corrections and reversals are separate records

Why balances are calculated in the backend

Why idempotency exists

What USE, RESTORE, and RECONSUME mean

How a request moves through the backend

3. Layer Responsibilities

Route

Defines:

HTTP method

- URL
- authentication
- RBAC
- controller

Example:

POST /api/expenses/.../reimbursements
↓
JWT authentication
↓
ADMIN authorization
↓
controller

Controller

The controller should stay thin.

It usually handles:

req.params
req.body
req.user
headers
↓
service
↓
HTTP response

Service

This is where the important Finance rules live.

Typical Finance service flow:

validate
↓
create request hash
↓
BEGIN
↓
idempotency check
↓
lock important rows
↓
check business rules
↓
write financial records
↓
write cash ledger effects
↓
COMMIT

On failure:

ROLLBACK

Repository

Repository functions handle database access.

Examples:

find allocation
insert reimbursement
calculate effective reimbursed amount
get eligible cash buckets
get correction history

A repository may perform calculations in SQL.

Example:

reimbursement

- reversals

* reversal corrections
  = effective reimbursement

That is still repository responsibility because it is calculating a database-derived fact.

The service then uses that fact:

requested amount > allowed amount?
→ reject with 409

4. Why Finance Uses Transactions

Financial writes often affect multiple tables.

Example reimbursement:

create reimbursement
↓
consume shelter cash

If reimbursement creation succeeds but cash consumption fails, we cannot keep half the operation.

So:

BEGIN

INSERT reimbursement
INSERT cash movement(s)

COMMIT

If anything fails:

ROLLBACK

Result:

either everything happens
or nothing happens

This is atomicity.

5. Why We Use FOR UPDATE

FOR UPDATE locks a row during a transaction.

Example:

PERSONAL_ADVANCE outstanding = ₱500

Two reimbursement requests arrive at the same time:

Request A → ₱400
Request B → ₱400

Without locking, both could read ₱500 and both could continue.

With:

SELECT ...
FOR UPDATE

the flow becomes:

Request A locks allocation
↓
Request B waits
↓
Request A writes + COMMIT
↓
Request B continues
↓
Request B recalculates fresh state

Use normal SELECT for ordinary GET/read endpoints.

Use FOR UPDATE for write transactions where later decisions depend on the current row state.

6. Idempotency

Finance writes use an Idempotency-Key.

Purpose:

client sends request
↓
network timeout happens
↓
client retries same request

Without idempotency:

two financial records may be created

With idempotency:

same key + same payload
→ replay existing result

same key + different payload
→ 409 Conflict

The request payload is converted into a hash.

Typical flow:

createdBy

- idempotencyKey
  ↓
  existing record?

no
→ continue

yes
→ compare request hash
same → replay
different → 409

A 23505 unique violation is also handled for concurrent duplicate requests.

7. Donations

Donation types:

MONETARY
IN_KIND
DIRECT_PAYMENT

MONETARY

Money enters shelter cash.

May be:

GENERAL
or
RESTRICTED

Restricted donations can be tied to category/purpose/specific expense.

IN_KIND

Physical goods such as food, medicine, and supplies.

These do not increase shelter cash.

DIRECT_PAYMENT

The donor/payer pays a provider directly.

Important:

money does NOT enter shelter cash

A DIRECT_PAYMENT donation is paired 1:1 with a DIRECT_PAYMENT expense funding allocation.

The paired records must match on important fields such as:

amount
payer
payment method
payment provider
reference
event timestamp

Generic donation creation does not create standalone DIRECT_PAYMENT donations.

The Expense Funding workflow creates the linked pair atomically.

8. Expenses

Expenses record:

What cost was incurred?

They do not answer:

How was it funded?

That is handled separately by expense funding allocations.

This allows split funding.

Example:

Vet expense = ₱2,000

₱600 shelter funds
₱800 personal advance
₱600 personal contribution

9. Expense Funding

Funding types:

SHELTER_FUNDS
PERSONAL_ADVANCE
PERSONAL_CONTRIBUTION
DIRECT_PAYMENT

An expense can have multiple allocations.

Rule:

active funding total
<=
expense amount

Partial funding is allowed.

SHELTER_FUNDS

Uses actual shelter cash.

Flow:

lock monetary donations
↓
find eligible available cash buckets
↓
create funding allocation
↓
consume donation cash
↓
ALLOCATION_USE ledger rows

If the allocation is voided:

ALLOCATION_RESTORE

If the allocation amount is corrected:

restore old current cash effect
↓
recalculate eligible cash
↓
consume corrected amount

PERSONAL_ADVANCE

A person pays first using personal money.

This creates a payable:

shelter owes advanced_by_user_id

It does not initially decrease shelter cash.

Later:

reimbursement
→ shelter pays the advancer
→ shelter cash decreases

The reimbursement recipient is derived from advanced_by_user_id.

PERSONAL_CONTRIBUTION

A person covers the expense and does not expect repayment.

It creates no shelter cash decrease and no payable.

DIRECT_PAYMENT

The payer pays the provider directly.

It creates:

DIRECT_PAYMENT funding allocation

- linked DIRECT_PAYMENT donation

No shelter cash enters or leaves.

Generic correction is blocked. If wrong:

void pair
↓
create correct pair

10. Funding Allocation Corrections

Current truth lives in:

expense_funding_allocations

Historical truth lives in:

funding_allocation_corrections

A correction stores:

old_state
new_state
correction_reason
corrected_at
created_by

The frontend does not provide old_state.

The service builds it from the locked database row.

The frontend provides the new requested state.

Why snapshots use JSONB

Different funding types have different conditional fields.

A snapshot may include:

fundingType
allocationAmount
fundedAt
paymentMethod
paymentProvider
referenceNumber
advancedByUserId
contributedByUserId
directPaidByUserId
outsidePayerName
directPaymentDonationId
notes

Funding type is immutable during correction

Allowed:

PERSONAL_ADVANCE
→ PERSONAL_ADVANCE

Not allowed:

PERSONAL_ADVANCE
→ SHELTER_FUNDS

If funding type was wrong:

void incorrect allocation
↓
create new correct allocation

11. Finance Cash Source Ledger

Important movement types:

ALLOCATION_USE
ALLOCATION_RESTORE

REIMBURSEMENT_USE
REIMBURSEMENT_RESTORE
REIMBURSEMENT_RECONSUME

The ledger is internal accounting history and should not be hard-deleted.

Allocation example

Original shelter funding:

ALLOCATION_USE ₱600

Correction to ₱400:

ALLOCATION_RESTORE ₱600
ALLOCATION_USE ₱400

Second correction to ₱300:

ALLOCATION_RESTORE ₱400
ALLOCATION_USE ₱300

Current effective use:

₱300

12. Personal Advance Reimbursements

Suppose:

PERSONAL_ADVANCE = ₱800

A reimbursement of ₱300 means:

shelter pays advancer ₱300
↓
REIMBURSEMENT_USE ₱300

Outstanding payable becomes:

₱800 - ₱300 = ₱500

reimbursedAt vs createdAt

reimbursedAt:

when the money was actually paid

createdAt:

when the record was entered into the system

Example:

actual payment = 3:00 AM
record created = 3:30 AM

Then:

reimbursedAt = 3:00 AM
createdAt = 3:30 AM

The frontend should allow reimbursedAt input, but may default it to the current time.

13. Effective Reimbursement Formula

The most important reimbursement formula:

# effective reimbursement

reimbursements

- reversals

* reversal corrections

Example:

Reimbursement ₱300
Reversals -₱250
Reversal corrections +₱40
──────────────────────────────
Effective reimbursement ₱90

If the advance is ₱800:

# Outstanding

# ₱800 - ₱90

₱710

The frontend should not calculate this.

The backend returns a summary such as:

{
"advanceAmount": 800,
"effectiveReimbursedAmount": 90,
"outstandingAmount": 710
}

14. Reimbursement Reversal

A reimbursement is immutable.

If a reimbursement was wrong, do not update/delete it.

Instead:

create reimbursement reversal

Example:

reimbursement = ₱300
reversal = ₱100

Effective reimbursement:

₱200

Cash effect:

REIMBURSEMENT_USE ₱300
REIMBURSEMENT_RESTORE ₱100

15. Why Reversal Records Are Immutable

Financial history should preserve what happened.

Instead of changing the past:

record original event
↓
record reversal
↓
record correction if reversal was wrong

This creates a complete audit trail.

16. Reversal Correction

A reversal itself may also be wrong.

Example:

Reimbursement ₱300
Reversal -₱150
Correction +₱40

Effective reimbursement:

₱190

Cash effect:

REIMBURSEMENT_USE
↓
REIMBURSEMENT_RESTORE
↓
REIMBURSEMENT_RECONSUME

Why reconsume?

Because the reversal previously returned cash.

Correcting that reversal means some of that cash must be treated as spent again.

17. Cash Ledger Parent Relationships

Important mental model:

REIMBURSEMENT_USE
parent = reimbursement_id

REIMBURSEMENT_RESTORE
parent = reversal_id
related_cash_movement_id
→ original REIMBURSEMENT_USE

REIMBURSEMENT_RECONSUME
parent = correction_id
related_cash_movement_id
→ REIMBURSEMENT_RESTORE

Audit chain:

USE
↓
RESTORE
↓
RECONSUME

18. Why related_cash_movement_id Matters

It tells us exactly which previous ledger movement is being reversed or re-applied.

Example:

REIMBURSEMENT_RESTORE
related_cash_movement_id
→ original REIMBURSEMENT_USE

This preserves source relationships.

19. Partial Reversals

A reimbursement can have multiple partial reversals.

Example:

reimbursement = ₱300

first reversal = ₱100
second reversal = ₱150

Remaining reversible:

₱50

Formula:

# remaining reversible

reimbursement

- reversals

* reversal corrections

20. Partial Reversal Corrections

A reversal can have multiple partial corrections.

Example:

reversal = ₱150
correction = ₱40

Remaining correctable:

₱110

Formula:

# remaining correctable

reversal amount

- reversal corrections

21. Important Guards

Expense Funding

Reject if:

new allocation causes overfunding

PERSONAL_ADVANCE Correction

Reject if:

new advance amount
<
effective reimbursed amount

Example:

effective reimbursed = ₱90
new advance = ₱80
→ 409

Advancer identity protection

Once reimbursement history exists:

advancedByUserId cannot change

Why?

Because reimbursement recipient is derived from the original advancer.

PERSONAL_ADVANCE void protection

If reimbursement history has ever existed:

PERSONAL_ADVANCE allocation cannot be voided

Even if reimbursements were later reversed.

Reimbursement guard

Reject if:

reimbursementAmount

> outstanding personal advance

Reimbursement timestamp guard

Reject if:

reimbursedAt
<
fundedAt

Reversal guard

Reject if:

reversalAmount

> remaining reversible amount

Reversal correction guard

Reject if:

correctionAmount

> remaining correctable amount

Also reject if applying the correction would make:

effective reimbursed

> current advance amount

22. Why We Use Integer Cents in Service Logic

JavaScript floating-point numbers can behave badly for money.

So helpers convert:

₱300.25
↓
30025 cents

Then arithmetic is done using integers.

Helpers:

toCents()
fromCents()

Useful for split cash consumption, partial restores, and partial reconsumption.

23. Why for...of Was Used

Financial cash consumption is ordered and uses await.

Example:

for (const bucket of buckets) {
await createMovement(...);
}

This gives deterministic sequential processing.

24. Why Eligible Cash Buckets Are Ordered

Cash consumption follows a deterministic strategy:

GENERAL first
↓
matching RESTRICTED
↓
FIFO within priority

This makes cash usage predictable and auditable.

25. WITH / CTE Refresher

A CTE:

WITH something AS (
SELECT ...
)

is like creating a temporary named result inside one SQL query.

Mental comparison:

const something = ...

Remember:

WITH
→ calculate intermediate database facts

26. UNION ALL Refresher

UNION ALL stacks query results and keeps duplicates.

In a financial ledger, every event matters.

So if we have:

original bucket
restriction change
cash use
cash restore

we want every event included.

27. Read Endpoints / Frontend Shape

Useful reads include:

funding allocations for expense
funding allocation correction history
reimbursements for personal advance
reversals for reimbursement
reversal corrections for reversal
personal advance reimbursement summary

The frontend should mostly:

fetch
↓
store in state
↓
render

It should not duplicate accounting formulas.

28. Frontend Principle

Do not make React interpret raw ledger rows unless building an admin audit screen.

Normal UI should show:

Personal Advance: ₱800
Reimbursed: ₱90
Outstanding: ₱710

History:

Reimbursement ₱300
Reversal ₱100
Reversal ₱150
Reversal correction ₱40

The raw cash ledger is mainly backend/accounting machinery.

29. Why Finance Became Large

Finance must answer questions such as:

Where did this money come from?
Was it restricted?
Was it already spent?
Who paid personally?
How much is still owed?
What if a reimbursement was wrong?
What if the reversal was also wrong?
What if two admins submit at the same time?
What if a request retries after a timeout?

That is why Finance is much larger than ordinary CRUD modules.

30. Debugging Lessons From This Module

Wrong helper used

A reversal initially called the allocation cash helper instead of the reimbursement cash helper.

Result:

no restorable reimbursement cash found

Lesson:

similar helper names
≠
same financial relationship

Database constraint caught a bad parent relationship

A REIMBURSEMENT_RESTORE initially attempted to store both:

reimbursement_id

- reversal_id

The database rejected it with a CHECK constraint.

Correct design:

REIMBURSEMENT_RESTORE
parent = reversal_id
related movement = REIMBURSEMENT_USE

Lesson:

constraints are not just restrictions
→ they protect the financial model

Transaction saved us during bugs

Several failed tests inserted temporary records before a later step failed.

Because they were inside:

BEGIN
...
ROLLBACK

the database did not keep partial financial history.

31. HTTP Status Mental Model

400
→ invalid request/input

401
→ authentication missing/invalid

403
→ authenticated but not authorized

404
→ requested record does not exist

409
→ request conflicts with current business state

Finance uses 409 heavily for:

overfunding
over-reimbursement
invalid correction
already voided
idempotency conflict
history prevents change

32. Interview Questions & Short Answers

Why did you separate controller, service, and repository?

I separated them by responsibility. Controllers handle HTTP requests and responses, services enforce validation and business rules, and repositories handle SQL/database access. This makes the code easier to maintain, test, and change.

Why use transactions?

Finance operations often affect multiple records. A transaction ensures either all related writes succeed or all are rolled back, preventing partial financial state.

Why use FOR UPDATE?

It locks a row during a transaction so concurrent financial requests cannot calculate balances from the same stale state and both succeed incorrectly.

Why use idempotency?

Financial requests may be retried because of network issues. Idempotency prevents the same request from creating duplicate transactions. Same key and same payload replays the result; same key and different payload returns a conflict.

Why not delete incorrect financial records?

Deleting would destroy audit history. Instead, the system uses voids, reversals, and corrections so the original event and every later change remain traceable.

Why does a reimbursement reduce shelter cash?

A personal advance means someone paid first using personal funds. When the shelter reimburses them, shelter money is actually paid out, so the reimbursement consumes shelter cash.

Why does a reimbursement reversal restore cash?

A reversal means part of the recorded reimbursement should no longer count as having been paid, so its cash effect is restored.

Why does a reversal correction reconsume cash?

A reversal correction says part of the reversal was wrong. That means some of the reimbursement should count again, so that amount is consumed again from shelter cash.

Why calculate balances in the backend?

The backend owns business rules and financial truth. The frontend should display the derived balances rather than duplicating accounting logic that could become inconsistent or insecure.

Why is advancedByUserId locked after reimbursement history exists?

The reimbursement recipient is derived from the user who originally advanced the money. Changing that user after reimbursement history exists would rewrite the meaning of historical financial records.

33. 5-Minute Refresher

If you only have a few minutes, remember this:

Expense
→ what was spent

Funding allocation
→ how expense was funded

SHELTER_FUNDS
→ uses shelter cash

PERSONAL_ADVANCE
→ shelter owes someone

PERSONAL_CONTRIBUTION
→ person pays, no repayment

DIRECT_PAYMENT
→ payer pays provider directly

Then:

PERSONAL_ADVANCE
↓
reimbursement
→ REIMBURSEMENT_USE

reversal
→ REIMBURSEMENT_RESTORE

reversal correction
→ REIMBURSEMENT_RECONSUME

And:

# effective reimbursement

reimbursements

- reversals

* reversal corrections

Finally:

transaction
→ all or nothing

FOR UPDATE
→ concurrency safety

idempotency
→ retry safety

immutable history
→ audit safety

34. 15-Minute Study Order

Study in this order:

Layer responsibilities

Expense vs funding

Four funding types

PERSONAL_ADVANCE lifecycle

Cash movement types

Effective reimbursement formula

Transactions

FOR UPDATE

Idempotency

Corrections/reversals

Important guards

Interview answers

35. One-Sentence Summary

The Finance module separates expenses from funding, preserves immutable financial history, derives balances from transactional records, protects concurrent writes with row locks, prevents duplicate writes with idempotency, and tracks every shelter-cash effect through an auditable ledger.
