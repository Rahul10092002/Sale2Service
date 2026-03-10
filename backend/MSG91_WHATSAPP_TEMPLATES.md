# MSG91 WhatsApp Message Templates

This document lists all WhatsApp message templates used by the service and provides MSG91-compatible payload examples to register/use them.

Notes:

- Replace `{{NAMESPACE}}` with your MSG91 WhatsApp namespace.
- `language.code` uses `en` and `policy` is `deterministic`.
- MSG91 payloads below use `integrated_number` and `to_and_components` as required by the MSG91 templates API.

---

## invoice_created_v1

- Category: INVOICE
- Variables (in order):
  1. `customer_name` — Customer full name (required)

2.  `invoice_number` — Invoice number (required)
3.  `total_amount` — Total invoice amount (required)
4.  `invoice_date` — Invoice date (required)
5.  `shop_name` — Shop name (required)

Template text:

```
Hello {{customer_name}},

Your invoice {{invoice_number}} has been generated.

🧾 Amount: {{total_amount}}
📅 Date: {{invoice_date}}

Thank you for choosing {{shop_name}}.
```

MSG91 example payload (register/send):

```json
{
  "integrated_number": "<MSG91_NUMBER>",
  "content_type": "template",
  "payload": {
    "messaging_product": "whatsapp",
    "type": "template",
    "template": {
      "name": "invoice_created_v1",
      "language": { "code": "en", "policy": "deterministic" },
      "namespace": "{{NAMESPACE}}",
      "to_and_components": [
        {
          "to": ["<recipient_number>"],
          "components": {
            "body_1": { "type": "text", "value": "<customer_name>" },
            "body_2": { "type": "text", "value": "<invoice_number>" },
            "body_3": { "type": "text", "value": "<total_amount>" },
            "body_4": { "type": "text", "value": "<invoice_date>" },
            "body_5": { "type": "text", "value": "<shop_name>" }
          }
        }
      ]
    }
  }
}
```

---

## payment_pending_v1

- Category: PAYMENT
- Variables (in order):
  1. `customer_name`
  2. `pending_amount`
  3. `invoice_number`
  4. `shop_name`

Template text:

```
Hello {{customer_name}},

This is a reminder for your pending payment of {{pending_amount}} against Invoice {{invoice_number}}.

Please contact us if already paid.

– {{shop_name}}
```

MSG91 components mapping: use `body_1`..`body_4` in the same order as variables.

---

## warranty_expiry_v1

- Category: WARRANTY
- Variables: `customer_name`, `product_name`, `serial_number`, `warranty_end_date`, `shop_name`

Template text and MSG91 mapping: use `body_1`..`body_5`.

---

## warranty_expired_v1

- Category: WARRANTY
- Variables: `customer_name`, `product_name`, `serial_number`, `shop_name`

Use `body_1`..`body_4`.

---

## service_due_v1

- Category: SERVICE
- Variables: `customer_name`, `product_name`, `serial_number`, `service_date`, `shop_name`

Use `body_1`..`body_5`.

---

## service_missed_v1

- Category: SERVICE
- Variables: `customer_name`, `product_name`, `shop_name`

Use `body_1`..`body_3`.

---

## service_rescheduled_v1

- Category: SERVICE
- Variables: `customer_name`, `product_name`, `new_service_date`, `shop_name`

Use `body_1`..`body_4`.

---

## service_completed_v1

- Category: SERVICE
- Variables: `customer_name`, `product_name`, `serial_number`, `shop_name`

Use `body_1`..`body_4`.

---

Usage notes

- When calling the MSG91 API via our helper (see `backend/config/msg91.js`), pass the template variables as an ordered array (values only). The helper maps array index 0 -> `body_1`, index 1 -> `body_2`, etc.
- If the template requires a document (e.g., invoice PDF), include a `header` component with `type: document` and `document: { link: "<url>", filename: "<name>" }` as shown in the helper.
- Ensure templates are approved in the MSG91 console/WhatsApp Business Manager and the `namespace` matches your configured namespace.

Registering templates on MSG91 / WhatsApp

1. Create each template in the MSG91 dashboard using the exact `template_name` values above.
2. Use `en` as language code; set policy to `deterministic` unless you have a different requirement.
3. For templates that include amounts, dates, or serial numbers, set the component types to `TEXT` and use placeholders in the order defined above.

If you want, I can also generate a JSON file with example calls for each template that our service can use directly. Would you like that?

# MSG91 WhatsApp Message Templates

This document lists the WhatsApp message templates used by the project and MSG91 payload examples to register/send them. Replace `{{NAMESPACE}}` with your MSG91 namespace and adjust language if needed.

**Environment**: ensure these env vars are set before using MSG91:

