# M & P Shelter Monitoring System

## Frontend Documentation

**Project:** M & P Shelter Monitoring System  
**Current frontend scope:** Staff Portal  
**Frontend:** React  
**Backend:** Node.js + Express  
**Database:** PostgreSQL  
**Authentication:** JWT / cookie-based authentication with RBAC

---

# 1. Purpose

The frontend provides the staff-facing interface for the M & P Shelter Monitoring System.

The current frontend focuses on the core shelter workflows needed before the Care module:

- Authentication
- Animal management
- Cage management
- Cage assignment workflows
- Shared user feedback

The public adoption portal is intentionally planned for a later phase.

The frontend follows the backend architecture and business rules rather than trying to replace them.

```text
React Component
    ↓
Feature API file
    ↓
Axios apiClient
    ↓
Express Route
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
PostgreSQL
```

The frontend performs validation mainly for user experience. The backend remains the final source of truth for validation, permissions, ownership, and business rules.

---

# 2. Frontend Feature Structure

The project is organized by feature so each major module keeps its pages, components, and API functions together.

Current feature structure is roughly:

```text
client/
└── src/
    ├── components/
    │   └── feedback/
    │       ├── ToastContext.jsx
    │       └── Toast.css
    │
    ├── features/
    │   ├── animals/
    │   │   ├── api/
    │   │   │   └── animalApi.js
    │   │   ├── components/
    │   │   │   ├── AnimalDetailsDrawer.jsx
    │   │   │   ├── AnimalDetailsDrawer.css
    │   │   │   ├── CreateAnimalModal.jsx
    │   │   │   ├── CreateAnimalModal.css
    │   │   │   ├── EditAnimalModal.jsx
    │   │   │   └── EditAnimalModal.css
    │   │   └── pages/
    │   │       ├── AnimalsPage.jsx
    │   │       └── AnimalsPage.css
    │   │
    │   └── cages/
    │       ├── api/
    │       │   ├── cageApi.js
    │       │   └── cageAssignmentApi.js
    │       ├── components/
    │       │   ├── CageDetailsDrawer.jsx
    │       │   ├── CageDetailsDrawer.css
    │       │   ├── CreateCageModal.jsx
    │       │   ├── EditCageModal.jsx
    │       │   ├── AssignAnimalModal.jsx
    │       │   ├── MoveAnimalModal.jsx
    │       │   └── RemoveAnimalModal.jsx
    │       └── pages/
    │           └── CagesPage.jsx
    │
    ├── api/
    │   └── apiClient.js
    │
    ├── auth/
    │   └── AuthContext / ProtectedRoute related files
    │
    └── main.jsx
```

Exact filenames may evolve, but the feature-based organization should remain consistent.

---

# 3. Shared UI Patterns

The frontend uses consistent UI patterns across modules.

## 3.1 Details

Viewing record details uses a **right-side drawer**.

Examples:

- Animal details
- Cage details

The drawer is intended for reading information without fully leaving the current page.

## 3.2 Create and Edit

Create and edit workflows use **centered modals**.

Examples:

- Create Animal
- Edit Animal
- Create Cage
- Edit Cage
- Assign Animal
- Move Animal

## 3.3 Destructive or Important Confirmation

Important actions use a **confirmation modal**.

Example:

- Remove Animal from Cage

Animal archive currently uses `window.confirm()` and can later be replaced with the shared styled confirmation pattern.

## 3.4 Modal Interaction Rules

Current modal behavior:

```text
Click backdrop
→ close modal

Click inside modal
→ event.stopPropagation()
→ modal stays open

Click X
→ close modal

Successful normal save
→ close modal
```

For workflows that return a successful warning, the modal can intentionally stay open until the user sees the warning.

## 3.5 Dark Theme

Because the application uses a global dark theme, drawers and modals may require explicit text colors when a light background is used.

This avoids cases where inherited dark-theme text becomes unreadable on white panels.

---

# 4. Shared Feedback System

The project has a reusable toast system.

```text
client/src/components/feedback/
├── ToastContext.jsx
└── Toast.css
```

`ToastProvider` is wrapped around the app so feature components can use:

```js
const { showToast } = useToast();
```

Supported types:

```js
showToast("...", "success");
showToast("...", "error");
showToast("...", "warning");
```

## 4.1 Feedback Rules

The frontend follows these rules:

| Situation                               | Feedback Pattern                      |
| --------------------------------------- | ------------------------------------- |
| Normal successful action                | Success toast                         |
| Successful GET/read                     | No toast                              |
| GET/read failure                        | Inline error where data should appear |
| Form validation/API error               | Inline error inside form/modal        |
| Successful action with business warning | Keep warning visible inside modal     |
| Destructive action                      | Confirmation modal                    |
| Non-form action failure                 | Error toast                           |

