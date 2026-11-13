# Third-party EMI reminders

Select EMI in invoice Payment Mode. Enter the monthly amount, number of installments
(1–360), first due date and reminder lead time (1–28 days; default 3). Payment Status
continues to describe payment received by the shop. Finance installments never add
to invoice receivables, GST, customer balances or payment receipts. The schedule
does not confirm whether a customer paid the finance company.

Edit the invoice to update the plan or disable its reminder checkbox. The invoice
PDF notification checkbox controls the immediate invoice message separately.
Monthly dates stay anchored to the first due date; missing days use month-end.
Reminders stop at the installment count. Deleted invoices/customers/shops are excluded.

The server checks hourly from 09:00 through 18:00 Asia/Kolkata. One message is sent
per invoice/due date inside the configured lead window, strictly before the due
date. An interrupted server can catch up within that window. The server must be
running for scheduled delivery.

## MSG91 setup

Approve the following template in the existing MSG91/WhatsApp account before use:

- Name: `product_emi_reminder_hi`
- Category: Utility
- Language: `hi`
- Body variables: customer full name, product name(s), EMI amount without currency
  symbol, due date in DD-MM-YYYY, business name (Hindi name preferred).

```text
नमस्कार {{1}} जी 🙏

उम्मीद है आप अच्छे होंगे! 😊

यह आपके *{{2}}* की आगामी EMI के लिए एक छोटी-सी याद दिलाने वाली सूचना है।

📋 *EMI विवरण:*
📦 प्रोडक्ट: {{2}}
💰 EMI राशि: ₹{{3}}
📅 भुगतान की अंतिम तारीख: {{4}}

कृपया निर्धारित तारीख तक अपनी EMI का भुगतान कर दें, ताकि आपका भुगतान रिकॉर्ड समय पर अपडेट रहे।

✅ यदि आपने भुगतान कर दिया है, तो कृपया इस संदेश को अनदेखा करें।

किसी भी जानकारी या सहायता के लिए हमसे संपर्क कर सकते हैं।

धन्यवाद! 🙏
_{{5}}_
```

## Delivery operations

The operational `EmiReminderDelivery` collection must have its unique compound
index on `shop_id`, `invoice_id`, `due_date` before scheduling on multiple server
instances (Mongoose creates it with normal auto-index configuration).
Atomic claims prevent overlapping jobs from sending the same installment twice.
Explicit provider rejections retry at most three attempts within the lead window.
Ambiguous transport outcomes or a process crash leave a SENDING claim for manual
provider-log review; they are not automatically resent. Check ReminderLog and
MessageLog for dispatch details. No live provider messages are sent by unit tests.
