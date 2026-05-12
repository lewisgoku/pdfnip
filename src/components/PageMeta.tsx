import { Helmet } from 'react-helmet-async'

interface PageMetaProps {
  title: string
  description: string
  path: string
}

export default function PageMeta({ title, description, path }: PageMetaProps) {
  const canonical = `https://pdfnip.com${path}`
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
    </Helmet>
  )
}
