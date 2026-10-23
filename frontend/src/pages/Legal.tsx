import { Link } from "react-router-dom";
import { PANEL_STYLE } from "../styles/controls";
import { AmstarLogo } from "../components/AmstarLogo";

/**
 * Privacy policy and terms, on one layout.
 *
 * Reachable without an account on purpose: a customer
 * asking what we hold, and
 * Intuit's reviewer checking that the policy exists, both arrive signed out.
 */

const LegalPage: React.FC<{
  title: string;
  updated: string;
  children: React.ReactNode;
}> = ({ title, updated, children }) => (
  <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <Link to="/login" className="group inline-block">
      <AmstarLogo size="page" />
    </Link>
    <div className="mt-7 h-0.5 w-24 bg-amstar-red" />
    <h1 className="mt-6 font-cond text-3xl uppercase tracking-wide text-amstar-ink">
      {title}
    </h1>
    <p className="mt-1 text-sm text-amstar-ink-faint">Last updated {updated}</p>
    <div className={`mt-8 ${PANEL_STYLE} p-7 sm:p-9 legal-prose`}>
      {children}
    </div>
    <p className="mt-6 text-sm text-amstar-ink-faint">
      <Link
        to="/login"
        className="underline underline-offset-4 hover:text-amstar-ink"
      >
        Back to sign in
      </Link>
    </p>
  </div>
);

const S: React.FC<{ h: string; children: React.ReactNode }> = ({
  h,
  children,
}) => (
  <section className="mt-7 first:mt-0">
    <h2 className="font-cond text-lg uppercase tracking-wide text-amstar-ink">
      {h}
    </h2>
    <div className="mt-2 space-y-3 text-sm leading-relaxed text-amstar-ink-dim">
      {children}
    </div>
  </section>
);

export const PrivacyPolicy = () => (
  <LegalPage title="Privacy Policy" updated="10/23/2026">
    <S h="What this is">
      <p>
        AM Star Transmissions ("we", "us") runs this application to manage
        vehicle repairs. It is a tool staff use to record work on customer
        vehicles. This policy explains what it stores, who it is shared with,
        and what you can ask us to do about it.
      </p>
    </S>

    <S h="Information we collect about customers">
      <ul>
        <li>
          <strong>Contact details</strong> - your name, phone number and email
          address where you give us one.
        </li>
        <li>
          <strong>Vehicle details</strong> - year, make, model, VIN, license
          plate and issuing state, and odometer reading.
        </li>
        <li>
          <strong>Repair records</strong> - the services performed, who
          performed them, dates, notes, taken by staff, parts used, and prices.
        </li>
      </ul>
      <p>
        We collect this from you when you drop a vehicle off, or from the
        vehicle itself.{" "}
        <strong>
          We do not handle payment card details in this application.
        </strong>
      </p>
    </S>

    <S h="Information we collect about staff">
      <p>
        Staff accounts store an email address, a display name, the account's
        role, and the password only as a one-way hash - never in a form anyone
        can read, including us. We also keep a log of changes made to repair
        tickets, which records which account made each change and when.
      </p>
    </S>

    <S h="How we use it">
      <p>
        Only to perform and bill the repair, to contact you about your vehicle,
        and to keep the business and tax records we are required to keep.
      </p>
      <p>
        <strong>
          We do not sell personal information, and we do not use it for
          advertising or share it for anyone else's marketing.
        </strong>
      </p>
    </S>

    <S h="Who we share it with">
      <p>We share only what each service needs to do this job:</p>
      <ul>
        <li>
          <strong>Intuit (QuickBooks Online)</strong> - when we issue an
          invoice, your name, phone number, email address and the invoice line
          items are set to our QuickBooks company so the invoice can be recorded
          in our accounts. Intuit's handling is governed by Intuit's own privacy
          policy.
        </li>
        <li>
          <strong>Wikipedia</strong> - the VIN is used to find a representative
          photograph of that model of vehicle. No name or contact information is
          sent.
        </li>
        <li>
          <strong>Google</strong> - used to deliver password-reset and
          invitation email to staff. No customer information is sent.
        </li>
        <li>
          <strong>Our hosting provider</strong>, which stores the database on
          our behalf.
        </li>
      </ul>
      <p>
        Beyond these, we share personal information only where the law requires
        it.
      </p>
    </S>

    <S h="How long we keep it">
      <p>
        Repair and invoice records are kept as long as we need them for business
        and tax purposes. Staff accounts are kept while that person works here,
        and access is revoked when they leave.
      </p>
    </S>

    <S h="How we protect it">
      <ul>
        <li>All traffic to the application is encrypted in transit (HTTPS).</li>
        <li>Passwords are stored only as one-way hashes.</li>
        <li>Accounting credentials are encrypted where they are stored.</li>
        <li>
          Access requires an account; accounts are issued only to our staff and
          can be revoked immediately.
        </li>
      </ul>
    </S>

    <S h="Your choices">
      <p>
        You can ask us for a copy of what we hold about you, ask us to correct
        it, or ask us to delete records we are not required by law to keep.
        Contact us using the details below and we will response within a
        reasonable time.
      </p>
    </S>

    <S h="Children">
      <p>
        This application is not directed at children, and we do not knowingly
        collect information form anyone under 13.
      </p>
    </S>

    <S h="Changes to this policy">
      <p>
        If we change how we handle information, we will update this page and the
        date at the top.
      </p>
    </S>

    <S h="Contact us">
      <p>
        AM Star Tranmissions
        <br />
        2608 Garfield Ave.
        <br />
        Silver Spring, MD 20910
        <br />
        301-495-0006
      </p>
    </S>
  </LegalPage>
);

export const Terms = () => (
  <LegalPage title="Terms of Use" updated="10/23/2026">
    <S h="Who may use this">
      <p>
        This application is private software operated by AM Star Transmissions
        for its own staff. Accounts are issued by the owner. You may use it only
        with an account issued to you, and only for shop business.
      </p>
    </S>

    <S h="Your account">
      <p>
        Keep your password to yourself and do not share your account. Tell the
        owner straight away if you think someone else has used it. Every change
        you make to a ticket is recorded against your account.
      </p>
    </S>

    <S h="Customer information">
      <p>
        This application holds customers' personal information and their vehicle
        records. Look at it only when your work requires it, and do not copy it,
        share it, or take it with you when you leave.
      </p>
    </S>

    <S h="QuickBooks">
      <p>
        Connecting this application to QuickBooks Online sends invoices and
        customer information to Intuit on our behalf. Only the owner may connect
        or disconnect that integration. Use of QuickBooks is additionally
        governed by Intuit's own terms.
      </p>
    </S>

    <S h="Availability">
      <p>
        The application is provided as-is for internal use. We do not guarentee
        uninterrupted availability, and we may change or withdraw access at any
        time.
      </p>
    </S>

    <S h="Ending access">
      <p>
        Access ends when you employment ends, or sooner at the owner's
        discretion. Records of work already done remain in the shop's records.
      </p>
    </S>

    <S h="Contact">
      <p>
        AM Star Transmissions
        <br />
        amstartransmission@yahoo.com
      </p>
    </S>
  </LegalPage>
);
