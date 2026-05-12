import PageMeta from '../components/PageMeta'

export default function PrivacyPolicy() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | Privacy Policy"
        description="PDFNip processes your files entirely in your browser. Your files are never uploaded to any server. Read our full privacy policy."
        path="/privacy"
      />
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-10">Last updated: May 2026</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">The short version</h2>
        <p className="text-gray-400 leading-relaxed">
          PDFNip processes your PDF files entirely in your browser — your files are never uploaded
          to any server. To keep the service free, we display ads served by Google AdSense.
          Google may use cookies to show you relevant ads based on your browsing activity.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">What we don't collect</h2>
        <ul className="text-gray-400 leading-relaxed space-y-2 list-disc list-inside">
          <li>Your files or their contents — all processing happens locally in your browser</li>
          <li>Personal information</li>
          <li>Account data (there are no accounts)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Advertising (Google AdSense)</h2>
        <p className="text-gray-400 leading-relaxed mb-3">
          PDFNip uses Google AdSense to display advertisements. Google and its partners may use
          cookies and similar technologies to show personalised ads based on your visits to this
          and other websites.
        </p>
        <p className="text-gray-400 leading-relaxed mb-3">
          You can opt out of personalised advertising at any time by visiting{' '}
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Google's Ad Settings
          </a>{' '}
          or by using the{' '}
          <a
            href="https://optout.networkadvertising.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            NAI opt-out tool
          </a>
          .
        </p>
        <p className="text-gray-400 leading-relaxed">
          For more information on how Google uses data when you use partner sites, see{' '}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            "How Google uses information from sites or apps that use our services"
          </a>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Cookies</h2>
        <p className="text-gray-400 leading-relaxed">
          PDFNip itself does not set any cookies. Google AdSense may set cookies on your device
          to serve and measure ads. You can manage or disable cookies through your browser settings
          at any time.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Hosting</h2>
        <p className="text-gray-400 leading-relaxed">
          PDFNip is hosted on Vercel. Vercel may collect standard server access logs (IP address,
          browser type, pages visited) as part of their infrastructure. These logs are not shared
          with us and are governed by{' '}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Vercel's Privacy Policy
          </a>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Changes</h2>
        <p className="text-gray-400 leading-relaxed">
          If this policy changes, the updated date at the top of this page will reflect that.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
        <p className="text-gray-400 leading-relaxed">
          Questions? Reach us at{' '}
          <a href="mailto:hello@pdfnip.com" className="text-primary hover:underline">
            hello@pdfnip.com
          </a>
          .
        </p>
      </section>
    </div>
  )
}
