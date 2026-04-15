# Invoice Generator Architecture

## Overview

This document reverse-engineers the invoice generator implementation in this repository and describes:

- the editor-side UI and interaction model
- the design system and styling rules
- the live A4 preview and PDF generation pipeline
- data persistence, autosave, export, and sharing behavior
- the state architecture and derived calculation logic
- known edge cases and implementation risks

This is intended to help a developer:

- recreate the UI with high visual fidelity
- reproduce the PDF output structure accurately
- understand how invoice creation, draft handling, and export currently work
- identify where future refactors should happen safely

## Source Files

Primary implementation sources:

- `src/components/InvoiceGenerator.jsx`
- `src/components/InvoicePreview.jsx`
- `src/index.css`
- `src/components/ClientModal.jsx`
- `src/components/Toast.jsx`
- `src/store.js`
- `src/utils.js`
- `src/services/googleDrive.js`
- `server.js`

## High-Level Architecture

The invoice generator is a React-based split-view screen composed of:

1. A left-side editor pane for invoice data entry and configuration
2. A right-side live preview pane that renders an A4 invoice sheet
3. A PDF export pipeline that rasterizes the preview DOM into a `jsPDF` document using `html2canvas`
4. A local/server-backed persistence layer for invoice records, products, clients, templates, and invoice display options

At runtime:

- `InvoiceGenerator.jsx` owns the full editing workflow and state
- `InvoicePreview.jsx` renders the print-oriented invoice markup
- `src/index.css` styles both the editor UI and the A4 preview
- `src/store.js` wraps the local Express API
- `server.js` persists JSON-backed data and local PDF files

## Screen Composition

The invoice generator lives inside the broader app shell:

- a fixed-width dark sidebar
- a flexible main content column
- a split-view work area inside the main content column

Core generator hierarchy:

```text
generator-container
  generator-toolbar
    left cluster
      Back button
      Auto-save status
    right cluster
      Create/Update Invoice
      Download PDF
      WhatsApp
      Optional E-Way Bill
  split-view
    editor-pane
      Optional business profile selector
      Invoice Type / Customization
      Billed To
      Invoice Details
      Line Items
      Terms & Conditions
      Additional Pages / Sections
    preview-pane
      Preview label
      preview-scaler
        InvoicePreview
```

## Design System

### Typography

Global font stack:

- `Inter`
- `-apple-system`
- `BlinkMacSystemFont`
- `sans-serif`

Common type tokens:

| Usage | Size | Weight | Notes |
| --- | --- | --- | --- |
| Body | default | normal | `line-height: 1.5` |
| Page title | `1.75rem` | `700` | letter-spacing `-0.025em` |
| Section title | `0.95rem` | `600` | primary blue |
| Form label | `0.8rem` | `600` | uppercase, spaced |
| Input text | `0.9rem` | normal | compact SaaS form style |
| Button text | `0.875rem` | `500` | all button variants |
| Type chip | `0.8rem` | `500` | rounded selector pill |
| Preview base text | `12.5px` | normal | `line-height: 1.45` |
| Preview title | up to `2rem` | up to `800` | depends on PDF style |

### Theme Tokens

#### Light Theme

| Token | Value | Purpose |
| --- | --- | --- |
| `--primary` | `#2563eb` | primary actions |
| `--primary-hover` | `#1d4ed8` | CTA hover |
| `--primary-light` | `rgba(37, 99, 235, 0.08)` | soft accent background |
| `--bg` | `#f0f2f5` | app background |
| `--card-bg` | `rgba(255, 255, 255, 0.92)` | glass panels |
| `--text` | `#111827` | main text |
| `--text-secondary` | `#6b7280` | secondary text |
| `--text-muted` | `#9ca3af` | muted text |
| `--border` | `rgba(229, 231, 235, 0.8)` | borders |
| `--glass-shadow` | `0 4px 24px rgba(0, 0, 0, 0.06)` | card elevation |
| `--success` | `#059669` | success |
| `--success-light` | `rgba(5, 150, 105, 0.08)` | success tint |
| `--danger` | `#dc2626` | destructive |
| `--danger-light` | `rgba(220, 38, 38, 0.08)` | destructive tint |
| `--purple` | `#7c3aed` | secondary accent |
| `--purple-light` | `rgba(124, 58, 237, 0.08)` | soft purple |
| `--radius` | `10px` | default radius |
| `--radius-lg` | `14px` | large panel radius |

