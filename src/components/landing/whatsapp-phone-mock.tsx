type PhoneLine =
  | { kind: "in"; text: string }
  | { kind: "out"; text: string }
  | { kind: "success"; text: string }
  | { kind: "product"; name: string; price: string };

export function WhatsAppPhoneMock({
  storeName = "Maria's Beauty · Oshicart",
  lines,
  className = "",
}: {
  storeName?: string;
  lines: PhoneLine[];
  className?: string;
}) {
  return (
    <div
      className={`relative mx-auto w-[260px] aspect-[9/19] rounded-[36px] bg-walnut p-2 shadow-2xl ${className}`}
      aria-hidden="true"
    >
      <div className="h-full w-full rounded-[28px] bg-acacia-soft overflow-hidden flex flex-col">
        <div className="bg-acacia text-white text-[11px] font-semibold px-3 py-2">
          {storeName}
        </div>
        <div className="flex-1 px-3 py-3 space-y-2 overflow-hidden">
          {lines.map((line, i) => {
            if (line.kind === "product") {
              return (
                <div
                  key={i}
                  className="bg-white rounded-md px-2 py-1.5 text-[10px] flex items-center gap-2 shadow-sm"
                >
                  <span className="w-6 h-6 rounded bg-sand-2 shrink-0" />
                  <span className="flex-1 truncate text-walnut">{line.name}</span>
                  <span className="text-terracotta font-semibold">{line.price}</span>
                </div>
              );
            }
            const base = "rounded-lg px-2.5 py-1.5 text-[11px] max-w-[85%]";
            if (line.kind === "in") {
              return (
                <div key={i} className={`${base} bg-white text-walnut shadow-sm`}>
                  {line.text}
                </div>
              );
            }
            if (line.kind === "out") {
              return (
                <div
                  key={i}
                  className={`${base} bg-[#dcf8c6] text-walnut ml-auto`}
                >
                  {line.text}
                </div>
              );
            }
            return (
              <div
                key={i}
                className={`${base} bg-acacia text-white ml-auto font-semibold`}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