- **MSG91_API_ENDPOINT**: MSG91 template/send endpoint (e.g. https://api.msg91.com/api/v5/whatsapp/flow/
- **MSG91_AUTHKEY**: Auth key provided by MSG91
- **MSG91_NAMESPACE**: Template namespace provided by MSG91
- **MSG91_NUMBER**: Integrated WhatsApp number (phone id)

---

**Notes about components and placeholders**

- Our MSG91 helper constructs component fields like `body_1`, `body_2`, ... from the ordered values you pass (array or object values). When registering templates in MSG91/WhatsApp, use positional placeholders `{{1}}`, `{{2}}`, etc in the template body to map to these values.
- For document attachments (e.g. invoice PDF) include a `header` document component with a link.

---

**Template: robosensy_otp**

- Purpose: Send single-use OTP during authentication
- Type: Template (text)
- Language: en
- Example template body (WhatsApp template text):

  Your OTP is {{1}}. It will expire in 5 minutes.

- MSG91 send payload example:

```json
{
  "integrated_number": "{{MSG91_NUMBER}}",
  "content_type": "template",
  "payload": {
    "messaging_product": "whatsapp",
    "type": "template",
    "template": {
      "name": "robosensy_otp",
      "language": { "code": "en", "policy": "deterministic" },
      "namespace": "{{NAMESPACE}}",
      "to_and_components": [
        {
          "to": ["91999xxxxxxx"],
          "components": { "body_1": { "type": "text", "value": "123456" } }
        }
      ]
    }
  }
}
```

---

**Template: service_due_v1**

- Purpose: Notify customer of upcoming service (3 days / 1 day prior)
- Type: Template (text)
- Placeholders: {{1}} customer_name, {{2}} product_name, {{3}} service_date, {{4}} invoice_number
- Example body:

  Hi {{1}}, your {{2}} is scheduled on {{3}} (Invoice: {{4}}). Reply for reschedule.

- MSG91 payload mapping (order matters):

```json
{
  "components": {
    "body_1": { "type": "text", "value": "Rajesh" },
    "body_2": { "type": "text", "value": "AC Model X" },
    "body_3": { "type": "text", "value": "2026-03-01" },
    "body_4": { "type": "text", "value": "INV-1001" }
  }
}
```

---

**Template: service_missed_v1**

- Purpose: Notify customer of missed service
- Placeholders: {{1}} customer_name, {{2}} product_name, {{3}} missed_date
- Example body:

  Hi {{1}}, we missed servicing your {{2}} on {{3}}. Please contact us to reschedule.

---

**Template: warranty_expiry_v1**

- Purpose: Inform customer warranty will expire soon
- Placeholders: {{1}} customer_name, {{2}} product_name, {{3}} warranty_end_date
- Example body:

  Hi {{1}}, warranty for your {{2}} ends on {{3}}. Contact us for extended warranty offers.

---

**Template: warranty_expired_v1**

- Purpose: Inform customer warranty has expired
- Placeholders: {{1}} customer_name, {{2}} product_name, {{3}} expiry_date
- Example body:

  Hi {{1}}, warranty for your {{2}} expired on {{3}}. We can still help — call us.

---

**Template: payment_pending_v1**

- Purpose: Payment reminder for invoice
- Placeholders: {{1}} customer_name, {{2}} invoice_number, {{3}} invoice_date, {{4}} pending_amount, {{5}} payment_link(optional)
- Example body:

  Hi {{1}}, invoice {{2}} dated {{3}} has a pending amount of {{4}}. Pay here: {{5}}

- Sending with document (optional): include invoice PDF as `header` document in components. Example header field:

```json
"header": { "type": "document", "document": { "link": "https://example.com/invoices/INV-1001.pdf", "filename": "INV-1001.pdf" } }
```

---

**Template: invoice_created_v1**

- Purpose: Send newly created invoice with PDF
- Type: Template with document header
- Placeholders: {{1}} customer_name, {{2}} invoice_number, {{3}} total_amount
- Example body:

  Hi {{1}}, your invoice {{2}} for {{3}} has been generated. See attached invoice.

- MSG91 payload example (with document header):

```json
{
  "integrated_number": "{{MSG91_NUMBER}}",
  "content_type": "template",
  "payload": {
    "messaging_product": "whatsapp",
    "type": "template",
    "template": {
      "name": "invoice_created_v1",
      "language": { "code": "en", "policy": "deterministic" },
      "namespace": "{{NAMESPACE}}",
      "to_and_components": [
        {
          "to": ["91999xxxxxxx"],
          "components": {
            "header": {
              "type": "document",
              "document": {
                "link": "https://cdn.example.com/invoices/INV-1001.pdf",
                "filename": "INV-1001.pdf"
              }
            },
            "body_1": { "type": "text", "value": "Rahul" },
            "body_2": { "type": "text", "value": "INV-1001" },
            "body_3": { "type": "text", "value": "₹12,345.00" }
          }
        }
      ]
    }
  }
}
```

---

**Template: patient_registration** (example used in logging)

- Purpose: Welcome message / registration confirmation
- Placeholders: {{1}} patient_name, {{2}} registration_id
- Example body:

  Welcome {{1}}! Your registration id is {{2}}. Thank you.

---

**General guidance for registering templates in MSG91/WhatsApp**

- Use `{{1}}`, `{{2}}`, ... placeholders in the template body to map to `body_1`, `body_2`, etc in the MSG91 payload.
- Use a `header` component for documents/images. For documents, set type to `document` and supply a public `link`.
- For buttons or call-to-action templates, register appropriate components in the WhatsApp template (buttons) and map them in payload accordingly.
- Test templates in sandbox/dev before registering them for production approvals.

---

If you'd like, I can:

- add these template names to `WhatsAppTemplate` records in the database (seed script), or
- generate ready-to-use example code to attach invoice PDFs when creating invoices.
