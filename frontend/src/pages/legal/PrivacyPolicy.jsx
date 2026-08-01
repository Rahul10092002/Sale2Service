import React from "react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 text-gray-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-600">
              Legal
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Privacy Policy
            </h1>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Back to Home
          </Link>
        </div>

        <p className="mb-6 text-sm text-gray-500">
          Last Updated: August 1, 2026
        </p>

        <p className="mb-6 leading-7">
          This Privacy Policy describes how we collect, use, and protect
          information when you use our services, including our website,
          WhatsApp-based communication tools, and related applications.
        </p>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            1. Information We Collect
          </h2>
          <p className="leading-7">
            We may collect the following types of information:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-7">
            <li>
              Contact information such as name, phone number, and email address
            </li>
            <li>
              Messages and communication content shared through WhatsApp or
              other messaging platforms
            </li>
            <li>
              Business or service-related information you provide (such as
              property preferences, warranty details, or service inquiries)
            </li>
            <li>
              Technical information such as device type, IP address, and usage
              data collected automatically when you interact with our services
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            2. How We Use Your Information
          </h2>
          <p className="leading-7">We use the information we collect to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-7">
            <li>Respond to your inquiries and provide requested services</li>
            <li>
              Send updates, notifications, and service-related messages via
              WhatsApp, email, or SMS
            </li>
            <li>Improve our products, services, and customer experience</li>
            <li>Maintain records for business, support, and legal purposes</li>
            <li>Comply with applicable laws and regulations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            3. WhatsApp and Messaging Services
          </h2>
          <p className="leading-7">
            If you interact with us through WhatsApp or similar messaging
            platforms, your messages and phone number may be processed by
            third-party service providers (such as Meta Platforms, Inc. or
            Twilio Inc.) that facilitate this communication. These providers
            have their own privacy policies governing how they handle your data.
            We only use this communication channel to respond to your inquiries
            and provide relevant updates, and we do not sell your information to
            third parties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            4. Data Sharing
          </h2>
          <p className="leading-7">
            We do not sell or rent your personal information. We may share
            information with:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-7">
            <li>
              Third-party service providers who help us operate our services
              (such as messaging platforms, hosting providers, or payment
              processors)
            </li>
            <li>Legal or regulatory authorities, when required by law</li>
            <li>
              Business partners, only with your consent or as necessary to
              provide a requested service
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            5. Data Storage and Security
          </h2>
          <p className="leading-7">
            We take reasonable measures to protect your information from
            unauthorized access, alteration, or disclosure. However, no method
            of electronic transmission or storage is completely secure, and we
            cannot guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            6. Data Retention
          </h2>
          <p className="leading-7">
            We retain your information only for as long as necessary to fulfill
            the purposes described in this policy, or as required by applicable
            law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            7. Your Rights
          </h2>
          <p className="leading-7">You may contact us at any time to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-7">
            <li>
              Request access to the personal information we hold about you
            </li>
            <li>Request correction or deletion of your information</li>
            <li>Opt out of receiving further communications from us</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            8. Children's Privacy
          </h2>
          <p className="leading-7">
            Our services are not directed at individuals under the age of 18,
            and we do not knowingly collect personal information from children.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            9. Changes to This Policy
          </h2>
          <p className="leading-7">
            We may update this Privacy Policy from time to time. Any changes
            will be posted on this page with an updated revision date.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            10. Contact Us
          </h2>
          <p className="leading-7">
            If you have any questions or concerns about this Privacy Policy or
            how your information is handled, please contact us at:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-7">
            <li>Email: rahulpatidar2132@gmail.com</li>
            <li>Phone: 8085035032</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
