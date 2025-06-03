import Image from 'next/image'

export default function SeoOptimizedImage() {
  return (
    <div>
      <Image
        src="/Estatias.png"
        alt="Description of the image for SEO and accessibility"
        width={600}       // adjust to your design
        height={400}      // maintain aspect ratio
        priority={true}   // optional, loads image eagerly (good for above-the-fold images)
      />
    </div>
  )
}