#### Dark Theme

| Token | Value | Purpose |
| --- | --- | --- |
| `--primary` | `#3b82f6` | dark mode primary |
| `--primary-hover` | `#2563eb` | hover |
| `--primary-light` | `rgba(59, 130, 246, 0.12)` | focus and tint |
| `--bg` | `#0f172a` | dark page background |
| `--card-bg` | `rgba(30, 41, 59, 0.92)` | dark glass panels |
| `--text` | `#f1f5f9` | main text |
| `--text-secondary` | `#94a3b8` | secondary text |
| `--text-muted` | `#64748b` | muted text |
| `--border` | `rgba(51, 65, 85, 0.8)` | borders |
| `--glass-shadow` | `0 4px 24px rgba(0, 0, 0, 0.2)` | darker shadow |
| `--success` | `#34d399` | success |
| `--success-light` | `rgba(52, 211, 153, 0.12)` | success tint |
| `--danger` | `#f87171` | destructive |
| `--danger-light` | `rgba(248, 113, 113, 0.12)` | destructive tint |
| `--purple` | `#a78bfa` | accent |
| `--purple-light` | `rgba(167, 139, 250, 0.12)` | tint |

### Color Usage Patterns

- Primary blue is used for CTA buttons, active type chips, focus rings, badges, and PDF accents.
- Success green is used for status messaging and certain invoice badges.
- Red is used for destructive actions and negative values.
- Muted grays drive labels, helper text, metadata, table headers, and footer text.

### Radius System

| Token / Component | Value |
| --- | --- |
| Default radius | `10px` |
| Large panel radius | `14px` |
| Input radius | `8px` |
| Button radius | `8px` |
| Small icon button radius | `6px` |
| Preview sheet radius | `4px` |
| Status / tax badge radius | up to `20px` |

### Shadows and Surfaces

The app uses soft elevation rather than heavy card borders.

Primary surface rules:

- glass panels use translucent backgrounds plus blur
- buttons use small directional shadows
- the invoice preview uses a paper-like white surface with a subtle outer shadow
- modals use a large centered shadow with backdrop blur

## Layout System

### Global App Shell

| Component | Styling |
| --- | --- |
| `.app-layout` | `display:flex`, `height:100vh`, `overflow:hidden` |
| `.sidebar` | width `260px`, dark background, padded vertical rail |
| `.main-content` | `flex:1`, vertical scroll, `padding:2rem 2.5rem` |

### Invoice Generator Layout

| Component | Styling |
| --- | --- |
| `.generator-container` | column flex, fills available height |
| `.generator-toolbar` | horizontal toolbar, bottom margin `1.5rem` |
| `.split-view` | 2-column flex layout with `gap:2rem` |
| `.editor-pane` | scrollable left column, right padding `0.5rem` |
| `.preview-pane` | centered column, scrollable |
| `.preview-scaler` | scales preview to `0.82` from top center |

### Grid and Spacing Rules

Common utility spacing:

| Utility | Value |
| --- | --- |
| `.gap-2` | `0.5rem` |
| `.gap-4` | `1rem` |
| `.gap-6` | `1.5rem` |
| `.mt-2` / `.mb-2` | `0.5rem` |
| `.mt-4` / `.mb-4` | `1rem` |
| `.mt-6` / `.mb-6` | `1.5rem` |
| `.mt-8` / `.mb-8` | `2rem` |
| `.p-4` | `1rem` |
| `.p-6` | `1.5rem` |

Form grids use:

- `.grid`
- `.grid-cols-2`
- `.gap-4`

The default invoice entry sections use consistent card spacing:

- card padding: `1.5rem`
- vertical separation between cards: `1.5rem`

### Responsiveness

There is almost no invoice-generator-specific responsive adaptation in the provided CSS.

Known behavior:

- the PWA banner is the only provided element with a dedicated mobile media query
- the invoice generator remains in split-view layout even on small screens
- the preview remains fixed to A4 proportions and visually scaled down

