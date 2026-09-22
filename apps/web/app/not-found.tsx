import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="text-center">
        <div className="font-pixel text-[64px] text-gold text-shadow-px">404</div>
        <p className="text-dust">This tunnel caved in. Nothing to mine here.</p>
        <Link href="/" className={buttonClass("gold", "md", "mt-4")}>
          Back to the surface
        </Link>
      </div>
    </div>
  );
}
