import PageMeta from '../components/PageMeta'

export default function Terms() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="Terms of Use | PDFNip"
        description="Read the PDFNip terms of use. Free to use for personal and commercial purposes. No warranty provided."
        path="/terms"
      />
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Use</h1>
      <p className="text-gray-500 text-sm mb-10">Last updated: May 2026</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Acceptance</h2>
        <p className="text-gray-400 leading-relaxed">
          By using PDFNip you agree to these terms. If you don't agree, please don't use the
          service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Use of the service</h2>
        <p className="text-gray-400 leading-relaxed">
          PDFNip is a free, browser-based PDF utility. You may use it for personal or commercial
          purposes. You agree not to use PDFNip to process files you do not have the right to
          modify, or for any unlawful purpose.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">No warranty</h2>
        <p className="text-gray-400 leading-relaxed">
          PDFNip is provided "as is" without warranty of any kind. We make no guarantees about
          uptime, accuracy, or fitness for a particular purpose. Use at your own risk and always
          keep backups of important files.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Limitation of liability</h2>
        <p className="text-gray-400 leading-relaxed">
          To the fullest extent permitted by law, PDFNip and its operators shall not be liable
          for any direct, indirect, incidental, or consequential damages arising from your use of
          the service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Intellectual property</h2>
        <p className="text-gray-400 leading-relaxed">
          The PDFNip name, logo, and interface are owned by their respective creators. The
          underlying open-source libraries used are subject to their own licences.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Changes</h2>
        <p className="text-gray-400 leading-relaxed">
          We may update these terms at any time. Continued use of PDFNip after changes constitutes
          acceptance of the revised terms.
        </p>
      </section>
    </div>
  )
}