Practical result:

- the generator is desktop-first
- mobile usability is limited

## Core UI Components

### Glass Panels

Used for almost every editor section.

Styling:

- `background: var(--card-bg)`
- `backdrop-filter: blur(20px)`
- `border: 1px solid var(--border)`
- `border-radius: var(--radius-lg)`
- `box-shadow: var(--glass-shadow)`

### Buttons

#### Primary Button

- blue background
- white text
- padding `0.6rem 1.25rem`
- radius `8px`
- small blue shadow
- hover state darkens and lifts by `1px`

#### Secondary Button

- white background in light mode
- dark background in dark mode
- border `1.5px solid var(--border)`
- text uses foreground color

#### Icon Buttons

- `28x28`
- inline-flex centered
- radius `6px`

Color variants:

- `icon-btn-blue`
- `icon-btn-red`
- `icon-btn-green`

### Inputs

Standard text/select/textarea input rules:

- width `100%`
- padding `0.65rem 0.9rem`
- `1.5px` border
- `8px` radius
- white background in light mode
- dark slate background in dark mode

Focus state:

- border switches to primary blue
- outer ring uses `var(--primary-light)`

Selects:

- use a custom inline SVG down-arrow
- hide the native appearance
- add right-side padding for the arrow

### Modals

Modal system used by `ClientModal`:

- full-screen fixed overlay
- dark translucent backdrop `rgba(0,0,0,0.4)`
- `backdrop-filter: blur(4px)`
- centered panel
- panel radius `12px`
- panel padding `2rem`
- max width `560px`
- max height `85vh`

### Toasts

Global toast container:

- fixed top-right
- stacked vertically with `0.5rem` gap
- animation slides in from the right

Toast variants:

- success
- error
- warning
- info

Each toast uses:

- status-colored background
- left status border
- icon + message + close button layout

## Invoice Generator Editor

## Toolbar

The top toolbar contains all high-priority actions.

### Left Cluster

- Back button
- Auto-save status label

Back button behavior:

- clears session draft
- invokes `onBack()`

Auto-save status values:

- idle: hidden/neutral
- saving: spinner + `Saving...`
- saved: check icon + `All changes saved`

### Right Cluster

- Create Invoice / Update Invoice
- Download PDF
- WhatsApp
- E-Way Bill (conditional)

Button behavior:

| Button | Behavior |
| --- | --- |
| Create / Update | validates and persists invoice |
| Download PDF | validates, generates PDF, saves invoice, downloads file, attempts local save, starts Drive upload |
| WhatsApp | opens WhatsApp send URL with invoice summary text |
| E-Way Bill | downloads E-Way Bill JSON |

## Business Profile Selector

This section is shown only if more than one saved business profile exists.

Behavior:

- each profile renders as a selectable chip-like button
- current selection is visually emphasized with:
  - stronger border
  - tinted background
  - bolder text

Selection affects:

- seller identity in the preview
- tax comparison logic
- logo/signature/bank details/UPI shown in PDF

## Invoice Type Section

This section contains:

- type selection chips
- contextual description
- customization toggle
- optional advanced options panel

### Supported Types

| Type Key | Label | Prefix | Title | GST |
| --- | --- | --- | --- | --- |
| `tax-invoice` | Tax Invoice | `INV` | `TAX INVOICE` | on |
| `proforma` | Proforma / Estimate | `EST` | `PROFORMA INVOICE` | on |
| `bill-of-supply` | Bill of Supply (No GST) | `BOS` | `BILL OF SUPPLY` | off |
| `credit-note` | Credit Note | `CN` | `CREDIT NOTE` | on |
| `delivery-challan` | Delivery Challan | `DC` | `DELIVERY CHALLAN` | off |

### Type Switching Behavior

On type change:

1. `invoiceType` updates
2. a new invoice number is requested from the server using the type prefix
3. GST-related display options are adjusted

Special cases:

- `bill-of-supply` forces `showGST=false`
- `bill-of-supply` also forces `showPlaceOfSupply=false`
- other GST types reset `showGST` based on the type config

## Customization Options Panel

The options panel is hidden behind a `Customize` button.

