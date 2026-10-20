import Image from "next/image";

/**
 * Horizontal brand lockup for the light auth screens: Coraline's official
 * navy lockup (navy figure + « plaiyo » wordmark + lime ball, transparent
 * background), used as-is, centered at the top of the auth pages.
 */
export default function BrandHeader() {
  return (
    <div className="flex items-center justify-center">
      <Image
        src="/logo-auth.png"
        alt="Plaiyo"
        width={1728}
        height={447}
        className="h-auto w-40"
        priority
      />
    </div>
  );
}
