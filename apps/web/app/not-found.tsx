import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-bedrock px-4">
      <div className="text-center">
        <div className="font-pixel text-[96px] leading-none text-gold [text-shadow:5px_5px_0_#000]">404</div>
        <p className="text-dust">This tunnel caved in. Nothing to mine here.</p>
        <Link href="/" className={buttonClass("gold", "md", "mt-4")}>
          BACK TO THE SURFACE
        </Link>
      </div>
    </div>
  );
}