### Invoice Title

- editable text field
- overrides the default title shown in the preview and PDF

### Currency Selector

Supported values:

- `INR`
- `USD`
- `EUR`
- `GBP`
- `AUD`
- `CAD`
- `SGD`
- `AED`

Effects:

- changes preview amount formatting
- changes amount-in-words logic
- affects WhatsApp share amount
- suppresses UPI QR for non-INR currencies

### PDF Style Selector

Supported style ids:

- `classic`
- `modern`
- `minimal`

### Accent Color Selector

Preset palette:

- Blue `#1e40af`
- Purple `#7c3aed`
- Teal `#0f766e`
- Red `#be123c`
- Orange `#c2410c`
- Green `#15803d`
- Sky `#0369a1`
- Dark `#1e293b`

Auto mode uses invoice-type-specific defaults:

- tax invoice: blue
- proforma: purple
- bill of supply: teal
- credit note: red

### Feature Toggles

All toggles are checkbox-based and render in a 2-column grid.

Available toggles:

- Logo
- Signature
- GST
- State
- GSTIN
- Place of Supply
- HSN/SAC
- Discount
- Qty Column
- Due Date
- Amount in Words
- Bank Details
- UPI QR Code
- Terms & Conditions
- Notes / Remarks

## Client Section

The `Billed To` card captures buyer information and supports saved-client lookup.

### Fields

- Client Name
- Billing Address
- Country
- City
- Postal/PIN code
- State / Province / Region
- Tax ID

Country-specific behavior comes from `getCountryConfig()` and `getStatesForCountry()`.

Examples:

- India uses `GSTIN`, `PIN Code`, `State`
- United States uses `EIN / TIN`, `ZIP Code`, `State`
- UAE uses `TRN`, `Postal Code`, `Emirate`

### Client Suggestions

The client name field doubles as a saved-client lookup.

Behavior:

- suggestions open on focus if clients exist
- typing filters client names using case-insensitive substring match
- selecting a suggestion fills the full client form
- selected saved clients expose an edit icon button beside the name field
- inline edit buttons also exist inside the dropdown rows

Displayed suggestion metadata:

- city or truncated address
- state
- GSTIN or country tax ID if present

### Add / Edit Client Modal

The modal supports:

- creating a new client from current invoice fields
- editing an existing saved client

Saved fields:

- name
- address
- city
- pin
- state
- gstin / tax id
- email
- phone
- country

Validation:

- only client name is required in the modal

## Invoice Details Section

Fields:

- Invoice Number
- Invoice Date
- Due Date
- Place of Supply
- Original Invoice Reference

### Behaviors

- invoice number is initially generated by the server
- invoice date defaults to today
- due date is optional
- place of supply is shown only when `showPlaceOfSupply` is enabled
- original invoice reference is shown only for credit notes

## Line Items Section

Line items are edited as stacked flex rows rather than a semantic table in the editor.

Per-row fields:

- Description
- HSN/SAC
- Quantity
- Rate
- Discount
- Tax %
- Remove button

### Default New Item

```json
{
  "id": "<timestamp>",
  "name": "",
  "hsn": "",
  "quantity": 1,
  "rate": 0,
  "discount": 0,
  "taxPercent": 18
}
```

If GST is disabled, default `taxPercent` becomes `0`.

### Product Suggestions

Typing in Description triggers product lookup.

Lookup rules:

- search by product `name`
- search by `hsn`
- case-insensitive substring match
- limited to 5 results

Selecting a product fills:

- `name`
- `hsn`
- `rate`
- `taxPercent`
- `productId`

### Tax Inclusive Toggle

This checkbox appears at the top-right of the line items section only when GST is enabled.

Label:

- `Prices include tax`

Effect:

- switches totals and preview calculations into tax-inclusive mode

If GST is later disabled:

- all item tax rates are forced to `0`
- tax-inclusive mode is forcibly turned off

## Terms, Notes, and Private Note

The terms card contains four separate concerns.

### Template Selector

If templates exist, a dropdown allows:

- choosing a saved template
- loading the template content into the terms textarea

### Terms

- plain textarea
- visible on the invoice if enabled

### Notes / Remarks

