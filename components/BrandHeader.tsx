import Image from "next/image";

/**
 * Small horizontal brand lockup for the light auth screens, mirroring
 * Coraline's reference: the official app-icon figure (white figure + lime
 * ball on Electric Blue, used as-is) followed by the « plaiyo » wordmark
 * typeset in ink navy. The dot over the i is Plaiyo lime, as in the
 * official lockup: the i is rendered dotless (ı) with a lime dot above it.
 */
export default function BrandHeader() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <Image
        src="/app-icon.png"
        alt=""
        width={512}
        height={512}
        className="h-10 w-10 rounded-xl"
        priority
      />
      <span className="text-[28px] font-black leading-none tracking-tight text-ink">
        pla
        <span className="relative inline-block">
          ı
          <span
            aria-hidden
            className="absolute left-1/2 top-[0.1em] h-[0.19em] w-[0.19em] -translate-x-1/2 rounded-full bg-lime"
          />
        </span>
        yo
      </span>
    </div>
  );
}
