import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/public-navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Merchant Setup Guide",
  description:
    "Step-by-step guide to setting up your OshiCart store, taking orders, getting paid, and using every feature in the app.",
  alternates: { canonical: "/guide" },
};

/** One numbered instruction inside a section. */
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-acacia text-xs font-black text-white">
        {n}
      </span>
      <span className="leading-7 text-walnut-2">{children}</span>
    </li>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="mt-4 space-y-3">{children}</ol>;
}

function Section({
  n,
  title,
  lead,
  children,
  tier,
}: {
  n: number;
  title: string;
  lead?: string;
  children: React.ReactNode;
  tier?: string;
}) {
  return (
    <section id={`step-${n}`} className="scroll-mt-20">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-xl font-black tracking-tight text-terracotta">
          {n}. {title}
        </h2>
        {tier && (
          <span className="rounded-full bg-acacia-soft px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-acacia">
            {tier}
          </span>
        )}
      </div>
      {lead && <p className="mt-3 leading-relaxed text-walnut-2">{lead}</p>}
      {children}
    </section>
  );
}

/** A short "why this matters" aside. */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-border-warm bg-sand px-4 py-3 text-sm leading-6 text-walnut-2">
      {children}
    </p>
  );
}

const CONTENTS = [
  "Welcome",
  "Create your store",
  "Add your first product",
  "Payment methods",
  "Delivery and collection",
  "Share your store",
  "Use OshiCart as an app",
  "Handling orders",
  "Invoices",
  "Your customers",
  "WhatsApp broadcasts",
  "Reviews",
  "Coupons and discounts",
  "Adding many products at once",
  "Abandoned checkout recovery",
  "Statements for your books",
  "Analytics",
  "Your plan and limits",
  "Getting help",
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <header className="border-b border-border-warm pb-8">
          <h1 className="font-black text-3xl sm:text-4xl tracking-tight text-walnut">
            OshiCart Merchant Guide
          </h1>
          <p className="mt-3 text-lg text-walnut-2">
            Everything in the app, step by step — from opening your store to
            pulling a statement for your accountant.
          </p>
          <a
            href="/oshicart-merchant-guide.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-terracotta px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-terracotta/20 transition-colors hover:bg-[#234B86]"
          >
            Download PDF
          </a>
        </header>

        <nav className="mt-8 rounded-2xl border border-border-warm bg-sand p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-walnut-2/70">
            What&apos;s in this guide
          </p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {CONTENTS.map((item, i) => (
              <li key={item}>
                <a
                  href={`#step-${i + 1}`}
                  className="font-semibold text-terracotta hover:underline"
                >
                  {i + 1}. {item}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-12">
          <Section
            n={1}
            title="Welcome"
            lead="OshiCart is a Namibian platform for selling online. You get a store link customers can open on their phone, orders arrive on WhatsApp, and customers pay you directly — OshiCart takes no commission on your sales."
          >
            <Note>
              You do not need a website, a domain, or a card machine. Your store
              link <em>is</em> your website.
            </Note>
          </Section>

          <Section
            n={2}
            title="Create your store"
            lead="The setup wizard takes about two minutes."
          >
            <Steps>
              <Step n={1}>
                Sign up, then open the setup wizard. It starts automatically the
                first time.
              </Step>
              <Step n={2}>
                Enter your <strong className="text-walnut">store name</strong> —
                this is what customers see, so use your real trading name.
              </Step>
              <Step n={3}>
                Enter your{" "}
                <strong className="text-walnut">WhatsApp number</strong>. Orders
                and alerts come to this number, so use the phone you actually
                carry.
              </Step>
              <Step n={4}>
                Pick your <strong className="text-walnut">region and town</strong>
                . Customers filter by town when browsing, so this decides who
                finds you.
              </Step>
              <Step n={5}>
                Choose your <strong className="text-walnut">industry</strong>. It
                sets your store&apos;s layout and category icons — a bakery looks
                different from a hardware shop.
              </Step>
              <Step n={6}>Save. Your store link is created immediately.</Step>
            </Steps>
          </Section>

          <Section
            n={3}
            title="Add your first product"
            lead="This is the step most new stores skip — and it is the one that decides whether anyone ever finds you."
          >
            <Steps>
              <Step n={1}>
                Go to <strong className="text-walnut">Products → Add product</strong>.
              </Step>
              <Step n={2}>
                Give it a clear name and a price. Prices are in Namibian dollars.
              </Step>
              <Step n={3}>
                Add a photo. Natural daylight, plain background, product filling
                the frame. Photos sell more than words do.
              </Step>
              <Step n={4}>
                If it comes in sizes or colours, add{" "}
                <strong className="text-walnut">variants</strong> so customers
                choose at checkout instead of messaging you.
              </Step>
              <Step n={5}>
                Turn on <strong className="text-walnut">stock tracking</strong> if
                you want the store to stop selling when you run out.
              </Step>
              <Step n={6}>Save, then open your store link and check it looks right.</Step>
            </Steps>
            <Note>
              <strong className="text-walnut">Your store will not appear in
              Browse Stores until it has at least one product.</strong> An empty
              shop is hidden on purpose — sending customers to a store with
              nothing to buy loses them for good.
            </Note>
          </Section>

          <Section
            n={4}
            title="Payment methods"
            lead="Customers pay you directly. Choose the methods you actually use."
          >
            <Steps>
              <Step n={1}>
                Go to <strong className="text-walnut">Settings → Payments</strong>.
              </Step>
              <Step n={2}>
                Tick the methods you accept: bank transfer (EFT), cash on
                delivery or collection, MTC Maris, eWallet, FNB Pay2Cell, or
                PayToday.
              </Step>
              <Step n={3}>
                <strong className="text-walnut">
                  Enter the account or number for every method you tick.
                </strong>{" "}
                For EFT that means the bank <em>and</em> the account number.
              </Step>
              <Step n={4}>Save.</Step>
            </Steps>
            <Note>
              A method with no details cannot be paid, so OshiCart hides it at
              checkout and will not let you save it. If none of your methods are
              complete, your checkout closes and buyers are told to message you
              instead — better than taking an order nobody can pay.
            </Note>
          </Section>

          <Section
            n={5}
            title="Delivery and collection"
            lead="Decide how orders reach your customers."
          >
            <Steps>
              <Step n={1}>
                Go to <strong className="text-walnut">Settings → Delivery</strong>.
              </Step>
              <Step n={2}>
                Turn on <strong className="text-walnut">collection</strong> if
                customers can fetch orders from you, and add your pickup address.
              </Step>
              <Step n={3}>
                Turn on <strong className="text-walnut">your own delivery</strong>{" "}
                and set a flat fee if you deliver yourself.
              </Step>
              <Step n={4}>
                Turn on <strong className="text-walnut">Yango</strong> or{" "}
                <strong className="text-walnut">inDrive</strong> if you want
                customers to order a courier. The buyer pays the driver directly.
              </Step>
              <Step n={5}>
                Set delivery days and times if you only deliver on certain days.
              </Step>
            </Steps>
            <Note>
              Yango and inDrive only appear for stores in{" "}
              <strong className="text-walnut">Windhoek, Swakopmund and Walvis
              Bay</strong>, because that is where they operate. If your town
              isn&apos;t covered, use your own delivery or collection.
            </Note>
          </Section>

          <Section
            n={6}
            title="Share your store"
            lead="Your store link is your shop's address on the internet. Your QR code is a picture of that link."
          >
            <Steps>
              <Step n={1}>
                Open <strong className="text-walnut">Share store</strong> in the
                menu.
              </Step>
              <Step n={2}>
                Tap <strong className="text-walnut">Copy link</strong> and paste it
                into your WhatsApp Status, your bio, Facebook, Instagram, or TikTok.
              </Step>
              <Step n={3}>
                Tap <strong className="text-walnut">Share on WhatsApp</strong> to
                send it straight to a customer or a group.
              </Step>
              <Step n={4}>
                Tap the <strong className="text-walnut">QR code</strong> and
                download it. Print it on flyers, packaging, your shop door, or
                your market table — customers point their camera at it and your
                shop opens.
              </Step>
            </Steps>
            <Note>
              There is a ready-made message on the Share page you can copy if you
              are not sure what to write.
            </Note>
          </Section>

          <Section
            n={7}
            title="Use OshiCart as an app"
            lead="You can put OshiCart on your phone's home screen. No Play Store or App Store needed."
          >
            <Steps>
              <Step n={1}>
                <strong className="text-walnut">On Android:</strong> open your
                dashboard in Chrome, tap the ⋮ menu, then{" "}
                <strong className="text-walnut">Install app</strong>.
              </Step>
              <Step n={2}>
                <strong className="text-walnut">On iPhone:</strong> open your
                dashboard in Safari (this does not work in Chrome on iPhone), tap
                the Share button, then{" "}
                <strong className="text-walnut">Add to Home Screen</strong>.
              </Step>
              <Step n={3}>
                It installs as <strong className="text-walnut">OshiCart
                Dashboard</strong> and opens straight on your orders.
              </Step>
            </Steps>
            <Note>
              Your customers can do the same from any store link — they get an
              OshiCart app that opens the store directory. Full instructions are
              at <Link href="/app" className="font-bold text-terracotta hover:underline">oshicart.com/app</Link>.
            </Note>
          </Section>

          <Section
            n={8}
            title="Handling orders"
            lead="Every order moves through the same few steps, and the customer is told automatically at each one."
          >
            <Steps>
              <Step n={1}>
                A new order arrives on WhatsApp and appears under{" "}
                <strong className="text-walnut">Orders</strong>.
              </Step>
              <Step n={2}>
                <strong className="text-walnut">Awaiting payment</strong> — the
                customer has ordered but not paid yet.
              </Step>
              <Step n={3}>
                Tap <strong className="text-walnut">Confirm</strong> once you have
                the money or you are happy to go ahead.
              </Step>
              <Step n={4}>
                Tap <strong className="text-walnut">Completed</strong> when the
                customer has it. That message carries their{" "}
                <strong className="text-walnut">invoice</strong>.
              </Step>
              <Step n={5}>
                Use <strong className="text-walnut">Cancel</strong> if the order
                falls through. Cancelled orders do not count against your monthly
                order limit.
              </Step>
            </Steps>
            <Note>
              Two taps, and the customer is told at each step — three messages in
              all: ordered, confirmed, done. Only Cancel asks you to confirm,
              because it puts the stock back and tells the customer the order is
              off.
            </Note>
            <Note>
              Need a <strong className="text-walnut">Ready</strong> step as well?
              Takeaways and shops where &quot;your order is ready for
              collection&quot; is a real moment can turn the full flow back on
              under <strong className="text-walnut">Settings</strong> — untick
              &quot;Use the simple order flow&quot;.
            </Note>
            <Note>
              Not paid? OshiCart sends two reminders, at 6 hours and the next
              morning, then cancels the order after about two days and puts the
              stock back. The moment you record a payment — or the customer
              uploads proof — the reminders stop.
            </Note>
          </Section>

          <Section
            n={9}
            title="Appointments and bookings"
            lead="For salons, barbers, and anyone who works by appointment: customers book a time from a calendar, and each time slot takes one booking."
          >
            <Steps>
              <Step n={1}>
                Set your hours: open{" "}
                <strong className="text-walnut">Settings</strong> and find{" "}
                <strong className="text-walnut">Availability</strong>. Tick your
                working days, then use{" "}
                <strong className="text-walnut">Generate</strong> — opening
                time, closing time, and how long a session lasts. 09:00 to
                17:00 every hour gives you eight sessions, without typing each
                one.
              </Step>
              <Step n={2}>
                When you add or edit a service, choose where it happens — at
                your place, at the client&apos;s place, or online. That is what
                makes checkout ask for a booking instead of a delivery.
              </Step>
              <Step n={3}>
                Customers pick from a real calendar: days you are closed are
                greyed out, full days are struck through, and times already
                booked cannot be chosen. Two customers can never book the same
                slot — OshiCart refuses the second one automatically.
              </Step>
              <Step n={4}>
                See who is coming: open{" "}
                <strong className="text-walnut">Bookings</strong> in your
                dashboard. Each day shows how many bookings it has; tap a day
                to see the names and times.
              </Step>
              <Step n={5}>
                Taking a day off? Tap the day and{" "}
                <strong className="text-walnut">Block whole day</strong>. Need
                lunch free or a slot for walk-ins? Hold back single times
                instead. A time that is already booked cannot be blocked —
                cancel that order first.
              </Step>
            </Steps>
            <Note>
              Scheduled deliveries appear on the same calendar, so your whole
              day — appointments and drop-offs — is in one place.
            </Note>
          </Section>

          <Section
            n={10}
            title="Selling online or digital services"
            lead="Design, marketing, consulting, lessons — work with nothing to deliver and nobody to visit."
          >
            <Steps>
              <Step n={1}>
                Add it like any other item, and where it asks{" "}
                <strong className="text-walnut">where does this happen</strong>,
                choose <strong className="text-walnut">Online</strong>.
              </Step>
              <Step n={2}>
                Checkout then changes for that customer: no delivery, no
                collection, no courier, and no address. They only give their
                name and WhatsApp number.
              </Step>
              <Step n={3}>
                If you work by appointment — a coaching call, a lesson — set
                your times under{" "}
                <strong className="text-walnut">Settings → Availability</strong>{" "}
                and the customer picks a slot.
              </Step>
              <Step n={4}>
                If your work is a project rather than an appointment — a logo,
                a website, a campaign — leave availability off. Checkout then
                tells the customer you will contact them on WhatsApp to get
                started, which is what really happens.
              </Step>
            </Steps>
            <Note>
              A store can mix them freely. A salon can sell in-chair haircuts,
              call-outs to a client&apos;s home, and online consultations side by
              side — each item carries its own setting.
            </Note>
          </Section>

          <Section
            n={11}
            title="Hiring things out (rentals)"
            lead="Tents, tools, sound gear, dresses — anything customers borrow and bring back."
          >
            <Steps>
              <Step n={1}>
                Add the item and choose{" "}
                <strong className="text-walnut">For hire</strong>. Say how many
                you own, and the shortest and longest hire you allow.
              </Step>
              <Step n={2}>
                Choose how it is charged:{" "}
                <strong className="text-walnut">per day</strong> (tools, tents,
                dresses — first and last day both count: 3 days at N$150 is
                N$450) or <strong className="text-walnut">per night</strong>{" "}
                (rooms and accommodation — check-in to check-out, and the
                check-out day is free, so a new guest can arrive that same
                day).
              </Step>
              <Step n={3}>
                OshiCart counts what is already out. If you own two tents and
                both are hired for those dates, a third customer is told{" "}
                <strong className="text-walnut">
                  &quot;only 0 available for those dates&quot;
                </strong>{" "}
                and cannot book. Two people ordering at the same second cannot
                both take the last one.
              </Step>
              <Step n={4}>
                Need time to clean or check the item between hires? Set{" "}
                <strong className="text-walnut">days between hires</strong> and
                OshiCart keeps that gap free automatically. Leave it at 0 and
                back-to-back hires are allowed — a hire ending Monday and one
                starting Tuesday never clash, and a cancelled hire frees its
                dates immediately.
              </Step>
              <Step n={5}>
                Ask for a <strong className="text-walnut">refundable
                deposit</strong> if you want security on the item. It is added
                to what the customer pays — shown as its own line at checkout
                and on the invoice, never taxed — and you hand it back when the
                item returns in good shape.
              </Step>
              <Step n={6}>
                Need the customer to bring something — a driver&apos;s licence,
                proof of address? Type it in{" "}
                <strong className="text-walnut">Documents the customer must
                bring</strong> and it appears on the product, at checkout, and
                in the WhatsApp order, so nobody arrives empty-handed.
              </Step>
              <Step n={7}>
                On <strong className="text-walnut">Orders</strong>, each hired
                line shows its dates —{" "}
                <strong className="text-walnut">Hire · 3 days · 20 – 22 Aug</strong>{" "}
                — so you always know what is out and when it is due back.
              </Step>
              <Step n={8}>
                When it comes back, tap{" "}
                <strong className="text-walnut">Record return</strong> on the
                order: note which unit went out (registration, asset tag, room
                name), the date, and its condition. If it is late, OshiCart
                counts the days and suggests the late fee you set — hold it
                back by refunding a smaller deposit, and the credit note shows
                it automatically.
              </Step>
            </Steps>
            <Note>
              Hiring never touches your stock number. &quot;How many you
              own&quot; is how many can be out at the same time, not how many
              are left to sell.
            </Note>
          </Section>

          <Section
            n={12}
            title="Invoices"
            lead="Every order has a proper invoice you can print or send."
          >
            <Steps>
              <Step n={1}>
                Open the order and tap{" "}
                <strong className="text-walnut">View invoice</strong>.
              </Step>
              <Step n={2}>
                Tap <strong className="text-walnut">Print or save as PDF</strong> to
                give the customer a copy.
              </Step>
            </Steps>
            <Note>
              If you enter a VAT number in Settings, invoices become proper{" "}
              <strong className="text-walnut">tax invoices</strong> showing VAT at
              15% and your VAT number. Leave it blank and they stay plain
              invoices.
            </Note>
          </Section>

          <Section
            n={13}
            title="Refunds and credit notes"
            lead="When you give money back, record it so your books and your bank still agree."
          >
            <Steps>
              <Step n={1}>
                Open <strong className="text-walnut">Orders</strong> and find the
                order. <strong className="text-walnut">Record refund</strong>{" "}
                appears next to Record payment once the customer has paid
                something — you cannot refund money you never received.
              </Step>
              <Step n={2}>
                Enter the amount, the date the money actually left your account,
                and how you sent it back. Refund part of an order or all of it.
              </Step>
              <Step n={3}>
                A <strong className="text-walnut">credit note</strong> is created
                automatically and appears on the order. Open it to print or save
                it as a PDF for the customer.
              </Step>
              <Step n={4}>
                Your statement updates on its own: the refund shows under{" "}
                <strong className="text-walnut">Refunded</strong>, and the order
                counts as owing again, so Outstanding stays honest.
              </Step>
            </Steps>
            <Note>
              A credit note is the document that cancels part of an invoice. If
              you are registered for VAT you may not simply delete an invoice
              you have issued — you issue a credit note against it, and the VAT
              is reversed on it too. OshiCart works this out for you.
            </Note>
          </Section>

          <Section
            n={14}
            title="Your customers"
            lead="Everyone who orders from you is saved automatically."
          >
            <Steps>
              <Step n={1}>
                Open <strong className="text-walnut">Customers</strong>.
              </Step>
              <Step n={2}>
                See how many times each person has ordered and what they have
                spent.
              </Step>
              <Step n={3}>
                Tap a customer to message them on WhatsApp directly.
              </Step>
            </Steps>
            <Note>
              Your customer list is yours alone. It is never shared with other
              merchants.
            </Note>
          </Section>

          <Section
            n={15}
            title="WhatsApp broadcasts"
            lead="Send an offer or an update to your customers from your own WhatsApp."
          >
            <Steps>
              <Step n={1}>
                Open <strong className="text-walnut">Broadcast</strong>.
              </Step>
              <Step n={2}>
                Choose who to send to: everyone, repeat customers, or recent
                customers.
              </Step>
              <Step n={3}>
                Pick one of the sample messages or write your own. Sample messages
                already include your store link.
              </Step>
              <Step n={4}>
                Send. Messages go from{" "}
                <strong className="text-walnut">your own WhatsApp number</strong>,
                so customers recognise you.
              </Step>
            </Steps>
          </Section>

          <Section
            n={16}
            title="Reviews"
            lead="Customers who actually bought from you can leave a rating."
          >
            <Steps>
              <Step n={1}>
                Reviews appear on your storefront under your products.
              </Step>
              <Step n={2}>
                Open <strong className="text-walnut">Reviews</strong> to read them.
              </Step>
            </Steps>
            <Note>
              Only verified buyers can review, so a rating on OshiCart means
              someone really shopped with you. That is worth more to a new
              customer than anything you can write about yourself.
            </Note>
          </Section>

          <Section
            n={17}
            title="Coupons and discounts"
            lead="Run a promotion with a code customers enter at checkout."
          >
            <Steps>
              <Step n={1}>
                Open <strong className="text-walnut">Coupons</strong>.
              </Step>
              <Step n={2}>
                Pick one of the four{" "}
                <strong className="text-walnut">starter templates</strong> —
                welcome offer, spend-and-save, launch promo, or delivery-on-us —
                and the form fills in for you.
              </Step>
              <Step n={3}>
                Change anything you want: the code, the amount, the minimum
                order, how many times it can be used, and when it expires.
              </Step>
              <Step n={4}>Save. Nothing goes live until you press save.</Step>
              <Step n={5}>
                Share the code in a broadcast, on your Status, or on a flyer.
              </Step>
            </Steps>
          </Section>

          <Section
            n={18}
            title="Adding many products at once"
            lead="If you have a long product list, you do not have to add them one by one."
          >
            <Steps>
              <Step n={1}>
                Go to <strong className="text-walnut">Products → Import</strong>.
              </Step>
              <Step n={2}>
                Download the template spreadsheet so your columns are right.
              </Step>
              <Step n={3}>
                Fill in your products, save as CSV, and upload it.
              </Step>
              <Step n={4}>
                Check the preview, then confirm. Anything with a problem is listed
                so you can fix it.
              </Step>
            </Steps>
          </Section>

          <Section
            n={19}
            title="Abandoned checkout recovery"
            tier="Oshi-Automate and Oshi-Pro"
            lead="When a customer fills in checkout but does not finish, OshiCart can send them a WhatsApp reminder."
          >
            <Steps>
              <Step n={1}>
                Go to <strong className="text-walnut">Settings</strong> and turn on
                cart recovery.
              </Step>
              <Step n={2}>
                Reminders go out automatically. You do nothing else.
              </Step>
            </Steps>
          </Section>

          <Section
            n={20}
            title="Statements for your books"
            tier="Oshi-Automate and Oshi-Pro"
            lead="A monthly record of every order, for your accountant or your VAT return."
          >
            <Steps>
              <Step n={1}>
                Open <strong className="text-walnut">Statements</strong>.
              </Step>
              <Step n={2}>
                Choose the month you need. On{" "}
                <strong className="text-walnut">Oshi-Pro</strong> you can also
                pick <strong className="text-walnut">Last 12 months</strong> to
                get a whole year in one document for your accountant.
              </Step>
              <Step n={3}>
                You get totals for sales, VAT and delivery, a breakdown by order
                status and payment method, and every order listed.
              </Step>
              <Step n={4}>
                Check <strong className="text-walnut">Received</strong> against
                your bank. It shows what actually came in that month, what is
                still outstanding, and how many orders remain unpaid.
              </Step>
              <Step n={5}>
                Tap <strong className="text-walnut">Print or save as PDF</strong>{" "}
                for a paper copy, or{" "}
                <strong className="text-walnut">Download spreadsheet</strong> to
                send to a bookkeeper.
              </Step>
            </Steps>
            <Note>
              Received counts payments dated in that month, whichever month the
              order was placed — that is the figure to compare with your bank.
              It is only as complete as your record-keeping, so mark payments as
              they come in.
            </Note>
          </Section>

          <Section
            n={21}
            title="Analytics"
            lead="See how your store is doing."
          >
            <Steps>
              <Step n={1}>
                Open <strong className="text-walnut">Analytics</strong>.
              </Step>
              <Step n={2}>
                See store visits, orders, revenue, and which products people look
                at most.
              </Step>
            </Steps>
          </Section>

          <Section
            n={22}
            title="Your plan and limits"
            lead="Every plan includes a number of products and a number of orders per month."
          >
            <Steps>
              <Step n={1}>
                Open <strong className="text-walnut">Subscription</strong> to see
                your plan and what you have used.
              </Step>
              <Step n={2}>
                Your order allowance resets every month on your billing date —
                the page tells you exactly when.
              </Step>
              <Step n={3}>
                Cancelled orders do not count. Only real orders use your
                allowance.
              </Step>
              <Step n={4}>
                Upgrade any time if you need more products, more orders, or the
                higher-tier features.
              </Step>
            </Steps>
          </Section>

          <Section
            n={23}
            title="Getting help"
            lead="If something is not working, talk to a real person."
          >
            <Steps>
              <Step n={1}>
                WhatsApp support on{" "}
                <strong className="text-walnut">+264 81 627 4823</strong>.
              </Step>
              <Step n={2}>
                Call <strong className="text-walnut">+264 81 238 4424</strong>.
              </Step>
              <Step n={3}>
                Email{" "}
                <strong className="text-walnut">info@octovianexus.com</strong>.
              </Step>
            </Steps>
            <p className="mt-4 leading-relaxed text-walnut-2">
              See also the{" "}
              <Link href="/help" className="font-bold text-terracotta hover:underline">
                help page
              </Link>
              , the{" "}
              <Link href="/app" className="font-bold text-terracotta hover:underline">
                app install guide
              </Link>
              , and the{" "}
              <Link href="/prohibited-products" className="font-bold text-terracotta hover:underline">
                selling rules
              </Link>
              .
            </p>
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