- plain textarea
- visible on the invoice if enabled

### Private Note

- visually highlighted yellow box
- not shown on invoice
- stored in the saved invoice data

This is intended for internal reminders such as:

- follow-up timing
- credit notes
- referral source

## Additional Pages / Sections

This feature adds optional pages after the main invoice.

Each section contains:

- title
- rich HTML content

### Editor Behavior

- sections can be added dynamically
- sections can be reordered using up/down buttons
- sections can be deleted
- content is edited via `RichEditor`

### RichEditor Details

`RichEditor` is a contentEditable-based editor.

Key behavior:

- sanitizes HTML with `DOMPurify`
- loads initial content safely
- updates content on input
- supports pasted rich text such as:
  - bold text
  - lists
  - tables
  - content from Word or Google Docs

Only non-empty sections are rendered in the preview/PDF.

## Validation Rules

The invoice must satisfy all of the following:

- invoice number is present
- invoice date is present
- client name is present
- at least one line item exists
- each line item has a non-empty description
- each line item has quantity greater than 0
- each line item has non-negative rate
- each line item has non-negative discount
- discount cannot exceed line amount
- tax percent must be between 0 and 100 when GST is enabled

Indian GSTIN validation:

- if client country is India
- and GSTIN is not blank
- it must match the provided 15-character GSTIN regex

## Calculation Engine

The totals engine uses integer paise math to reduce floating-point drift.

Helper functions:

- `toPaise(value)`
- `fromPaise(value)`
- `roundMoney(value)`

### Per-Line Calculation

For each item:

1. quantity and rate are coerced to numbers
2. line amount is converted to paise
3. discount is clamped between `0` and line amount
4. post-discount amount is computed
5. tax is applied only when GST is enabled

### Exclusive Tax Mode

Tax logic:

```text
tax = afterDiscount * taxPercent
```

Final total:

```text
subtotal - discount + tax
```

### Inclusive Tax Mode

Tax is back-calculated from the post-discount amount:

```text
taxable = afterDiscount / (1 + taxRate)
tax = afterDiscount - taxable
```

Final total:

```text
subtotal - discount
```

### Interstate vs Intrastate Logic

The comparison is based on normalized seller and client states:

- same state: intrastate
- different state: interstate

Tax distribution:

| Condition | CGST | SGST | IGST |
| --- | --- | --- | --- |
| Intrastate | half | half | `0` |
| Interstate | `0` | `0` | full |

### Derived Totals Object

The final totals state contains:

- `subtotal`
- `totalDiscount`
- `taxableAmount`
- `cgst`
- `sgst`
- `igst`
- `total`
- `taxInclusive`

## Live Preview Architecture

`InvoicePreview.jsx` is the print-oriented renderer.

It receives:

- seller profile
- client
- invoice details
- line items
- totals
- invoice type
- terms
- notes
- extra sections
- display options

It is not a generic component library artifact. It is a tightly coupled print layout component that is designed specifically for PDF capture.

## PDF Layout

### Base Page

The preview uses an A4 sheet model:

- width: `210mm`
- minimum height: `297mm`
- white background
- subtle border and paper shadow

Page styling:

- `font-family: Inter`
- `font-size: 12.5px`
- `line-height: 1.45`
- `color: #1a1a2e`

### PDF Style Variants

#### Classic

Characteristics:

- 6px accent gradient bar at the top
- large invoice title on the left
- invoice metadata under the title
- seller business block on the right
- most formal and structured style

#### Modern

Characteristics:

- bold full-width accent header block
- white logo and white text on color
- invoice metadata row beneath header
- final total shown inside a filled accent rectangle
- accent bar at the bottom of the page

#### Minimal

Characteristics:

- lightest chrome
- small seller block on the left
- accent-colored invoice title on the right
- thin accent divider line
- simpler visual hierarchy

## PDF Header

### Classic Header

Structure:

- top accent bar
- left block:
  - optional logo
  - invoice title
  - optional proforma note
  - optional credit note reference
  - invoice number/date/due date rows
- right block:
  - business name
  - address
  - city/pin
  - state
  - GSTIN / tax id
  - email
  - phone

### Modern Header

Structure:

- full-width accent header block
- left block:
  - optional logo rendered white via filter
  - invoice title
  - optional proforma helper text
- right block:
  - business name
  - address/details

Under that:

- a pale metadata strip containing:
  - invoice number
  - invoice date
  - due date
  - optional credit-note reference

### Minimal Header

Structure:

- left block:
  - optional logo
  - business name
  - business details
- right block:
  - invoice title
  - invoice number
  - invoice date
  - due date
- bottom accent divider

## Seller/Buyer Party Section

This section is shared across styles with small padding differences.

Left block:

- `BILL TO`
- client name
- address
- city/pin
- state
- GSTIN / tax id

Right block when enabled:

- `PLACE OF SUPPLY`
- explicit place of supply or client state fallback
- tax mode badge:
  - `Interstate (IGST)`
  - `Intrastate (CGST + SGST)`

## Preview Items Table

The preview table changes structure based on:

- GST visibility
- interstate vs intrastate
- HSN visibility
- quantity visibility
- whether any item has a discount

### Non-GST Table

Columns:

- row number
- description
- HSN/SAC if enabled
- quantity if enabled
- rate
- discount if at least one item has discount
- amount

### Interstate GST Table

Columns:

- row number
- description
- HSN/SAC if enabled
- quantity if enabled
- rate
- discount if applicable
- IGST %
- IGST amount
- amount

### Intrastate GST Table

Columns:

- row number
- description
- HSN/SAC if enabled
- quantity if enabled
- rate
- discount if applicable
- CGST %
- CGST amount
- SGST %
- SGST amount
- amount

### Row Rendering Logic

Per row:

- amount shown in the final `Amount` column is the taxable base after discount
- if tax-inclusive mode is active, the displayed amount is backed out before tax
- alternating rows use a pale background

## Preview Totals Section

The totals section is two-column:

- left: amount-in-words and optional UPI QR block
- right: numeric totals

### Numeric Totals

Possible rows:

- Subtotal
- Discount
- IGST or CGST + SGST
- Total Due or Credit Amount

### Amount in Words

For `INR`:

- uses Indian number formatting
- e.g. `One Lakh Twenty Thousand Rupees Only`

For non-INR:

- uses a separate English converter
- appends currency-specific unit names where supported

### UPI QR

Rendered only when:

- `showUPI` is true
- profile has a UPI id
- total exists
- currency is `INR`

Displayed content:

- QR image
- UPI ID
- total amount

## Preview Footer

Left side may include:

- Bank Details
- Terms & Conditions
- Notes / Remarks

Right side may include:

- Authorized Signatory
- signature image
- business name

### Bank Details Fields

- bank name
- account number
- IFSC
- PAN if present

### Terms Rendering

Terms are stored as textarea content but rendered as pipe-separated inline segments.

Example:

```text
Line 1
Line 2
Line 3
```

becomes:

```text
Line 1 | Line 2 | Line 3
```

### Notes Rendering

Notes are rendered as a single text paragraph.

## Extra Pages in Preview/PDF

Each non-empty extra section produces a new preview page after the main invoice.

Page structure:

- header with invoice reference and page number
- optional uppercase section title
- sanitized rich HTML content

Supported content styling:

- paragraphs
- lists
- tables
- headings
- bold text

## Proforma Watermark

When `invoiceType === 'proforma'`, the preview overlays:

- the word `ESTIMATE`
- centered on the sheet
- rotated `-35deg`
- very low opacity accent tint

## PDF Generation Pipeline

PDF export is built from the preview DOM.

### Step-by-Step Flow

1. validate invoice
2. locate `printRef`
3. temporarily disable preview scaling
4. create a `jsPDF` A4 document
5. compute render scale based on complexity
6. hide extra pages
7. rasterize the main invoice via `html2canvas`
8. add one or more pages for the main invoice image
9. rasterize each extra page separately
10. restore hidden elements and UI scale
11. save invoice
12. download PDF
13. save PDF to local folder API
14. attempt Google Drive upload

### Render Scale Logic

Complexity score:

```text
items.length + (extraSections.length * 4)
```

Scale rules:

- score `> 45`: scale `1`
- score `> 25`: scale `1.35`
- otherwise: scale `1.8`

