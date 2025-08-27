import Link from "next/link";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = "", showText = true }: LogoProps) {
  return (
    <Link
      href="/"
      className={`flex items-center space-x-2 ${className}`}
    >
      {showText && (
        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
          askademic<span className="text-gray-300">.ai</span>
        </span>
      )}
    </Link>
  );
}