Examples:

```text
Create Animal succeeds
→ success toast

Edit Animal fails validation
→ inline error in Edit Animal modal

GET Animal Details fails
→ inline error inside details area

Remove Animal succeeds
→ success toast
```

---

# 5. Authentication Frontend

The frontend uses a shared Axios client with credentials enabled.

Conceptually:

```js
axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
```

The current local development base URL points to the localhost backend API.

This will be replaced with an environment-based production API URL during deployment.

## 5.1 Global 401 Handling

The frontend already has a global 401 interceptor.

Flow:

```text
API request
↓
Backend returns 401
↓
Axios interceptor
↓
Unauthorized handler runs
↓
AuthContext clears user
↓
ProtectedRoute sees no authenticated user
↓
Redirect to /staff/login
```

This means expired or invalid sessions are already handled functionally at the application level.

## 5.2 Login Feedback

Login follows these rules:

```text
Wrong credentials / API error
→ inline login error

Successful login
→ redirect to dashboard
→ no success toast needed
```

The redirect itself is enough feedback for a successful login.

---

# 6. Animal Management Frontend

The Animals module is functionally complete for the current phase.

## 6.1 Animals Page

The list supports:

- Search
- Debounce of roughly 400 ms
- Filters
- Sorting
- Pagination
- Reset filters

Current filtering includes fields such as:

- Status
- Species
- Sex
- Life stage
- Health status
- Adoption status

The frontend sends the selected list/query parameters to the backend rather than loading everything and performing all filtering locally.

## 6.2 Search Debounce

The animal search input uses a short debounce so typing does not immediately send a request for every keystroke.

Conceptually:

```text
User types
↓
search state changes
↓
wait ~400 ms
↓
request uses latest search value
```

This reduces unnecessary API calls while keeping search responsive.

---

# 7. Animal Details Drawer

Selecting an animal opens the Animal Details drawer.

The drawer currently displays:

- Animal Information
- Current Status
- Current Housing
- Latest Intake Information
- Record Information

The backend `GET /animals/:id` response is enriched by service composition rather than requiring the frontend to manually combine many separate requests.

Conceptually:

```text
AnimalDetailsDrawer
↓
GET /animals/:id
↓
Animal service composes:
  animal
  + active cage assignment/current cage
  + latest intake
  + rescuer/user information
↓
Drawer renders combined details
```

This keeps the frontend simpler and makes the details endpoint match the UI's information needs.

---

# 8. Create Animal

Create Animal uses a centered modal.

Important behavior:

- `animalCode` is generated by the backend
- Initial lifecycle `status` is `ACTIVE`
- Initial `adoptionStatus` is `NOT_READY`
- Create uses an idempotency key generated with `crypto.randomUUID()`

Conceptually:

```text
Open Create Animal modal
↓
Fill form
↓
Frontend validates basic input
↓
Generate Idempotency-Key
↓
POST animal
↓
Backend validates business rules
↓
Success
→ close modal
→ refresh list
→ success toast
```

Create API/form errors remain inline in the modal.

---

# 9. Edit Animal

Edit Animal uses a centered modal.

Current editable fields:

- Animal name
- Breed
- Life stage
- Sex
- Collar color
- Birth date
- Birth date estimated flag
- Health status

Current non-editable fields:

- Animal code
- Species
- Lifecycle status
- Adoption status

These restrictions are intentional so identity-like and workflow-controlled fields are not casually changed through the general edit form.

---

# 10. Animal Age and Life-Stage Validation

A cross-field validation rule was added to prevent contradictory animal records.

Current shelter business rule:

```text
CAT
KITTEN = younger than 1 year
ADULT  = 1 year or older

DOG
PUPPY = younger than 1 year
ADULT = 1 year or older

OTHER
skip age/life-stage relationship validation
```

The biological threshold is intentionally simplified to 12 months as a consistent shelter business rule.

## 10.1 Create

Create validation checks the provided:

```text
species
+ lifeStage
+ birthDate
```

If no birth date is provided, the relationship check is skipped because birth date is optional.

## 10.2 Update / PATCH

PATCH cannot safely validate only the fields sent by the frontend.

Example:

```text
Existing animal:
lifeStage = KITTEN
birthDate = 2026-05-16

PATCH:
{
  "lifeStage": "ADULT"
}
```

The update service therefore validates the final merged state:

```text
Fetch existing animal
↓
Validate fields supplied by PATCH
↓
Build finalSpecies
↓
Build finalLifeStage
↓
Build finalBirthDate
↓
validateLifeStageAgainstBirthDate(...)
↓
Repository update
```

The same logic also catches the opposite direction:

```text
Existing lifeStage = KITTEN
PATCH birthDate = older than 1 year
↓
final state invalid
↓
400 response
```

The frontend shows the backend business-rule error inline in the Create/Edit modal.

A possible later polish item is placing the age/life-stage message closer to the related fields instead of at the generic form-error location.

---

# 11. Archive Animal

Animal archive is an ADMIN-only action.

Endpoint:

```text
PATCH /animals/:animalId/archive
```

Archive behavior:

```text
Archive animal
↓
record is retained
↓
normal list/details queries exclude archived animal
```

The project intentionally avoids hard deletion where historical records matter.

Current archive feedback:

```text
Success
→ "Animal archived successfully" toast

Failure
→ error toast
```

The current frontend uses `window.confirm()` for archive confirmation. Replacing it with the shared confirmation-modal design is a future UI polish item, not a blocker for the current deployment phase.

---

# 12. Cage Management Frontend

The Cages module is functionally complete for the current phase.

Current cage fields include:

- Cage code
- Species group
- Gender group
- Recommended capacity
- Cage type
- Status
- Location

Supported values include concepts such as:

```text
Species:
CAT / DOG

Gender group:
MALE / FEMALE / MIXED

Cage type:
NORMAL / ISOLATION / TEMPORARY

Status:
ACTIVE / INACTIVE / PLANNED
```

---

# 13. Cage Identity Fields

The project identified an important data-integrity issue during frontend development.

Originally, an existing cage such as:

```text
CAT-01
```

could be edited from species `CAT` to `DOG`.

That would make the cage code and species inconsistent.

Final rule:

```text
Fixed after creation:
- cageCode
- speciesGroup

Editable:
- genderGroup
- recommendedCapacity
- cageType
- status
- location
```

The backend update validator no longer allows `speciesGroup` updates, and the frontend Edit Cage form displays species as read-only / does not send it as an editable field.

---

# 14. Cages Page

The main Cages page loads:

```text
GET cages
+
GET current cage assignments
```

This allows the main table to display occupancy such as:

```text
2 / 7
```

There is currently no backend pagination for cages.

This is intentional because the real shelter is expected to have only a small number of physical cages. Development contains more test cages because create workflows were repeatedly tested.

The project should not be redesigned around test-data volume unless production needs change.

---

# 15. Cage Details Drawer

Selecting a cage opens a right-side details drawer.

The drawer shows:

- Cage code
- Location
- Basic cage information
- Occupancy
- Assigned animals

Assigned animals are displayed as cards.

Available actions include:

- Edit Cage
- Assign Animal
- Move Animal
- Remove Animal

The backend `GET /cages/:id` response includes:

```text
basic cage data
+ occupancy
+ assignedAnimals
```

Occupancy is derived from active assignments rather than stored as a manually maintained value.

---

# 16. Cage Assignment API Workflows

Relevant backend routes already used by the frontend include:

```text
POST /cage-assignments
GET  /cage-assignments/current
POST /cage-assignments/:assignmentId/remove
GET  /cages/:cageId/assignments
GET  /animals/:animalId/cage-history
POST /animals/:animalId/move
```

These routes support assignment history rather than simply storing a current `cage_id` directly on the animal.

---

# 17. Cage Assignment Business Rules

The frontend filters obvious invalid options for better UX, but the backend remains authoritative.

## 17.1 Hard Blocks

The backend prevents assignment when:

- Animal does not exist
- Animal is not `ACTIVE`
- Cage does not exist
- Cage is not `ACTIVE`
- Animal species does not match cage species
- Animal already has an active assignment
- Move target is the animal's current cage

## 17.2 Warning-Only Rules

The following do **not** block assignment:

- Cage is at or above recommended capacity
- Animal sex does not match cage gender group

These are intentionally warnings because real shelter conditions may require temporary exceptions.

This distinction is important:

```text
Hard business rule
→ reject request

Operational warning
→ allow request
→ return warning
```

---

# 18. Assign Animal Modal

The Assign Animal modal filters the animal dropdown for convenient valid choices.

Displayed candidates are:

- `ACTIVE`
- Same species as cage
- Currently unassigned

The frontend intentionally does **not** filter by sex because a gender mismatch is allowed with a warning.

Flow:

```text
Open Assign Animal
↓
Choose eligible animal
↓
POST cage assignment
↓
Backend applies hard rules
↓
Backend may return warnings
```