### DOM Clone Cleanup

Before capture:

- letter spacing is normalized to `0px`
- word spacing is normalized to `0px`
- preview border, shadow, radius are removed in the cloned DOM
- extra pages are hidden during main capture

### Extra Page Capture

Extra pages are captured one by one and appended as full A4 pages in the PDF.

## Persistence and Data Flow

## Session Drafts

Draft storage key:

- `gst_invoiceDraft`

Stored state:

- invoice type
- client
- details
- items
- custom terms
- custom notes
- private note
- extra sections
- selected terms template id
- invoice options
- tax inclusive mode

Drafts are skipped when editing an existing bill.

## Invoice Display Options Persistence

Storage layers:

- localStorage: `freegstbill_invoiceOptions`
- server meta endpoint: `/api/meta/invoiceDisplayOptions`

Behavior:

- local storage initializes fast
- server value overrides local value when loaded
- subsequent option changes write back to local storage immediately
- after initialization, options are also persisted to the server

## Invoice Number Generation

Frontend requests invoice numbers via:

- `/api/invoices/next-number`

Backend behavior:

- counter is stored in `meta.json`
- counter is maintained per prefix
- numbering is generated atomically server-side

Default formatting:

- format: branded
- separator: `/`
- include year band
- zero-padded 4-digit sequence

## Invoice Save Behavior

### Standard Save

Invoice payload includes:

- id
- client summary
- invoice number/date
- invoice type
- currency
- total amount
- tax amount
- status
- paid amount
- payment history
- full serialized invoice data

### Stock-Aware Save

For new invoices:

- rows linked to products generate stock adjustment entries
- server validates stock availability
- invoice and stock updates are written in a transaction-like flow

### Edit Save

For existing invoices:

- stock is not deducted again
- plain `saveBill()` path is used

## Local PDF Save

After generating a PDF, the frontend POSTs the binary PDF to:

- `/api/save-pdf`

The backend stores it under:

```text
Saved Invoices/{Client Name}/{Month Year}/{File Name}.pdf
```

Input query parameters:

- `name`
- `client`
- `month`

All folder/file names are sanitized.

## Google Drive Upload

Drive integration is browser-only.

Key functions:

- `initGoogleDrive(clientId)`
- `ensureToken(clientId)`
- `findOrCreateFolder(folderName)`
- `uploadPDF(fileName, pdfBlob, folderId)`

Scope:

- `https://www.googleapis.com/auth/drive.file`

Behavior:

- if a token is missing or expired, `ensureToken()` requests one
- target folder is created if absent
- PDF is uploaded as multipart content

## Sharing and Export Features

### WhatsApp Share

The share action builds a plain text message:

```text
*Invoice: {invoiceNumber}*
Client: {clientName}
Amount: {formattedAmount}
Date: {invoiceDate}
```

Phone number behavior:

- uses the current client phone or selected saved-client phone
- strips all non-digits

### E-Way Bill Export

Available when invoice type is:

- `tax-invoice`
- `delivery-challan`

Generated data includes:

- seller GST details
- buyer GST details
- document number and date
- interstate/intrastate tax split
- item HSN, quantity, taxable amount, and tax rates

Output format:

- pretty-printed JSON
- downloaded as `EWB-{invoiceNumber}.json`

## React State Architecture

Main state buckets in `InvoiceGenerator.jsx`:

### Seller / Context State

- `allProfiles`
- `activeProfile`

### Invoice Content State

- `invoiceType`
- `client`
- `details`
- `items`
- `taxInclusive`
- `totals`

### Terms / Notes / Extra Content

- `termsTemplates`
- `selectedTermsId`
- `customTerms`
- `customNotes`
- `internalNote`
- `extraSections`

### Client and Product Lookup State

- `savedClients`
- `showClientSuggestions`
- `selectedClientId`
- `showClientModal`
- `modalClient`
- `isEditingClient`
- `products`
- `productSearch`

### Display and UX State

- `invoiceOptions`
- `showOptions`
- `saving`
- `autoSaveStatus`

### Refs

- `printRef`
- `draftInitialized`
- `autoSaveTimer`
- `autoSaveStatusTimer`
- `stockDeducted`
- `hasInitialized`
- `clientNameRef`
- `clientSuggestionsRef`

