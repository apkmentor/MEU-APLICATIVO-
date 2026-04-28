import { Lightning } from "@phosphor-icons/react";

export default function Logo({ size = "md", withText = true }) {
  const dim = size === "sm" ? 18 : size === "lg" ? 28 : 22;
  return (
    <div className="flex items-center gap-2.5" data-testid="logo">
      <div
        className="relative flex items-center justify-center rounded-lg"
        style={{
          width: dim + 14,
          height: dim + 14,
          background: "linear-gradient(135deg,#FF4500 0%, #FF7A00 100%)",
          boxShadow: "0 0 22px rgba(255,69,0,0.45)",
        }}
      >
        <Lightning size={dim} weight="fill" color="#0A0A0A" />
      </div>
      {withText && (
        <span className="font-display text-white font-bold tracking-tight text-lg">
          Mentor<span className="text-[#FF4500]">IA</span>
        </span>
      )}
    </div>
  );
}