Normal success:

```text
close modal
→ refresh cage details
→ refresh page occupancy
→ success toast
```

Success with warning:

```text
request succeeds
↓
data.warnings exists
↓
store warnings + completedData
↓
keep modal open
↓
show "completed with warning"
↓
user closes modal
↓
run success callback
↓
refresh data
```

The warning must stay visible long enough for the user to read it.

---

# 19. Move Animal Modal

The Move Animal workflow allows changing an animal's active cage assignment while preserving assignment history.

Destination cage options are filtered to:

- `ACTIVE`
- Same species
- Not the current cage

The frontend intentionally does not filter gender because gender mismatch remains a warning-only condition.

Backend move uses a PostgreSQL transaction:

```text
BEGIN
↓
find current assignment
↓
validate destination
↓
close current assignment
↓
insert new assignment
↓
COMMIT
```

If an error occurs:

```text
ROLLBACK
```

This prevents partially completed moves.

Move warning handling follows the same modal pattern as Assign Animal.

---

# 20. Remove Animal Modal

Remove Animal means removing the animal from its current cage assignment.

It does **not** delete:

- Animal
- Cage
- Assignment history

Instead, it closes the current active assignment.

The frontend uses a confirmation modal before performing the action.

Successful removal:

```text
close assignment
↓
refresh details
↓
refresh page occupancy
↓
success toast
```

---

# 21. React State and Callback Patterns

The frontend uses state and callback props to coordinate updates between pages, drawers, and modals.

Important concepts used in the project:

- State
- Props
- Callback props
- Lifting state up
- Controlled components
- `useEffect`
- Dependency arrays
- Conditional rendering
- Immutable state updates
- Derived data

## 21.1 Callback Props

A child component often performs an action and then tells the parent that data changed.

Example concept:

```text
CagesPage
↓ passes callback
CageDetailsDrawer
↓ passes callback
AssignAnimalModal
↓ assignment succeeds
callback runs
↓
parent refreshes data
```

The child does not directly manipulate the parent's state structure. It reports the event through a callback.

---

# 22. Refresh Key Pattern

The cage feature uses a simple refresh-key pattern to trigger refetching after related mutations.

## 22.1 Cage Details Refresh

`CageDetailsDrawer` maintains a `refreshKey`.

After assign, move, or remove:

```js
setRefreshKey((current) => current + 1);
```

The key is included in the relevant `useEffect` dependency array.

Flow:

```text
Assign / Move / Remove succeeds
↓
refreshKey changes
↓
useEffect dependency changes
↓
GET /cages/:id runs again
↓
occupancy and assignedAnimals update
```

## 22.2 Main Cages Page Refresh

`CagesPage` maintains an `assignmentsRefreshKey`.

The drawer receives an `onAssignmentsChanged()` callback.

Flow:

```text
Assignment mutation succeeds
↓
onAssignmentsChanged()
↓
assignmentsRefreshKey changes
↓
CagesPage refetches current assignments
↓
main occupancy table updates
```

This keeps both the drawer and main page in sync.

---

# 23. Refetch vs Optimistic Update

The current cage workflows generally use **refetch after mutation** rather than complex optimistic updates.

Example:

```text
POST assignment succeeds
↓
GET updated cage details
↓
render server-confirmed state
```

This is appropriate for the current project because:

- Data volume is small
- Correctness matters more than shaving off one request
- Backend business rules can produce warnings
- Assignment operations affect multiple pieces of related state

Optimistic updates can be considered later if needed, but they are not necessary for the current shelter workflow.

---

# 24. API Error Handling

Feature API calls use the shared Axios client.

Errors are handled according to context.

## Forms

```text
POST/PATCH fails
↓
catch Axios error
↓
extract backend message
↓
set local form error
↓
modal remains open
```

## Read Requests

```text
GET fails
↓
show inline error in data area
```

## Session Errors

```text
401
↓
global interceptor
↓
AuthContext clears user
↓
ProtectedRoute redirects to login
```

This avoids repeating session-expiration logic in every feature component.

---

# 25. Client Validation vs Server Validation

The project intentionally separates these responsibilities.

## Frontend validation

Purpose:

- Faster feedback
- Prevent obvious invalid submissions
- Better form UX

## Backend validation

Purpose:

- Security
- Business rules
- Data integrity
- Final authority

The frontend must never be treated as the security boundary.

A user can bypass the browser UI and send requests directly to the API, so important rules must always exist on the backend.

---

# 26. Current Frontend Success Messages

Examples currently used:

```text
Animal created successfully
Animal updated successfully
Animal archived successfully
```

Cage workflows also use success toasts for:

- Create Cage
- Edit Cage
- Assign Animal
- Move Animal
- Remove Animal

Warnings are handled differently from normal success because the user must see the business warning before the modal disappears.

---

# 27. Current Known Non-Blocking Polish Items

The following are known improvements but are not deployment blockers for the current phase:

1. Move age/life-stage validation messages closer to the related form fields.
2. Replace Animal Archive `window.confirm()` with the shared styled confirmation modal.
3. Continue visual consistency checks as additional modules are added.

These should not trigger a redesign of completed features unless an actual functional or data-integrity problem is found.

---

# 28. Current Frontend Completion Status

Current phase:

```text
Authentication              COMPLETE
Animals                     COMPLETE
Animal details              COMPLETE
Create Animal               COMPLETE
Edit Animal                 COMPLETE
Archive Animal              COMPLETE
Age/life-stage validation   COMPLETE
Cages                       COMPLETE
Cage details                COMPLETE
Assign Animal               COMPLETE
Move Animal                 COMPLETE
Remove Animal               COMPLETE
Toast feedback              COMPLETE
Warning handling            COMPLETE
Frontend cleanup            COMPLETE FOR CURRENT PHASE
```

The next major feature after deployment is the **Care module**.

---

# 29. Deployment Readiness Notes

The project deliberately plans deployment before starting Care.

Reason:

```text
Deploy existing architecture early
↓
find production configuration problems
↓
fix them before more modules depend on the same setup
```

Production testing should focus on:

- API environment variables
- Frontend API base URL
- Backend database connection
- CORS
- Cookie configuration
- Authentication/session behavior
- Protected routes
- Production build behavior
- Animals workflows
- Cage workflows

---

# 30. Deployment Sequence

Planned order:

```text
Frontend documentation
↓
Git checkpoint
↓
Deploy backend + PostgreSQL database
↓
Deploy frontend
↓
Production test Auth + Animals + Cages
↓
Fix deployment/config issues
↓
Begin Care module
```

---

# 31. Important Frontend Interview Concepts Used in This Project

The frontend currently demonstrates practical use of:

- React state
- Props
- Lifting state up
- Callback props
- Controlled components
- `useEffect`
- Dependency arrays
- Rerendering
- Mount/unmount concepts
- Derived data
- Immutable state updates
- Debouncing
- Client vs server validation
- API error handling
- Axios / HTTP interceptors
- Protected routes
- Separation of concerns
- Refetch after mutation
- Toast notifications
- Snackbar-style feedback concepts
- Modal/dialog patterns
- Confirmation modals
- Drawer/side-panel patterns
- Inline validation/errors
- Loading states
- Disabled states
- Conditional rendering
- Backdrops
- Event propagation
- `event.stopPropagation()`
- User feedback patterns

---

# 32. Example Interview Explanation: Frontend Architecture

A concise explanation of the current frontend architecture:

> The frontend is organized by feature, so Animals and Cages each have their own pages, API files, and reusable components such as drawers and modals. I use a shared Axios client for API communication and a global 401 interceptor for expired sessions. Forms keep validation errors inline, while successful mutations use shared toast notifications. For cage assignment workflows, child components notify parents through callback props, and I use refresh keys with useEffect to refetch server-confirmed data after assign, move, or remove operations.

---

# 33. Example Interview Explanation: Why Backend Validation Still Matters

> I use frontend validation for user experience, but I do not rely on it for business rules because the client can be bypassed. The backend service is the final source of truth. For example, an animal's birth date and life stage must agree. On PATCH, I fetch the existing animal, merge the current database values with the fields being updated, and validate the final state before saving it.

---

# 34. Example Interview Explanation: Cage Warning Design

> Some cage rules are hard constraints while others are operational warnings. Species mismatch or assigning an already assigned animal is blocked by the backend. Capacity and gender mismatch are warnings because a real shelter may temporarily need to exceed recommended capacity or place an animal in a cage that is not the ideal gender group. The action succeeds, but the frontend keeps the modal open long enough to show the warning.

---

# 35. Next Documentation Updates

This document covers the frontend through:

```text
Auth
Animals
Cages
```

As development continues, append documentation for:

```text
Care
Medical / Vet
Inventory
Finance / Donations / Expenses
Notifications
Reports
Adoption Management
Public Adoption Portal
```

The existing architecture and UX patterns should be reused unless a later module has a real requirement that justifies a change.

---

**Current documentation checkpoint:** Ready for Git checkpoint and deployment phase.