## Side Effects

Important `useEffect` responsibilities:

- persist invoice options to local storage
- load invoice options from server
- persist draft to session storage
- delay auto-save activation
- debounce auto-save to server
- load profiles/templates/clients/products on mount
- initialize state from edit mode or duplicate mode
- zero-out taxes when GST is turned off
- recompute totals whenever inputs change
- generate UPI QR whenever invoice amount or identity changes
- close client suggestions on outside click

## Exact Rebuild Blueprint

To recreate the experience faithfully, preserve the following:

### Editor-Side Visual Rules

- dark permanent sidebar width: `260px`
- main content padding: `2rem 2.5rem`
- card radius: `14px`
- card padding: `1.5rem`
- form input padding: `0.65rem 0.9rem`
- button padding: `0.6rem 1.25rem`
- section spacing: `1.5rem`
- split-view gap: `2rem`

### Preview-Side Visual Rules

- A4 width: `210mm`
- minimum preview height: `297mm`
- preview scale in editor: `0.82`
- classic header padding: `2rem 2.5rem 0`
- parties margin: `0 2.5rem 2rem`
- parties padding: `1.5rem`
- table margin: `0 1.5rem 1.5rem` or `0 2rem` by style
- totals padding: `0 2.5rem`
- footer padding: `1.75rem 2.5rem 2rem`

### Interaction Rules Worth Preserving

- auto-save feedback in toolbar
- type selection via rounded chips
- client lookup and modal editing
- product suggestion autofill
- live preview updates on every change
- preview always forced to light styling in dark mode
- additional pages handled as first-class print sections

## Known Issues and Risks

### 1. Auto-save Writes Real Bills

The auto-save path writes directly to saved bills instead of a dedicated draft store.

Risk:

- draft invoices may be persisted as final records
- creates conflict with final create/download flows

### 2. Duplicate Invoice Number Race

Because autosave can already have written a record, later explicit save/download can trigger a duplicate invoice number conflict and regenerate a new invoice number instead of finalizing smoothly.

### 3. First Client Save UX Gap

The inline `Save as new client` action only appears when `savedClients.length > 0`, so first-time users may not get the expected quick-save affordance from the suggestion UI.

### 4. Discount Toggle Is Presentation-Only

Disabling `showDiscount` hides inputs and table columns, but existing discount values can still influence totals.

### 5. Financial Year Formatting Is Calendar-Based

The backend year-band logic uses the current year directly rather than a true Indian financial-year rollover.

### 6. Mobile Experience Is Weak

The screen remains a desktop split-view with a scaled A4 preview and no invoice-specific mobile layout adjustments.

### 7. PDF Pagination Is Raster-Based

The main invoice is captured as an image and sliced across pages, which can split content awkwardly.

### 8. Extra Sections Do Not Auto-Paginate Within a Section

Each extra section is captured as one image page, so very tall content can compress rather than paginate naturally.

### 9. Terms Formatting Is Flattened

Textarea terms become a pipe-separated inline line rather than preserving block formatting.

### 10. Logo Recoloring in Modern Header

Modern mode forces the logo to white using a CSS filter, which may distort multi-colored brand logos.

## Suggested Refactor Directions

If this module is improved in the future, the most valuable refactor directions are:

1. separate draft persistence from saved invoice persistence
2. move PDF pagination to a semantic print layout instead of image slicing
3. add a responsive/mobile editing mode
4. normalize toggle behavior so hidden fields do not silently continue affecting totals
5. centralize invoice style tokens for easier theme evolution
6. extract preview variants into smaller subcomponents

## Summary

The current invoice generator is a tightly integrated editor + preview + PDF system with strong visual consistency and a practical feature set:

- multiple invoice document types
- live configurable PDF variants
- GST-aware totals
- saved clients and products
- local/server persistence
- WhatsApp sharing
- Google Drive upload
- E-Way Bill JSON export
- additional rich-content pages

Its strongest implementation trait is the direct mapping between the live preview and final PDF output.

Its biggest technical weaknesses are draft persistence, mobile adaptability, and raster-based PDF pagination.
